package models

import "time"

type SuratKeluar struct {
	ID                uint       `gorm:"primaryKey;column:id_surat_keluar" json:"id"`
	KodeSurat         int        `gorm:"column:kode_surat" json:"kode_surat"`
	NoSurat           string     `gorm:"column:no_surat" json:"no_surat"`
	Perihal           string     `gorm:"column:perihal" json:"perihal"`
	Catatan           string     `gorm:"column:catatan" json:"catatan"`
	TanggalSurat      time.Time  `gorm:"column:tanggal_surat" json:"tanggal_surat"`
	FilePDF           string     `gorm:"column:file_pdf" json:"file_pdf"`
	StatusVerifikasi  string     `gorm:"column:status_verifikasi;default:menunggu" json:"status_verifikasi"`
	UserVerifikasi    *uint      `gorm:"column:user_verifikasi" json:"user_verifikasi"`
	TanggalVerifikasi *time.Time `gorm:"column:tanggal_verifikasi" json:"tanggal_verifikasi"`
	Tujuan            string     `gorm:"column:tujuan" json:"tujuan"`
	CatatanVerifikasi string     `gorm:"column:catatan_verifikasi" json:"catatan_verifikasi"`
	CreatedAt         time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"column:updated_at" json:"updated_at"`
	StatusAlur        string     `gorm:"column:status_alur;default:diterima_tu" json:"status_alur"`

	Verifikator *User          `gorm:"foreignKey:UserVerifikasi" json:"verifikator,omitempty"`
	Distribusi  []DistribusiSK `gorm:"foreignKey:IDSuratKeluar" json:"distribusi,omitempty"`
}

func (SuratKeluar) TableName() string {
	return "surat_keluar"
}
