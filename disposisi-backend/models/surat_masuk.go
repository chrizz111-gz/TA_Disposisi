package models

import "time"

type SuratMasuk struct {
	ID                uint       `gorm:"primaryKey;column:id_surat_masuk" json:"id"`
	NoSurat           string     `gorm:"column:no_surat" json:"no_surat"`
	PerihalSurat      string     `gorm:"column:perihal_surat" json:"perihal_surat"`
	AsalSurat         string     `gorm:"column:asal_surat" json:"asal_surat"`
	TanggalSurat      time.Time  `gorm:"column:tanggal_surat" json:"tanggal_surat"`
	FilePDF           string     `gorm:"column:file_pdf" json:"file_pdf"`
	TanggalDiterima   time.Time  `gorm:"column:tanggal_diterima" json:"tanggal_diterima"`
	StatusVerifikasi  string     `gorm:"column:status_verifikasi;default:menunggu" json:"status_verifikasi"`
	UserVerifikasi    *uint      `gorm:"column:user_verifikasi" json:"user_verifikasi"`
	TanggalVerifikasi *time.Time `gorm:"column:tanggal_verifikasi" json:"tanggal_verifikasi"`
	CatatanVerifikasi string     `gorm:"column:catatan_verifikasi" json:"catatan_verifikasi"`
	CreatedAt         time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"column:updated_at" json:"updated_at"`
	IDDisposisiAktif  *uint      `gorm:"column:id_disposisi_aktif" json:"id_disposisi_aktif"`
	StatusAlur        string     `gorm:"column:status_alur;default:diterima_tu" json:"status_alur"`

	Verifikator *User      `gorm:"foreignKey:UserVerifikasi" json:"verifikator,omitempty"`
	Disposisi   *Disposisi `gorm:"foreignKey:IDSuratMasuk" json:"disposisi,omitempty"`
}

func (SuratMasuk) TableName() string {
	return "surat_masuk"
}
