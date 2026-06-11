package controllers

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/models"
	"github.com/gin-gonic/gin"
)

// WriteLog — helper untuk menulis log ke tabel "log"
func WriteLog(userID uint, aksi string, tabelTerkait string, kolomTerkait string, idData uint, valuesOld string, valuesNew string) {
	did := idData
	log := models.Log{
		Aksi:         aksi,
		TabelTerkait: tabelTerkait,
		KolomTerkait: kolomTerkait,
		IDData:       &did,
		ValuesOld:    valuesOld,
		ValuesNew:    valuesNew,
		UpdatedAt:    time.Now(),
	}
	if userID > 0 {
		log.IDUser = &userID
	}
	if err := config.DB.Create(&log).Error; err != nil {
		fmt.Printf("[WriteLog Error] Failed to create log: %v\n", err)
	} else {
		fmt.Printf("[WriteLog Success] Log created: userID=%d, aksi=%s\n", userID, aksi)
	}
}

// WriteLogDistribusi — helper untuk menulis log distribusi surat
func WriteLogDistribusi(idSM *uint, idSK *uint, statusAsal string, statusTujuan string, userID uint, catatan string) {
	ld := models.LogDistribusi{
		IDSM:         idSM,
		IDSK:         idSK,
		StatusAsal:   statusAsal,
		StatusTujuan: statusTujuan,
		Catatan:      catatan,
		CreatedAt:    time.Now(),
	}
	if userID > 0 {
		ld.IDUser = &userID
	}
	if err := config.DB.Create(&ld).Error; err != nil {
		fmt.Printf("[WriteLogDistribusi Error] Failed to create log: %v\n", err)
	} else {
		fmt.Printf("[WriteLogDistribusi Success] Log created: userID=%d, status=%s->%s\n", userID, statusAsal, statusTujuan)
	}
}

// mapAksiToAktivitas — konversi aksi internal ke label aktivitas frontend
func mapAksiToAktivitas(aksi string, tabel string) string {
	aksiLower := strings.ToLower(aksi)

	if strings.Contains(aksiLower, "login") {
		return "login"
	}
	if strings.Contains(aksiLower, "logout") {
		return "logout"
	}

	// Surat-related
	if strings.Contains(aksiLower, "create") || strings.Contains(aksiLower, "insert") || strings.Contains(aksiLower, "upload") {
		if strings.Contains(tabel, "surat") {
			return "create_surat"
		}
		if strings.Contains(tabel, "user") {
			return "create_user"
		}
	}
	if strings.Contains(aksiLower, "delete") || strings.Contains(aksiLower, "hapus") {
		if strings.Contains(tabel, "user") {
			return "delete_user"
		}
	}
	if strings.Contains(aksiLower, "update") || strings.Contains(aksiLower, "ubah") {
		if strings.Contains(tabel, "user") || strings.Contains(tabel, "jabatan") {
			return "update_user"
		}
	}
	if strings.Contains(aksiLower, "approve") || strings.Contains(aksiLower, "setuju") {
		return "approve_surat"
	}
	if strings.Contains(aksiLower, "reject") || strings.Contains(aksiLower, "tolak") {
		return "reject_surat"
	}
	if strings.Contains(aksiLower, "teruskan") || strings.Contains(aksiLower, "forward") {
		return "forward_surat"
	}
	if strings.Contains(aksiLower, "baca") || strings.Contains(aksiLower, "read") {
		return "read_surat"
	}

	// Fallback: pakai tabel untuk tebak
	if strings.Contains(tabel, "surat") {
		return "create_surat"
	}
	return aksiLower
}

// statusToLabel — konversi status distribusi ke label yang readable
func statusToLabel(status string) string {
	switch strings.ToLower(status) {
	case "masuk":
		return "Surat Masuk"
	case "disposisi_kepsek":
		return "Disposisi ke Kepsek"
	case "diteruskan":
		return "Diteruskan ke Waka"
	case "diteruskan_waka":
		return "Diteruskan oleh Waka"
	case "selesai":
		return "Selesai"
	case "disetujui":
		return "Disetujui"
	case "ditolak":
		return "Ditolak"
	default:
		return status
	}
}

