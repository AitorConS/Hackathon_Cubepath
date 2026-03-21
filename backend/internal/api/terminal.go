package api

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"cubepod/backend/internal/auth"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Validar el origen para mayor seguridad
		return true
		/* 		origin := r.Header.Get("Origin")
		   		if origin == "https://tudominio.com" {
		   			return true
		   		}
		   		return false */
	},
}

func (a *API) TerminalHandler(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	log.Printf("Terminal WS solicitado para el pod %s por el usuario %s", podID, userID)

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error al actualizar la terminal: %v", err)
		return
	}
	defer conn.Close()

	resp, err := a.Docker.ExecInteractive(r.Context(), pod.DockerContainerID, []string{"/bin/sh"})
	if err != nil {
		log.Printf("Error de ejecución de Docker: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte("Error al iniciar la sesión de terminal.\r\n"))
		return
	}
	defer resp.Close()

	// Leer de Docker, escribir en WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := resp.Reader.Read(buf)
			if err != nil {
				break
			}
			if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
				break
			}
		}
	}()

	// Leer de WebSocket, escribir en Docker
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			break
		}

		_, err = resp.Conn.Write(p)
		if err != nil {
			break
		}
	}
}
