package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/models"
	"github.com/gin-gonic/gin"
)

func getUserID(c *gin.Context) uint {
	userID, _ := c.Get("user_id")
	switch v := userID.(type) {
	case uint:
		return v
	case float64:
		return uint(v)
	default:
		return 0
	}
}

func getRole(c *gin.Context) string {
	role, _ := c.Get("role")
	if r, ok := role.(string); ok {
		return strings.ToLower(r)
	}
	return ""
}

// CreateDisposisi — TU kirim surat masuk ke Kepsek
func CreateDisposisi(c *gin.Context) {
	var input struct {
		IDSuratMasuk uint   `json:"id_surat_masuk" binding:"required"`
		IDKepsek     uint   `json:"id_kepsek" binding:"required"`
		Catatan      string `json:"catatan"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var surat models.SuratMasuk
	if err := config.DB.First(&surat, input.IDSuratMasuk).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Surat masuk tidak ditemukan"})
		return
	}

	disposisi := models.Disposisi{
		IDSuratMasuk:    &input.IDSuratMasuk,
		IDKepsek:        &input.IDKepsek,
		CatatanKepsek:   input.Catatan,
		StatusDisposisi: "belum_dibaca",
		StatusApproval:  "menunggu",
	}

	if err := config.DB.Create(&disposisi).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat disposisi"})
		return
	}

	config.DB.Model(&surat).Update("status_alur", "disposisi_kepsek")

	uid := getUserID(c)
	// Log aktivitas
	WriteLog(uid, "CREATE disposisi", "disposisi", "id_surat_masuk", disposisi.ID, "", fmt.Sprintf("Surat #%d", input.IDSuratMasuk))
	WriteLogDistribusi(&input.IDSuratMasuk, nil, "diterima_tu", "disposisi_kepsek", uid, input.Catatan)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Disposisi berhasil dibuat",
		"disposisi": disposisi,
	})
}

// ApproveDisposisi — Kepsek hanya approve/tolak + isi catatan (TANPA pilih jabatan)
func ApproveDisposisi(c *gin.Context) {
	uid := getUserID(c)

	var input struct {
		DisposisiID          uint   `json:"disposisi_id" binding:"required"`
		IsApproved           bool   `json:"is_approved"`
		TanggapanSaran       string `json:"tanggapan_saran"`
		ProsesLanjut         string `json:"proses_lanjut"`
		KoordinasiKonfirmasi string `json:"koordinasi_konfirmasi"`
		CatatanKepsek        string `json:"catatan_kepsek"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var disposisi models.Disposisi
	if err := config.DB.First(&disposisi, input.DisposisiID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Disposisi tidak ditemukan"})
		return
	}

	now := time.Now()
	disposisi.IDKepsek = &uid
	disposisi.ApprovalAt = &now
	disposisi.TanggapanSaran = input.TanggapanSaran
	disposisi.ProsesLanjut = input.ProsesLanjut
	disposisi.KoordinasiKonfirmasi = input.KoordinasiKonfirmasi
	disposisi.CatatanKepsek = input.CatatanKepsek

	if input.IsApproved {
		disposisi.StatusApproval = "disetujui"
		disposisi.StatusDisposisi = "sedang_dikerjakan"
	} else {
		disposisi.StatusApproval = "ditolak"
		disposisi.StatusDisposisi = "selesai"
	}

	config.DB.Save(&disposisi)

	if disposisi.IDSuratMasuk != nil {
		statusVerifikasi := "disetujui"
		if !input.IsApproved {
			statusVerifikasi = "ditolak"
		}
		config.DB.Model(&models.SuratMasuk{}).
			Where("id_surat_masuk = ?", *disposisi.IDSuratMasuk).
			Updates(map[string]interface{}{
				"status_verifikasi":  statusVerifikasi,
				"user_verifikasi":    uid,
				"tanggal_verifikasi": now,
			})
	}

	// Log aktivitas
	statusLabel := "Menyetujui"
	if !input.IsApproved {
		statusLabel = "Menolak"
	}
	var smID uint
	if disposisi.IDSuratMasuk != nil {
		smID = *disposisi.IDSuratMasuk
	}
	WriteLog(uid, statusLabel+" disposisi", "disposisi", "status_approval", disposisi.ID, "menunggu", disposisi.StatusApproval)
	WriteLogDistribusi(&smID, nil, "disposisi_kepsek", disposisi.StatusApproval, uid, input.CatatanKepsek)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Disposisi berhasil diproses",
		"disposisi": disposisi,
	})
}

