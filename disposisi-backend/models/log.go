package models

import "time"

type Log struct {
	IDLog        uint      `gorm:"primaryKey;column:id_log" json:"id_log"`
	IDUser       *uint     `gorm:"column:id_user" json:"id_user"`
	Aksi         string    `gorm:"column:aksi" json:"aksi"`
	TabelTerkait string    `gorm:"column:tabel_terkait" json:"tabel_terkait"`
	KolomTerkait string    `gorm:"column:kolom_terkait" json:"kolom_terkait"`
	IDData       *uint     `gorm:"column:id_data" json:"id_data"`
	ValuesOld    string    `gorm:"column:values_old" json:"values_old"`
	ValuesNew    string    `gorm:"column:values_new" json:"values_new"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`

	User *User `gorm:"foreignKey:IDUser;references:ID" json:"user,omitempty"`
}

func (Log) TableName() string {
	return "log"
}

type LogDistribusi struct {
	IDRiwayat    uint      `gorm:"primaryKey;column:id_riwayat" json:"id_riwayat"`
	IDSM         *uint     `gorm:"column:id_sm" json:"id_sm"`
	IDSK         *uint     `gorm:"column:id_sk" json:"id_sk"`
	StatusAsal   string    `gorm:"column:status_asal" json:"status_asal"`
	StatusTujuan string    `gorm:"column:status_tujuan" json:"status_tujuan"`
	IDUser       *uint     `gorm:"column:id_user" json:"id_user"`
	Catatan      string    `gorm:"column:catatan" json:"catatan"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`

	User *User `gorm:"foreignKey:IDUser;references:ID" json:"user,omitempty"`
}

func (LogDistribusi) TableName() string {
	return "log_distribusi"
}
