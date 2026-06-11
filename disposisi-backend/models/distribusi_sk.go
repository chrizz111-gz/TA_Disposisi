package models

import "time"

type DistribusiSK struct {
	ID            uint       `gorm:"primaryKey;column:id_distribusi" json:"id"`
	IDSuratKeluar uint       `gorm:"column:id_sk" json:"id_sk"`
	IDUser        uint       `gorm:"column:id_user" json:"id_user"`
	Status        string     `gorm:"column:status" json:"status"`
	DistributeAt  *time.Time `gorm:"column:distribute_at" json:"distribute_at"`
	ReadAt        *time.Time `gorm:"column:read_at" json:"read_at"`
	Catatan       string     `gorm:"column:catatan" json:"catatan"`

	SuratKeluar *SuratKeluar `gorm:"foreignKey:IDSuratKeluar" json:"surat_keluar,omitempty"`
	User        *User        `gorm:"foreignKey:IDUser" json:"user,omitempty"`
}

func (DistribusiSK) TableName() string {
	return "distribusi_sk"
}
