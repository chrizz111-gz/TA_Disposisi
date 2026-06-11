package models

import "time"

type Disposisi struct {
	ID                   uint       `gorm:"primaryKey;column:id_disposisi" json:"id"`
	TanggapanSaran       string     `gorm:"column:tanggapan_saran" json:"tanggapan_saran"`
	ProsesLanjut         string     `gorm:"column:proses_lanjut" json:"proses_lanjut"`
	KoordinasiKonfirmasi string     `gorm:"column:koordinasi_konfirmasi" json:"koordinasi_konfirmasi"`
	IDSuratMasuk         *uint      `gorm:"column:id_surat_masuk" json:"id_surat_masuk"`
	IDKepsek             *uint      `gorm:"column:id_kepsek" json:"id_kepsek"`
	IDPenerima           *uint      `gorm:"column:id_penerima" json:"id_penerima"`
	TanggalDisposisi     time.Time  `gorm:"column:tanggal_disposisi" json:"tanggal_disposisi"`
	StatusDisposisi      string     `gorm:"column:status_disposisi;default:belum_dibaca" json:"status_disposisi"`
	StatusApproval       string     `gorm:"column:status_approval;default:menunggu" json:"status_approval"`
	ApprovalAt           *time.Time `gorm:"column:approval_at" json:"approval_at"`
	CatatanKepsek        string     `gorm:"column:catatan_kepsek" json:"catatan_kepsek"`
	IDJabatanPenerima    *uint      `gorm:"column:id_jabatan_penerima" json:"id_jabatan_penerima"`

	SuratMasuk *SuratMasuk    `gorm:"foreignKey:IDSuratMasuk" json:"surat_masuk,omitempty"`
	Kepsek     *User          `gorm:"foreignKey:IDKepsek" json:"kepsek,omitempty"`
	Penerima   *User          `gorm:"foreignKey:IDPenerima" json:"penerima,omitempty"`
	Distribusi []DistribusiSM `gorm:"foreignKey:IDDisposisi" json:"distribusi,omitempty"` // ← tambah ini
}

func (Disposisi) TableName() string {
	return "disposisi"
}
