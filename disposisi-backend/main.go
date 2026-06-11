package main

import (
	"log"

	"github.com/fiorelln/disposisi/config"
	"github.com/fiorelln/disposisi/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()

	if err != nil {
		log.Fatal("Gagal load .env")
	}

	config.ConnectDB()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://127.0.0.1:5500",
			"http://localhost:5500",
			"http://127.0.0.1:5501",
			"http://localhost:5501",
		},
		AllowOriginFunc: func(origin string) bool {
			// Electron pakai file:// protocol, origin bisa kosong atau "file://"
			return true
		},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Content-Type",
			"Authorization",
		},
		AllowCredentials: false,
	}))

	routes.SetupRoutes(r)

	r.GET("/uploads/*filepath", func(c *gin.Context) {
		filePath := c.Param("filepath")
		c.Header("Content-Disposition", "inline")
		c.File("./uploads" + filePath)
	})

	r.Run(":7000")
}
