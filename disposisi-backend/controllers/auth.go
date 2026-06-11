package controllers

import (
	"fmt"
	"math/rand"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/helpers"
	"github.com/fiorelln/disposisi/models"

	"github.com/gin-gonic/gin"
)

func ValidatePassword(password string) bool {

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	return len(password) >= 8 &&
		hasUpper &&
		hasLower &&
		hasNumber
}

func ValidateEmail(email string) bool {
	email = strings.TrimSpace(email)
	if email == "" {
		return false
	}

	regex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return regex.MatchString(email)
}

func Register(c *gin.Context) {

	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Jabatans []uint `json:"jabatans"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{
			"error": err.Error(),
		})
		return
	}

	if strings.TrimSpace(input.Name) == "" {
		c.JSON(400, gin.H{
			"error": "Nama user wajib diisi",
		})
		return
	}

	if !ValidateEmail(input.Email) {
		c.JSON(400, gin.H{
			"error": "Format surel tidak valid",
		})
		return
	}

	if len(input.Jabatans) == 0 {
		c.JSON(400, gin.H{
			"error": "Jabatan wajib dipilih",
		})
		return
	}

	if !ValidatePassword(input.Password) {
		c.JSON(400, gin.H{
			"error": "Password minimal 8 karakter, huruf besar, kecil, dan angka",
		})
		return
	}

	hashedPassword, err := helpers.HashPassword(input.Password)

	if err != nil {
		c.JSON(500, gin.H{
			"error": "Gagal hash password",
		})
		return
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: hashedPassword,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(400, gin.H{
			"error": "Surel sudah digunakan",
		})
		return
	}

	for index, jabatanID := range input.Jabatans {

		userJabatan := models.UserJabatan{
			UserID:    user.ID,
			JabatanID: jabatanID,
			IsPrimary: index == 0,
		}

		config.DB.Create(&userJabatan)
	}

	uid := getUserID(c)
	// Log aktivitas
	WriteLog(uid, "CREATE user", "users", "nama", user.ID, "", user.Name)

	c.JSON(200, gin.H{
		"message": "User berhasil dibuat",
	})
}

func Login(c *gin.Context) {

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{
			"error": err.Error(),
		})
		return
	}

	if !ValidateEmail(input.Email) {
		c.JSON(400, gin.H{"error": "Format surel tidak valid"})
		return
	}

	var user models.User

	if err := config.DB.
		Preload("Jabatans.Jabatan").
		Where("email = ?", input.Email).
		First(&user).Error; err != nil {

		c.JSON(401, gin.H{
			"error": "Surel atau password salah",
		})
		return
	}

	if !helpers.CheckPassword(user.Password, input.Password) {
		c.JSON(401, gin.H{
			"error": "Surel atau password salah",
		})
		return
	}

	var roles []string

	for _, jabatan := range user.Jabatans {
		roles = append(roles, jabatan.Jabatan.NamaJabatan)
	}

	token, err := helpers.GenerateToken(user.ID, roles)

	if err != nil {
		c.JSON(500, gin.H{
			"error": "Gagal generate token",
		})
		return
	}

	// Log aktivitas login
	WriteLog(user.ID, "LOGIN", "users", "email", user.ID, "", user.Email)

	c.JSON(200, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"name":     user.Name,
			"email":    user.Email,
			"jabatans": roles,
		},
	})
}

func ForgotPassword(c *gin.Context) {

	var input struct {
		Email string `json:"email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{
			"error": err.Error(),
		})
		return
	}

	if !ValidateEmail(input.Email) {
		c.JSON(400, gin.H{"error": "Format surel tidak valid"})
		return
	}

	var user models.User

	if err := config.DB.
		Where("email = ?", input.Email).
		First(&user).Error; err != nil {

		c.JSON(404, gin.H{
			"error": "Surel tidak ditemukan",
		})
		return
	}

	var total int64

	config.DB.
		Model(&models.OTP{}).
		Where("id_user = ? AND created_at > ?", user.ID, time.Now().Add(-25*time.Minute)).
		Count(&total)

	if total >= 5 {
		c.JSON(429, gin.H{
			"error": "Limit OTP tercapai",
		})
		return
	}

	rand.Seed(time.Now().UnixNano())

	otpCode := fmt.Sprintf("%06d", rand.Intn(1000000))

	otp := models.OTP{
		UserID:    user.ID,
		KodeOTP:   otpCode,
		ExpiresAt: time.Now().Add(2 * time.Minute),
		IsUsed:    false,
	}

	if err := config.DB.Create(&otp).Error; err != nil {
		c.JSON(500, gin.H{
			"error": "Gagal menyimpan OTP",
		})
		return
	}

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	smtpFromName := os.Getenv("SMTP_FROM_NAME")

	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	subject := "Reset Password OTP"
	body := "<h1>Kode OTP Kamu: " + otpCode + "</h1>"

	msg := []byte("From: " + smtpFromName + " <" + smtpEmail + ">\r\n" +
		"To: " + user.Email + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		body + "\r\n")

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	err := smtp.SendMail(addr, auth, smtpEmail, []string{user.Email}, msg)

	if err != nil {
		c.JSON(500, gin.H{
			"error": "Gagal mengirim OTP: " + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"message": "OTP berhasil dikirim",
	})
}

