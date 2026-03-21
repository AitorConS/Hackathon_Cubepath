package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"cubepod/backend/internal/auth"
	"cubepod/backend/internal/db"
	"cubepod/backend/internal/docker"
	"cubepod/backend/internal/tunnel"
)

type API struct {
	DB     *db.Database
	Docker *docker.Service
	Tunnel *tunnel.Service
}

func RegisterRoutes(r chi.Router, api *API, authMiddleware func(http.Handler) http.Handler) {
	// Rutas públicas
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Rutas protegidas
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)

		r.Get("/templates", api.GetTemplates)
		r.Get("/pods", api.GetPods)
		r.Post("/pods", api.CreatePod)
		r.Get("/pods/{id}", api.GetPod)
		r.Post("/pods/{id}/start", api.StartPod)
		r.Post("/pods/{id}/stop", api.StopPod)
		r.Delete("/pods/{id}", api.DeletePod)

		// Terminal WebSocket
		r.HandleFunc("/pods/{id}/terminal", api.TerminalHandler)

		// Gestión de archivos
		r.Get("/pods/{id}/files", api.ListFiles)
		r.Get("/pods/{id}/file", api.ReadFile)
		r.Put("/pods/{id}/file", api.WriteFile)
		r.Delete("/pods/{id}/file", api.DeleteFile)

		// Túneles
		r.Get("/tunnels", api.GetTunnels)
		r.Post("/tunnels", api.CreateTunnel)
		r.Get("/tunnels/{id}/status", api.GetTunnelStatus)
		r.Delete("/tunnels/{id}", api.DeleteTunnel)
	})
}

// Stubs de manejadores por ahora

func (a *API) GetTemplates(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	templates, err := a.DB.GetTemplates()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}

func (a *API) GetPods(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if a.DB == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	pods, err := a.DB.GetPodsByUser(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pods)
}

func (a *API) CreatePod(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())

	type reqBody struct {
		TemplateSlug string `json:"template_slug"`
		Name         string `json:"name"`
		Version      string `json:"version"`
	}
	var req reqBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validar límite máximo de 3 contenedores por usuario
	if a.DB != nil {
		pods, err := a.DB.GetPodsByUser(userID)
		if err != nil {
			http.Error(w, "Error al validar límite de pods", http.StatusInternalServerError)
			return
		}
		if len(pods) >= 3 {
			http.Error(w, "Solo puedes tener máximo 3 contenedores. Elimina uno para crear otro.", http.StatusBadRequest)
			return
		}
	}

	tpl, err := a.DB.GetTemplateBySlug(req.TemplateSlug)
	if err != nil {
		http.Error(w, "Plantilla no encontrada", http.StatusNotFound)
		return
	}

	dockerImage := tpl.DockerImage
	if req.Version != "" {
		// Reemplazar el tag o añadirlo si no existe.
		// división simplificada para imágenes estándar como "ubuntu:22.04" -> "ubuntu" + ":" + versión
		parts := strings.Split(dockerImage, ":")
		dockerImage = parts[0] + ":" + req.Version
	}

	// 1. Guardar pod en la DB con status "creating"
	userUUID, _ := uuid.Parse(userID)
	containerName := "pod-" + uuid.New().String()[:8]
	pod := &db.Pod{
		UserID:            userUUID,
		TemplateID:        tpl.ID,
		Name:              req.Name,
		DockerContainerID: "", // Se llenará cuando se cree el contenedor
		Status:            "creating",
	}

	if err := a.DB.InsertPod(pod); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Iniciar deployment asincronista en un goroutine
	go func() {
		ctx := context.Background()

		// Descargar imagen
		err := a.Docker.PullImage(ctx, dockerImage)
		if err != nil {
			fmt.Printf("Error pulling image for pod %s: %v\n", pod.ID, err)
			a.DB.UpdatePodStatus(pod.ID.String(), "error")
			return
		}

		// Crear e Iniciar Contenedor Docker
		containerID, err := a.Docker.CreateContainer(ctx, dockerImage, containerName, tpl.DefaultCommand)
		if err != nil {
			fmt.Printf("Error creating container for pod %s: %v\n", pod.ID, err)
			a.DB.UpdatePodStatus(pod.ID.String(), "error")
			return
		}

		err = a.Docker.StartContainer(ctx, containerID)
		if err != nil {
			fmt.Printf("Error starting container for pod %s: %v\n", pod.ID, err)
			a.DB.UpdatePodStatus(pod.ID.String(), "error")
			return
		}

		// Actualizar el pod con el ID del contenedor y status "running"
		a.DB.UpdatePodContainerID(pod.ID.String(), containerID)
		a.DB.UpdatePodStatus(pod.ID.String(), "running")
	}()

	// 3. Devolver el pod con status "creating"
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pod)
}

func (a *API) GetPod(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pod)
}

func (a *API) StartPod(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	err = a.Docker.StartContainer(r.Context(), pod.DockerContainerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	a.DB.UpdatePodStatus(pod.ID.String(), "running")
	w.Write([]byte(`{"status":"success"}`))
}

func (a *API) StopPod(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	err = a.Docker.StopContainer(r.Context(), pod.DockerContainerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	a.DB.UpdatePodStatus(pod.ID.String(), "stopped")
	w.Write([]byte(`{"status":"success"}`))
}

func (a *API) DeletePod(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	if pod.DockerContainerID != "" {
		a.Docker.RemoveContainer(r.Context(), pod.DockerContainerID)
	}

	a.DB.DeletePod(pod.ID.String())
	w.Write([]byte(`{"status":"success"}`))
}

func (a *API) ListFiles(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	out, err := a.Docker.ExecCommand(r.Context(), pod.DockerContainerID, []string{"ls", "-la", path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write([]byte(out))
}

func (a *API) ReadFile(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())
	path := r.URL.Query().Get("path")

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	out, err := a.Docker.ExecCommand(r.Context(), pod.DockerContainerID, []string{"cat", path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write([]byte(out))
}

func (a *API) WriteFile(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())

	type reqBody struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	var req reqBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	cmdStr := fmt.Sprintf("echo '%s' | base64 -d > %s", base64.StdEncoding.EncodeToString([]byte(req.Content)), req.Path)
	_, err = a.Docker.ExecCommand(r.Context(), pod.DockerContainerID, []string{"sh", "-c", cmdStr})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write([]byte(`{"status":"success"}`))
}

func (a *API) DeleteFile(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "id")
	userID := auth.GetUserID(r.Context())
	path := r.URL.Query().Get("path")

	pod, err := a.DB.GetPodByID(podID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	_, err = a.Docker.ExecCommand(r.Context(), pod.DockerContainerID, []string{"rm", "-rf", path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write([]byte(`{"status":"success"}`))
}
