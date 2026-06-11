package models

import "time"

type DistribusiSM struct {
	IDPenerimaDistribusi uint       `gorm:"primaryKey;column:id_penerima_disposisi" json:"id_penerima_disposisi"`
	IDDisposisi          uint       `gorm:"column:id_disposisi" json:"id_disposisi"`
	IDUser               *uint      `gorm:"column:id_user" json:"id_user"`
	IDJabatan            *uint      `gorm:"column:id_jabatan" json:"id_jabatan"`
	IDWaka               *uint      `gorm:"column:id_waka" json:"id_waka"`
	IDDistribusiParent   *uint      `gorm:"column:id_distribusi_parent" json:"id_distribusi_parent"`
	ReadAt               *time.Time `gorm:"column:read_at" json:"read_at"`
	CreatedAt            *time.Time `gorm:"column:created_at" json:"created_at"`
	Status               string     `gorm:"column:status;default:belum_dibaca" json:"status"`
	CatatanWaka          string     `gorm:"column:catatan_waka" json:"catatan_waka"`

	Disposisi *Disposisi `gorm:"foreignKey:IDDisposisi;references:ID" json:"disposisi,omitempty"`
	User      *User      `gorm:"foreignKey:IDUser;references:ID" json:"user,omitempty"`
	Jabatan   *Jabatan   `gorm:"foreignKey:IDJabatan;references:ID" json:"jabatan,omitempty"`
	Waka      *User      `gorm:"foreignKey:IDWaka;references:ID" json:"waka,omitempty"`
}

func (DistribusiSM) TableName() string {
	return "distribusi_sm"
}
