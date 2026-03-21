package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	SupabaseURL        string
	SupabaseKey        string
	SupabaseDB         string
	SupabaseJWTSecret  string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseKey:       getEnv("SUPABASE_KEY", ""),
		SupabaseDB:        getEnv("DATABASE_URL", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists {
		return val
	}
	return defaultVal
}
