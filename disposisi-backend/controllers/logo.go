package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// UploadLogo — Admin upload logo baru (PNG/JPG/JPEG, max 2MB)
// File disimpan sebagai uploads/logo/logo.<ext> (overwrite)
func UploadLogo(c *gin.Context) {
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File logo wajib diupload"})
		return
	}

	// Validasi ukuran (max 2MB)
	if file.Size > 2*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran file maksimal 2MB"})
		return
	}

	// Validasi ekstensi
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File harus berformat PNG, JPG, atau JPEG"})
		return
	}

	// Validasi MIME type
	mime := file.Header.Get("Content-Type")
	if mime != "image/png" && mime != "image/jpeg" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "MIME type harus image/png atau image/jpeg"})
		return
	}

	// Buat folder uploads/logo jika belum ada
	uploadPath := "uploads/logo"
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat folder upload"})
		return
	}

	// Hapus logo lama jika ada (logo.png, logo.jpg, logo.jpeg)
	for _, oldExt := range []string{".png", ".jpg", ".jpeg"} {
		oldPath := filepath.Join(uploadPath, "logo"+oldExt)
		os.Remove(oldPath) // abaikan error jika file tidak ada
	}

	// Simpan file baru sebagai logo.<ext>
	savePath := filepath.Join(uploadPath, "logo"+ext)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan logo"})
		return
	}

	uid := getUserID(c)
	// Log aktivitas
	WriteLog(uid, "UPDATE logo", "settings", "logo", 0, "", "logo"+ext)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logo berhasil diperbarui",
		"path":    savePath,
	})
}

// GetLogo — Endpoint publik untuk mengambil logo saat ini
// Jika belum ada custom logo, return 404
func GetLogo(c *gin.Context) {
	uploadPath := "uploads/logo"

	// Cari file logo dengan ekstensi yang valid
	for _, ext := range []string{".png", ".jpg", ".jpeg"} {
		logoPath := filepath.Join(uploadPath, "logo"+ext)
		if _, err := os.Stat(logoPath); err == nil {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
			c.File(logoPath)
			return
		}
	}

	fmt.Println("[GetLogo] Custom logo not found, returning 404")
	c.JSON(http.StatusNotFound, gin.H{"error": "Logo belum diupload"})
}
