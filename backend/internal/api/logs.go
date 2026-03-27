package api

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"cubepod/backend/internal/auth"
	"github.com/docker/docker/pkg/stdcopy"
)

// wsWriter wraps a WebSocket connection as an io.Writer so stdcopy can demux
// the Docker multiplexed log stream and send each chunk as a WS message.
type wsWriter struct {
	conn *websocket.Conn
}

func (w *wsWriter) Write(p []byte) (int, error) {
	if err := w.conn.WriteMessage(websocket.TextMessage, p); err != nil {
		return 0, err
	}
	return len(p), nil
}

func (a *API) LogsHandler(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error al actualizar logs WS: %v", err)
		return
	}
	defer conn.Close()

	logReader, err := a.Docker.StreamLogs(r.Context(), pod.DockerContainerID)
	if err != nil {
		log.Printf("Error al obtener logs del contenedor: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte("Error al obtener los logs.\r\n"))
		return
	}
	defer logReader.Close()

	writer := &wsWriter{conn: conn}

	// stdcopy demultiplexes the Docker log stream (stdout + stderr) and writes
	// clean text to the WebSocket without the 8-byte framing headers.
	if _, err := stdcopy.StdCopy(writer, writer, logReader); err != nil {
		log.Printf("Log stream finalizado para pod %s: %v", podID, err)
	}
}
