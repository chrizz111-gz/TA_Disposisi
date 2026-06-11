package routes

import (
	"github.com/fiorelln/disposisi/controllers"
	"github.com/fiorelln/disposisi/helpers"
	"github.com/fiorelln/disposisi/middlewares"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.POST("/seed-admin", controllers.SeedAdmin)

	r.GET("/genhash", func(c *gin.Context) {
		hash, _ := helpers.HashPassword("test123")
		c.JSON(200, gin.H{"hash": hash})
	})

	AuthRoutes(r)
	AdminRoutes(r)
	SuratMasukRoutes(r)
	SuratKeluarRoutes(r)
	DisposisiRoutes(r)
	DashboardRoutes(r)
	JabatanRoutes(r)
	LogoRoutes(r)
	DocsRoutes(r)
}

func AuthRoutes(r *gin.Engine) {
	auth := r.Group("/auth")
	auth.POST("/login", controllers.Login)
	auth.POST("/forgot-password", controllers.ForgotPassword)
	auth.POST("/verify-otp", controllers.VerifyOTP)
	auth.POST("/reset-password", controllers.ResetPassword)
}

func AdminRoutes(r *gin.Engine) {
	admin := r.Group("/admin")
	admin.Use(middlewares.AuthMiddleware(), middlewares.RoleMiddleware("admin"))
	admin.POST("/users", controllers.Register)
	admin.GET("/users", controllers.ListUsers)
	admin.PUT("/users/:id/jabatan", controllers.UpdateUserJabatan)
	admin.DELETE("/users/:id", controllers.DeleteUser)
	admin.GET("/logs", controllers.ListLogs)
	admin.POST("/logo/upload", controllers.UploadLogo)
}

func SuratMasukRoutes(r *gin.Engine) {
	sm := r.Group("/surat-masuk")
	sm.Use(middlewares.AuthMiddleware())
	sm.POST("/upload", middlewares.RoleMiddleware("admin", "pegawai"), controllers.UploadSuratMasuk)
	sm.GET("/:surat_id", controllers.GetSuratMasuk)
	sm.GET("", controllers.ListSuratMasuk)
}

func SuratKeluarRoutes(r *gin.Engine) {
	sk := r.Group("/surat-keluar")
	sk.Use(middlewares.AuthMiddleware())
	sk.POST("/upload", middlewares.RoleMiddleware("admin", "pegawai"), controllers.UploadSuratKeluar)
	sk.GET("/:surat_id", controllers.GetSuratKeluar)
	sk.GET("", controllers.ListSuratKeluar)
	sk.POST("/approve", middlewares.RoleMiddleware("kepala sekolah"), controllers.ApproveSuratKeluar)
	sk.POST("/selesai/:surat_id", middlewares.RoleMiddleware("admin", "pegawai"), controllers.TuSelesaikanSuratKeluar)
}

func DisposisiRoutes(r *gin.Engine) {
	disposisi := r.Group("/disposisi")
	disposisi.Use(middlewares.AuthMiddleware())

	// TU
	disposisi.POST("", middlewares.RoleMiddleware("admin", "pegawai"), controllers.CreateDisposisi)
	disposisi.POST("/teruskan-waka", middlewares.RoleMiddleware("admin", "pegawai"), controllers.TuTeruskanKeWaka)

	// Kepsek
	disposisi.POST("/approve", middlewares.RoleMiddleware("kepala sekolah"), controllers.ApproveDisposisi)

	// Waka
	disposisi.POST("/waka", middlewares.RoleMiddleware("waka kesiswaan", "waka kurikulum", "waka sarpras", "waka humas", "koordinator waka"), controllers.WakaTeruskanKeUser)

	// Semua role
	disposisi.POST("/baca", controllers.BacaDisposisi)
	disposisi.GET("/surat/:surat_id", controllers.GetDisposisi)
	disposisi.GET("", controllers.ListDisposisi)
}

func JabatanRoutes(r *gin.Engine) {
	r.GET("/jabatan", middlewares.AuthMiddleware(), controllers.ListJabatan)
	r.GET("/jabatan/:id/users", middlewares.AuthMiddleware(), controllers.GetUserByJabatan)
	r.GET("/users/biasa", middlewares.AuthMiddleware(), controllers.ListUserBiasa)
}

func DashboardRoutes(r *gin.Engine) {
	dashboard := r.Group("/dashboard")
	dashboard.Use(middlewares.AuthMiddleware())
	dashboard.GET("", controllers.Dashboard)
}

func LogoRoutes(r *gin.Engine) {
	r.GET("/logo", controllers.GetLogo)
}

func DocsRoutes(r *gin.Engine) {
	r.GET("/docs", func(c *gin.Context) {
		c.File("docs/index.html")
	})
	r.GET("/openapi.yaml", func(c *gin.Context) {
		c.File("openapi.yaml")
	})
}
