package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/models"
	"github.com/gin-gonic/gin"
)

// =============================================
// SURAT MASUK
// =============================================

// UploadSuratMasuk — Admin TU input surat masuk dari luar
func UploadSuratMasuk(c *gin.Context) {

	uid := getUserID(c)

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File wajib diupload"})
		return
	}

	if filepath.Ext(file.Filename) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File harus PDF"})
		return
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran file maksimal 5MB"})
		return
	}

	if file.Header.Get("Content-Type") != "application/pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "MIME type harus PDF"})
		return
	}

	var input struct {
		NoSurat      string `form:"no_surat" binding:"required"`
		PerihalSurat string `form:"perihal_surat" binding:"required"`
		AsalSurat    string `form:"asal_surat" binding:"required"`
		TanggalSurat string `form:"tanggal_surat" binding:"required"` // format: 2006-01-02
	}

	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse tanggal
	tanggal, err := time.Parse("2006-01-02", input.TanggalSurat)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}

	uploadPath := "uploads/surat"
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat folder upload"})
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
	path := filepath.Join(uploadPath, filename)

	if err := c.SaveUploadedFile(file, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal upload file"})
		return
	}

	surat := models.SuratMasuk{
		NoSurat:          input.NoSurat,
		PerihalSurat:     input.PerihalSurat,
		AsalSurat:        input.AsalSurat,
		TanggalSurat:     tanggal,
		FilePDF:          path,
		TanggalDiterima:  time.Now(),
		StatusVerifikasi: "menunggu",
		StatusAlur:       "diterima_tu",
	}

	if err := config.DB.Create(&surat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan surat"})
		return
	}

	// Log aktivitas
	WriteLog(uid, "CREATE surat masuk", "surat_masuk", "no_surat", surat.ID, "", input.NoSurat+" - "+input.PerihalSurat)

	c.JSON(http.StatusOK, gin.H{
		"message": "Surat masuk berhasil diupload",
		"surat":   surat,
	})
}

// GetSuratMasuk — detail satu surat masuk
func GetSuratMasuk(c *gin.Context) {
	id := c.Param("surat_id")

	var surat models.SuratMasuk
	if err := config.DB.
		Preload("Verifikator").
		Preload("Disposisi").
		First(&surat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Surat masuk tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": surat})
}

// ListSuratMasuk — list semua surat masuk
func ListSuratMasuk(c *gin.Context) {
	status := c.Query("status")

	var surats []models.SuratMasuk
	query := config.DB.Preload("Verifikator").Preload("Disposisi")

	if status != "" {
		query = query.Where("status_verifikasi = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&surats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": surats})
}

// =============================================
// SURAT KELUAR
// =============================================

// UploadSuratKeluar — Admin TU buat surat keluar baru
func UploadSuratKeluar(c *gin.Context) {

	uid := getUserID(c)

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File wajib diupload"})
		return
	}

	if filepath.Ext(file.Filename) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File harus PDF"})
		return
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran file maksimal 5MB"})
		return
	}

	if file.Header.Get("Content-Type") != "application/pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "MIME type harus PDF"})
		return
	}

	var input struct {
		KodeSurat    int    `form:"kode_surat"`
		NoSurat      string `form:"no_surat" binding:"required"`
		Perihal      string `form:"perihal" binding:"required"`
		Catatan      string `form:"catatan"`
		TanggalSurat string `form:"tanggal_surat" binding:"required"`
		Tujuan       string `form:"tujuan" binding:"required"`
	}

	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tanggal, err := time.Parse("2006-01-02", input.TanggalSurat)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}

	uploadPath := "uploads/surat"
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat folder upload"})
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
	path := filepath.Join(uploadPath, filename)

	if err := c.SaveUploadedFile(file, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal upload file"})
		return
	}

	surat := models.SuratKeluar{
		KodeSurat:        input.KodeSurat,
		NoSurat:          input.NoSurat,
		Perihal:          input.Perihal,
		Catatan:          input.Catatan,
		TanggalSurat:     tanggal,
		FilePDF:          path,
		Tujuan:           input.Tujuan,
		StatusVerifikasi: "menunggu",
		StatusAlur:       "diterima_tu",
		UserVerifikasi:   &uid,
	}

	if err := config.DB.Create(&surat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan surat"})
		return
	}

	// Log aktivitas
	WriteLog(uid, "CREATE surat keluar", "surat_keluar", "no_surat", surat.ID, "", input.NoSurat+" - "+input.Perihal)

	c.JSON(http.StatusOK, gin.H{
		"message": "Surat keluar berhasil diupload",
		"surat":   surat,
	})
}

// GetSuratKeluar — detail satu surat keluar
func GetSuratKeluar(c *gin.Context) {
	id := c.Param("surat_id")

	var surat models.SuratKeluar
	if err := config.DB.
		Preload("Verifikator").
		Preload("Distribusi").
		First(&surat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Surat keluar tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": surat})
}

// ListSuratKeluar — list semua surat keluar
func ListSuratKeluar(c *gin.Context) {
	status := c.Query("status")

	var surats []models.SuratKeluar
	query := config.DB.Preload("Verifikator").Preload("Distribusi")

	if status != "" {
		query = query.Where("status_verifikasi = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&surats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": surats})
}

func TuSelesaikanSuratKeluar(c *gin.Context) {
	id := c.Param("surat_id")

	var surat models.SuratKeluar
	if err := config.DB.First(&surat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Surat tidak ditemukan"})
		return
	}

	if err := config.DB.Model(&surat).Update("status_alur", "selesai").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status"})
		return
	}

	uid := getUserID(c)
	// Log aktivitas
	WriteLog(uid, "UPDATE status_alur selesai", "surat_keluar", "status_alur", surat.ID, "diterima_tu", "selesai")

	c.JSON(http.StatusOK, gin.H{"message": "Surat keluar selesai"})
}
