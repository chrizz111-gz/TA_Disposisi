package models

type UserJabatan struct {
	UserID    uint `gorm:"primaryKey;column:id_user" json:"id_user"`
	JabatanID uint `gorm:"primaryKey;column:id_jabatan" json:"id_jabatan"`
	IsPrimary bool `gorm:"column:is_primary" json:"is_primary"`

	Jabatan *Jabatan `gorm:"foreignKey:JabatanID;references:ID" json:"jabatan,omitempty"`
}

func (UserJabatan) TableName() string {
	return "user_jabatan"
}