// TuTeruskanKeWaka — TU pilih jabatan Waka + teruskan (insert distribusi_sm)
func TuTeruskanKeWaka(c *gin.Context) {
	var input struct {
		DisposisiID       uint   `json:"disposisi_id" binding:"required"`
		IDJabatanPenerima []uint `json:"id_jabatan_penerima" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(input.IDJabatanPenerima) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih minimal 1 jabatan Waka penerima"})
		return
	}

	var disposisi models.Disposisi
	if err := config.DB.First(&disposisi, input.DisposisiID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Disposisi tidak ditemukan"})
		return
	}

	if disposisi.StatusApproval != "disetujui" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Disposisi belum disetujui Kepsek"})
		return
	}

	// Cek belum pernah diteruskan
	var existingCount int64
	config.DB.Model(&models.DistribusiSM{}).
		Where("id_disposisi = ?", input.DisposisiID).
		Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Surat sudah pernah diteruskan ke Waka"})
		return
	}

	// Validasi semua jabatan punya user
	for _, idJabatan := range input.IDJabatanPenerima {
		var count int64
		config.DB.Model(&models.UserJabatan{}).Where("id_jabatan = ?", idJabatan).Count(&count)
		if count == 0 {
			var jabatan models.Jabatan
			config.DB.First(&jabatan, idJabatan)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Jabatan '" + jabatan.NamaJabatan + "' belum memiliki user",
			})
			return
		}
	}

	// Insert distribusi_sm untuk setiap jabatan waka yang dipilih TU
	for _, idJabatan := range input.IDJabatanPenerima {
		idJabatanCopy := idJabatan
		distribusi := models.DistribusiSM{
			IDDisposisi: input.DisposisiID,
			IDJabatan:   &idJabatanCopy,
			Status:      "menunggu_waka",
		}
		if err := config.DB.Create(&distribusi).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat distribusi"})
			return
		}
	}

	// Update status_alur surat_masuk → diteruskan
	if disposisi.IDSuratMasuk != nil {
		config.DB.Model(&models.SuratMasuk{}).
			Where("id_surat_masuk = ?", *disposisi.IDSuratMasuk).
			Update("status_alur", "diteruskan")
	}

	uid := getUserID(c)
	// Log aktivitas
	var smID uint
	if disposisi.IDSuratMasuk != nil {
		smID = *disposisi.IDSuratMasuk
	}
	WriteLog(uid, "TERUSKAN ke Waka", "distribusi_sm", "id_disposisi", disposisi.ID, "", fmt.Sprintf("%d jabatan", len(input.IDJabatanPenerima)))
	WriteLogDistribusi(&smID, nil, "disposisi_kepsek", "diteruskan", uid, "")

	c.JSON(http.StatusOK, gin.H{"message": "Surat berhasil diteruskan ke Waka"})
}

// WakaTeruskanKeUser — Waka isi catatan + pilih user spesifik penerima (bisa lebih dari satu)
func WakaTeruskanKeUser(c *gin.Context) {
	uid := getUserID(c)

	var input struct {
		DisposisiID uint   `json:"disposisi_id" binding:"required"`
		CatatanWaka string `json:"catatan_waka"`
		IDUser      uint   `json:"id_user"`
		IDUsers     []uint `json:"id_users"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Normalisasi input jika menggunakan id_user tunggal
	if len(input.IDUsers) == 0 {
		if input.IDUser > 0 {
			input.IDUsers = []uint{input.IDUser}
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih minimal 1 user penerima"})
			return
		}
	}

	var disposisi models.Disposisi
	if err := config.DB.First(&disposisi, input.DisposisiID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Disposisi tidak ditemukan"})
		return
	}

	if disposisi.StatusApproval != "disetujui" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Disposisi belum disetujui Kepsek"})
		return
	}

	// Cari jabatan waka yang login
	var userJabatans []models.UserJabatan
	config.DB.Where("id_user = ?", uid).Find(&userJabatans)
	jabatanIDs := []uint{}
	for _, uj := range userJabatans {
		jabatanIDs = append(jabatanIDs, uj.JabatanID)
	}

	if len(jabatanIDs) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "User tidak memiliki jabatan"})
		return
	}

	// Cek waka ini punya distribusi untuk disposisi ini
	var distribusi models.DistribusiSM
	if err := config.DB.
		Where("id_disposisi = ? AND id_jabatan IN ?", input.DisposisiID, jabatanIDs).
		First(&distribusi).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki akses ke disposisi ini"})
		return
	}

	// Validasi semua user penerima ada
	for _, recipientID := range input.IDUsers {
		var userPenerima models.User
		if err := config.DB.First(&userPenerima, recipientID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("User penerima ID %d tidak ditemukan", recipientID)})
			return
		}
	}

	// Update distribusi_sm yang pertama
	firstUserID := input.IDUsers[0]
	wakaUID := uid
	if err := config.DB.Model(&distribusi).Updates(map[string]interface{}{
		"id_user":      firstUserID,
		"id_jabatan":   nil, // XOR: kalau id_user diisi, id_jabatan harus nil
		"id_waka":      wakaUID,
		"status":       "diteruskan_waka",
		"catatan_waka": input.CatatanWaka,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update distribusi"})
		return
	}

	// Tambahkan distribusi_sm untuk user tambahan jika ada
	for i := 1; i < len(input.IDUsers); i++ {
		recipientID := input.IDUsers[i]
		newDist := models.DistribusiSM{
			IDDisposisi: input.DisposisiID,
			IDUser:      &recipientID,
			IDWaka:      &wakaUID,
			Status:      "diteruskan_waka",
			CatatanWaka: input.CatatanWaka,
		}
		if err := config.DB.Create(&newDist).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat distribusi tambahan"})
			return
		}
	}

	// Update id_penerima di disposisi
	config.DB.Model(&disposisi).Update("id_penerima", firstUserID)

	// Cek apakah semua distribusi sudah diteruskan
	var belumCount int64
	config.DB.Model(&models.DistribusiSM{}).
		Where("id_disposisi = ? AND status NOT IN ?", input.DisposisiID, []string{"diteruskan_waka", "dibaca", "selesai"}).
		Count(&belumCount)

	if belumCount == 0 {
		config.DB.Model(&disposisi).Update("status_disposisi", "selesai")
		// Update status_alur surat masuk ke 'selesai'
		if disposisi.IDSuratMasuk != nil {
			config.DB.Model(&models.SuratMasuk{}).
				Where("id_surat_masuk = ?", *disposisi.IDSuratMasuk).
				Update("status_alur", "selesai")
		}
	}

	// Log aktivitas
	var smID uint
	if disposisi.IDSuratMasuk != nil {
		smID = *disposisi.IDSuratMasuk
	}
	WriteLog(uid, "TERUSKAN ke user", "distribusi_sm", "id_user", distribusi.IDPenerimaDistribusi, "", fmt.Sprintf("Meneruskan surat ke %d user", len(input.IDUsers)))
	WriteLogDistribusi(&smID, nil, "diteruskan", "diteruskan_waka", uid, input.CatatanWaka)

	c.JSON(http.StatusOK, gin.H{"message": "Surat berhasil diteruskan ke user penerima"})
}

