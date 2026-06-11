package controllers

import (
	"net/http"
	"strings"

	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/models"
	"github.com/gin-gonic/gin"
)

func ListUsers(c *gin.Context) {
	var users []models.User

	if err := config.DB.
		Preload("Jabatans.Jabatan").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data user"})
		return
	}

	result := []gin.H{}
	for _, u := range users {
		jabatans := []string{}
		for _, uj := range u.Jabatans {
			jabatans = append(jabatans, uj.Jabatan.NamaJabatan)
		}
		result = append(result, gin.H{
			"id":       u.ID,
			"name":     u.Name,
			"email":    u.Email,
			"jabatans": jabatans,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	config.DB.Where("id_user = ?", id).Delete(&models.UserJabatan{})

	if err := config.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus user"})
		return
	}

	uid := getUserID(c)
	// Log aktivitas
	WriteLog(uid, "DELETE user", "users", "nama", user.ID, user.Name, "")

	c.JSON(http.StatusOK, gin.H{"message": "User berhasil dihapus"})
}

func UpdateUserJabatan(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	var input struct {
		Jabatans []string `json:"jabatans" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(input.Jabatans) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimal pilih 1 jabatan"})
		return
	}

	// Cari id_jabatan berdasarkan nama_jabatan
	var jabatans []models.Jabatan
	if err := config.DB.Where("LOWER(nama_jabatan) IN ?", toLowerSlice(input.Jabatans)).Find(&jabatans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencari jabatan"})
		return
	}

	if len(jabatans) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada jabatan yang valid"})
		return
	}

	// Hapus semua user_jabatan lama
	config.DB.Where("id_user = ?", user.ID).Delete(&models.UserJabatan{})

	// Insert user_jabatan baru
	for i, j := range jabatans {
		uj := models.UserJabatan{
			UserID:    user.ID,
			JabatanID: j.ID,
			IsPrimary: i == 0,
		}
		config.DB.Create(&uj)
	}

	uid := getUserID(c)
	// Log aktivitas
	newJabatanNames := make([]string, len(jabatans))
	for i, j := range jabatans {
		newJabatanNames[i] = j.NamaJabatan
	}
	WriteLog(uid, "UPDATE jabatan user", "user_jabatan", "id_jabatan", user.ID, "", strings.Join(newJabatanNames, ", "))

	c.JSON(http.StatusOK, gin.H{"message": "Jabatan berhasil diperbarui"})
}

func toLowerSlice(ss []string) []string {
	result := make([]string, len(ss))
	for i, s := range ss {
		result[i] = strings.ToLower(strings.TrimSpace(s))
	}
	return result
}

func ListJabatan(c *gin.Context) {
	type JabatanResult struct {
		IDJabatan   uint   `json:"id_jabatan"`
		NamaJabatan string `json:"nama_jabatan"`
		PunyaUser   bool   `json:"punya_user"`
	}

	var jabatans []models.Jabatan
	if err := config.DB.Find(&jabatans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data jabatan"})
		return
	}

	result := []JabatanResult{}
	for _, j := range jabatans {
		var count int64
		config.DB.Model(&models.UserJabatan{}).Where("id_jabatan = ?", j.ID).Count(&count)
		result = append(result, JabatanResult{
			IDJabatan:   j.ID,
			NamaJabatan: j.NamaJabatan,
			PunyaUser:   count > 0,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