func VerifyOTP(c *gin.Context) {

	var input struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{
			"error": err.Error(),
		})
		return
	}

	if !ValidateEmail(input.Email) {
		c.JSON(400, gin.H{"error": "Format surel tidak valid"})
		return
	}

	var user models.User

	if err := config.DB.
		Where("email = ?", input.Email).
		First(&user).Error; err != nil {

		c.JSON(404, gin.H{
			"error": "Surel tidak ditemukan",
		})
		return
	}

	var otp models.OTP

	if err := config.DB.
		Where("id_user = ? AND kode_otp = ? AND is_used = ?", user.ID, input.OTP, false).
		Last(&otp).Error; err != nil {

		c.JSON(400, gin.H{
			"error": "OTP salah",
		})
		return
	}

	if time.Now().After(otp.ExpiresAt) {

		c.JSON(400, gin.H{
			"error": "OTP expired",
		})
		return
	}

	otp.IsUsed = true

	config.DB.Save(&otp)

	c.JSON(200, gin.H{
		"message": "OTP valid",
	})
}

func ResetPassword(c *gin.Context) {

	var input struct {
		Email       string `json:"email"`
		NewPassword string `json:"new_password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{
			"error": err.Error(),
		})
		return
	}

	if !ValidateEmail(input.Email) {
		c.JSON(400, gin.H{"error": "Format surel tidak valid"})
		return
	}

	if !ValidatePassword(input.NewPassword) {
		c.JSON(400, gin.H{
			"error": "Password minimal 8 karakter, huruf besar, kecil, dan angka",
		})
		return
	}

	var user models.User

	if err := config.DB.
		Where("email = ?", input.Email).
		First(&user).Error; err != nil {

		c.JSON(404, gin.H{
			"error": "Surel tidak ditemukan",
		})
		return
	}

	// Verifikasi bahwa ada OTP yang sudah diverifikasi dalam 5 menit terakhir
	var verifiedOTP models.OTP

	if err := config.DB.
		Where("id_user = ? AND is_used = ? AND created_at > ?", user.ID, true, time.Now().Add(-5*time.Minute)).
		Last(&verifiedOTP).Error; err != nil {

		c.JSON(400, gin.H{
			"error": "OTP belum diverifikasi atau sudah expired",
		})
		return
	}

	hashedPassword, err := helpers.HashPassword(input.NewPassword)

	if err != nil {
		c.JSON(500, gin.H{
			"error": "Gagal hash password",
		})
		return
	}

	user.Password = hashedPassword

	config.DB.Save(&user)

	c.JSON(200, gin.H{
		"message": "Password berhasil direset",
	})
}

func SeedAdmin(c *gin.Context) {

	var count int64

	// cek apakah admin sudah ada
	config.DB.Model(&models.User{}).
		Where("email = ?", "dummy_admin@gmail.com").
		Count(&count)

	if count > 0 {
		c.JSON(200, gin.H{
			"message": "admin sudah ada",
		})
		return
	}

	// hash password
	hashed, _ := helpers.HashPassword("Admin123")

	// buat user admin
	admin := models.User{
		Name:     "Dummy Admin",
		Email:    "dummy_admin@gmail.com",
		Password: hashed,
	}

	config.DB.Create(&admin)

	// 🔥 MASUKKAN KE JABATAN ADMIN (PENTING)
	userJabatan := models.UserJabatan{
		UserID:    admin.ID,
		JabatanID: 1, // ⚠️ pastikan 1 = Admin di tabel jabatan
		IsPrimary: true,
	}

	config.DB.Create(&userJabatan)

	c.JSON(200, gin.H{
		"message": "admin berhasil dibuat",
	})
}