// GetUserByJabatan — GET /jabatan/:id/users
func GetUserByJabatan(c *gin.Context) {
	jabatanID := c.Param("id")

	var userJabatans []models.UserJabatan
	if err := config.DB.
		Where("id_jabatan = ?", jabatanID).
		Find(&userJabatans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data"})
		return
	}

	result := []gin.H{}
	for _, uj := range userJabatans {
		var u models.User
		if err := config.DB.First(&u, uj.UserID).Error; err != nil {
			continue
		}
		result = append(result, gin.H{
			"id":   u.ID,
			"name": u.Name,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GetDisposisi — detail disposisi by surat masuk
func GetDisposisi(c *gin.Context) {
	suratID := c.Param("surat_id")

	var disposisi models.Disposisi
	if err := config.DB.
		Preload("SuratMasuk").
		Preload("Kepsek").
		Preload("Penerima").
		Preload("Distribusi.Jabatan").
		Preload("Distribusi.User").
		Preload("Distribusi.Waka").
		Where("id_surat_masuk = ?", suratID).
		First(&disposisi).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Disposisi tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": disposisi})
}

// ListDisposisi — role-aware
func ListDisposisi(c *gin.Context) {
	uid := getUserID(c)
	role := getRole(c)
	status := c.Query("status")

	var disposisis []models.Disposisi
	query := config.DB.
		Preload("SuratMasuk").
		Preload("Kepsek").
		Preload("Penerima").
		Preload("Distribusi.Jabatan").
		Preload("Distribusi.User").
		Preload("Distribusi.Waka")

	switch {
	case role == "admin" || role == "pegawai":
		if status != "" {
			query = query.Where("status_approval = ?", status)
		}

	case role == "kepala sekolah":
		query = query.Where("id_kepsek = ?", uid)
		if status != "" {
			query = query.Where("status_approval = ?", status)
		}

	default:
		// Waka dan user lainnya — cari via distribusi_sm
		var userJabatans []models.UserJabatan
		config.DB.Where("id_user = ?", uid).Find(&userJabatans)

		jabatanIDs := []uint{}
		for _, uj := range userJabatans {
			jabatanIDs = append(jabatanIDs, uj.JabatanID)
		}

		if len(jabatanIDs) == 0 {
			c.JSON(http.StatusOK, gin.H{"data": []models.Disposisi{}})
			return
		}

		var distribusiIDs []uint
		config.DB.Model(&models.DistribusiSM{}).
			Where("id_jabatan IN ? OR id_user = ? OR id_waka = ?", jabatanIDs, uid, uid).
			Pluck("id_disposisi", &distribusiIDs)

		if len(distribusiIDs) == 0 {
			c.JSON(http.StatusOK, gin.H{"data": []models.Disposisi{}})
			return
		}

		query = query.Where("id_disposisi IN ?", distribusiIDs)
	}

	if err := query.Order("tanggal_disposisi DESC").Find(&disposisis).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": disposisis})
}

// ApproveSuratKeluar — Kepsek approve/reject surat keluar
func ApproveSuratKeluar(c *gin.Context) {
	uid := getUserID(c)

	var input struct {
		SuratKeluarID uint   `json:"surat_keluar_id" binding:"required"`
		IsApproved    bool   `json:"is_approved"`
		Catatan       string `json:"catatan"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var surat models.SuratKeluar
	if err := config.DB.First(&surat, input.SuratKeluarID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Surat keluar tidak ditemukan"})
		return
	}

	now := time.Now()
	statusVerifikasi := "disetujui"
	statusAlur := "diteruskan"
	if !input.IsApproved {
		statusVerifikasi = "ditolak"
		statusAlur = "diterima_tu"
	}

	config.DB.Model(&surat).Updates(map[string]interface{}{
		"status_verifikasi":  statusVerifikasi,
		"user_verifikasi":    uid,
		"tanggal_verifikasi": now,
		"catatan_verifikasi": input.Catatan,
		"status_alur":        statusAlur,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Surat keluar berhasil diproses",
		"status":  statusVerifikasi,
	})
}

// BacaDisposisi — User tandai surat sudah dibaca
func BacaDisposisi(c *gin.Context) {
	uid := getUserID(c)

	var input struct {
		DisposisiID uint `json:"disposisi_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()

	// Update berdasarkan id_user langsung
	result := config.DB.Model(&models.DistribusiSM{}).
		Where("id_disposisi = ? AND id_user = ? AND status != 'dibaca'", input.DisposisiID, uid).
		Updates(map[string]interface{}{
			"status":  "dibaca",
			"read_at": now,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status"})
		return
	}

	// Cek apakah semua distribusi sudah dibaca → update status surat masuk
	checkAndUpdateSuratStatus(input.DisposisiID)

	c.JSON(http.StatusOK, gin.H{"message": "Surat berhasil ditandai sudah dibaca"})
}

// checkAndUpdateSuratStatus — cek apakah semua distribusi sudah dibaca, update status_alur
func checkAndUpdateSuratStatus(disposisiID uint) {
	var belumCount int64
	config.DB.Model(&models.DistribusiSM{}).
		Where("id_disposisi = ? AND status NOT IN ?", disposisiID, []string{"dibaca", "selesai"}).
		Count(&belumCount)

	if belumCount == 0 {
		var disposisi models.Disposisi
		if err := config.DB.First(&disposisi, disposisiID).Error; err == nil {
			config.DB.Model(&disposisi).Update("status_disposisi", "selesai")
			if disposisi.IDSuratMasuk != nil {
				config.DB.Model(&models.SuratMasuk{}).
					Where("id_surat_masuk = ?", *disposisi.IDSuratMasuk).
					Update("status_alur", "selesai")
			}
		}
	}
}

// ListUserBiasa — GET /users/biasa — return semua user yang punya jabatan level_akses = 'user'
func ListUserBiasa(c *gin.Context) {
	// Cari semua jabatan dengan level_akses = 'user'
	var jabatanIDs []uint
	config.DB.Model(&models.Jabatan{}).
		Where("level_akses = ?", "user").
		Pluck("id_jabatan", &jabatanIDs)

	if len(jabatanIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []gin.H{}})
		return
	}

	// Cari semua user_jabatan yang punya jabatan tersebut
	var userIDs []uint
	config.DB.Model(&models.UserJabatan{}).
		Where("id_jabatan IN ?", jabatanIDs).
		Pluck("DISTINCT id_user", &userIDs)

	if len(userIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []gin.H{}})
		return
	}

	// Ambil data user
	var users []models.User
	config.DB.Where("id_user IN ?", userIDs).Find(&users)

	result := []gin.H{}
	for _, u := range users {
		result = append(result, gin.H{
			"id":   u.ID,
			"name": u.Name,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