// getUserInfo — ambil nama dan jabatan user
func getUserInfo(userID uint) (string, string) {
	var user models.User
	if err := config.DB.Preload("Jabatans.Jabatan").First(&user, userID).Error; err != nil {
		return "Unknown", ""
	}
	jabatans := []string{}
	for _, uj := range user.Jabatans {
		jabatans = append(jabatans, uj.Jabatan.NamaJabatan)
	}
	return user.Name, strings.Join(jabatans, ", ")
}

// ListLogs — GET /admin/logs — Gabungkan data dari tabel log + log_distribusi
func ListLogs(c *gin.Context) {
	// 1. Ambil semua dari tabel log
	var logs []models.Log
	config.DB.Order("updated_at DESC").Find(&logs)

	// 2. Ambil semua dari tabel log_distribusi
	var logDists []models.LogDistribusi
	config.DB.Order("created_at DESC").Find(&logDists)

	// 3. Gabungkan ke format unified
	type ActivityItem struct {
		CreatedAt   time.Time `json:"created_at"`
		UserName    string    `json:"user_name"`
		UserJabatan string    `json:"user_jabatan"`
		UserID      uint      `json:"user_id"`
		Aktivitas   string    `json:"aktivitas"`
		Detail      string    `json:"detail"`
	}

	var activities []ActivityItem

	// Konversi log
	for _, l := range logs {
		var uid uint
		if l.IDUser != nil {
			uid = *l.IDUser
		}
		userName, userJabatan := getUserInfo(uid)
		aktivitas := mapAksiToAktivitas(l.Aksi, l.TabelTerkait)

		detail := l.Aksi
		if l.TabelTerkait != "" {
			detail = fmt.Sprintf("%s pada %s", l.Aksi, l.TabelTerkait)
		}
		if l.KolomTerkait != "" {
			detail += fmt.Sprintf(" (kolom: %s)", l.KolomTerkait)
		}
		if l.ValuesOld != "" || l.ValuesNew != "" {
			detail += fmt.Sprintf(" — dari '%s' ke '%s'", l.ValuesOld, l.ValuesNew)
		}

		activities = append(activities, ActivityItem{
			CreatedAt:   l.UpdatedAt,
			UserName:    userName,
			UserJabatan: userJabatan,
			UserID:      uid,
			Aktivitas:   aktivitas,
			Detail:      detail,
		})
	}

	// Konversi log_distribusi
	for _, ld := range logDists {
		var uid uint
		if ld.IDUser != nil {
			uid = *ld.IDUser
		}
		userName, userJabatan := getUserInfo(uid)

		// Tentukan aktivitas dari status
		aktivitas := "forward_surat"
		if strings.Contains(strings.ToLower(ld.StatusTujuan), "setuju") || strings.Contains(strings.ToLower(ld.StatusTujuan), "approve") {
			aktivitas = "approve_surat"
		} else if strings.Contains(strings.ToLower(ld.StatusTujuan), "tolak") || strings.Contains(strings.ToLower(ld.StatusTujuan), "reject") {
			aktivitas = "reject_surat"
		} else if strings.Contains(strings.ToLower(ld.StatusTujuan), "selesai") {
			aktivitas = "read_surat"
		}

		detail := fmt.Sprintf("Status: %s → %s", statusToLabel(ld.StatusAsal), statusToLabel(ld.StatusTujuan))
		if ld.IDSM != nil {
			detail = fmt.Sprintf("Surat Masuk #%d — %s", *ld.IDSM, detail)
		} else if ld.IDSK != nil {
			detail = fmt.Sprintf("Surat Keluar #%d — %s", *ld.IDSK, detail)
		}
		if ld.Catatan != "" {
			detail += fmt.Sprintf(". Catatan: %s", ld.Catatan)
		}

		activities = append(activities, ActivityItem{
			CreatedAt:   ld.CreatedAt,
			UserName:    userName,
			UserJabatan: userJabatan,
			UserID:      uid,
			Aktivitas:   aktivitas,
			Detail:      detail,
		})
	}

	// Sort by created_at descending
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].CreatedAt.After(activities[j].CreatedAt)
	})

	c.JSON(http.StatusOK, gin.H{"data": activities})
}
