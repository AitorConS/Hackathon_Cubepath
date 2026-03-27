package auth

import (
	"context"
	"log"
	"net/http"
	"strings"

	"cubepod/backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

func Middleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenString := ""

			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
					tokenString = parts[1]
				}
			}
			if tokenString == "" {
				tokenString = r.URL.Query().Get("token")
			}

			if tokenString == "" {
				http.Error(w, "Token de autorización faltante o inválido", http.StatusUnauthorized)
				return
			}

			token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
			if err != nil {
				log.Printf("Token Parse Error: %v", err)
				http.Error(w, "Formato de token inválido", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Claims de token inválidos", http.StatusUnauthorized)
				return
			}

			sub, ok := claims["sub"].(string)
			if !ok || sub == "" {
				http.Error(w, "Sujeto de usuario inválido en el token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, sub)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) string {
	if val, ok := ctx.Value(UserIDKey).(string); ok {
		return val
	}
	return ""
}
