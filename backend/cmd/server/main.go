package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"cubepod/backend/internal/api"
	"cubepod/backend/internal/auth"
	"cubepod/backend/internal/config"
	"cubepod/backend/internal/db"
	"cubepod/backend/internal/docker"
	"cubepod/backend/internal/tunnel"
)

func main() {
	// 1. Cargar configuración
	cfg := config.LoadConfig()

	// 2. Inicializar conexión a la DB
	var database *db.Database
	if cfg.SupabaseDB != "" {
		dbConn, err := db.Connect(cfg.SupabaseDB)
		if err != nil {
			log.Fatalf("Error de conexión a la base de datos: %v", err)
		}
		database = dbConn
		defer database.Close()
	} else {
		log.Println("ADVERTENCIA: SUPABASE_DB no está configurado, funcionando sin DB por ahora.")
	}

	// 3. Inicializar servicio de Docker
	dockerService, err := docker.NewService()
	if err != nil {
		log.Fatalf("Error al inicializar el servicio de Docker: %v", err)
	}

	// 4. Configurar el Router

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS básico
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, 
	}))

	authMiddleware := auth.Middleware(cfg)

	tunnelService := tunnel.NewService(dockerService.GetClient())

	backendAPI := &api.API{
		DB:     database,
		Docker: dockerService,
		Tunnel: tunnelService,
	}

	api.RegisterRoutes(r, backendAPI, authMiddleware)

	log.Printf("Iniciando servidor en el puerto %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("El servidor falló: %v", err)
	}
}
