package controllers

import (
	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/models"
	"github.com/gin-gonic/gin"
)

func Dashboard(c *gin.Context) {
	uid := getUserID(c)
	rolesInterface, _ := c.Get("roles")

	userRoles := []string{}
	if roles, ok := rolesInterface.([]interface{}); ok {
		for _, role := range roles {
			if r, ok := role.(string); ok {
				userRoles = append(userRoles, r)
			}
		}
	}

	summary := gin.H{}

	if hasRole(userRoles, "admin") {
		var totalSM int64
		config.DB.Model(&models.SuratMasuk{}).Count(&totalSM)

		var totalSK int64
		config.DB.Model(&models.SuratKeluar{}).Count(&totalSK)

		var totalDisposisi int64
		config.DB.Model(&models.Disposisi{}).Count(&totalDisposisi)

		summary["total_surat_masuk"] = totalSM
		summary["total_surat_keluar"] = totalSK
		summary["total_disposisi"] = totalDisposisi
	}

	if hasRole(userRoles, "kepala sekolah") {
		var totalDisposisi int64
		config.DB.Model(&models.Disposisi{}).
			Where("id_kepsek = ?", uid).Count(&totalDisposisi)

		var pendingApproval int64
		config.DB.Model(&models.Disposisi{}).
			Where("status_approval = ?", "menunggu").Count(&pendingApproval)

		var pendingSK int64
		config.DB.Model(&models.SuratKeluar{}).
			Where("status_verifikasi = ?", "menunggu").Count(&pendingSK)

		summary["total_disposisi"] = totalDisposisi
		summary["approval_pending"] = pendingApproval
		summary["pending_surat_keluar"] = pendingSK
	}

	// User biasa
	if !hasRole(userRoles, "admin") && !hasRole(userRoles, "kepala sekolah") {
		var totalDistribusi int64
		config.DB.Model(&models.DistribusiSK{}).
			Where("id_user = ?", uid).Count(&totalDistribusi)
		summary["total_distribusi"] = totalDistribusi
	}

	c.JSON(200, gin.H{
		"user_id": uid,
		"roles":   userRoles,
		"summary": summary,
	})
}

func hasRole(roles []string, target string) bool {
	for _, r := range roles {
		if r == target {
			return true
		}
	}
	return false
}
