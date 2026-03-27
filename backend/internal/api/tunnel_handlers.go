package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"cubepod/backend/internal/auth"
	"cubepod/backend/internal/db"
)

func (a *API) GetTunnels(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if a.DB == nil {
		json.NewEncoder(w).Encode([]db.Tunnel{})
		return
	}

	tunnels, err := a.DB.GetTunnelsByUser(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for i := range tunnels {
		if a.Tunnel.IsRunning(tunnels[i].ID.String()) {
			tunnels[i].Status = "active"
			tunnels[i].PublicURL = a.Tunnel.GetTunnelURL(tunnels[i].ID.String())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tunnels)
}

func (a *API) CreateTunnel(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())

	type reqBody struct {
		PodID string `json:"pod_id"`
		Port  int    `json:"port"`
	}
	var req reqBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pod, err := a.DB.GetPodByID(req.PodID, userID)
	if err != nil || pod.DockerContainerID == "" {
		http.Error(w, "Pod no encontrado", http.StatusNotFound)
		return
	}

	tunnelID := uuid.New()
	userUUID, _ := uuid.Parse(userID)
	podUUID, _ := uuid.Parse(req.PodID)

	t := &db.Tunnel{
		ID:        tunnelID,
		UserID:    userUUID,
		PodID:     podUUID,
		Port:      req.Port,
		PublicURL: "",
		Status:    "starting",
	}

	if a.DB != nil {
		if err := a.DB.InsertTunnel(t); err != nil {
			log.Printf("Error al guardar el túnel en la DB: %v", err)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	go func() {
		defer cancel()
		publicURL, err := a.Tunnel.StartTunnel(ctx, tunnelID.String(), pod.DockerContainerID, req.Port)
		if err != nil {
			log.Printf("El túnel %s falló: %v", tunnelID, err)
			if a.DB != nil {
				a.DB.UpdateTunnelURL(tunnelID.String(), "", "error")
			}
			return
		}
		if a.DB != nil {
			a.DB.UpdateTunnelURL(tunnelID.String(), publicURL, "active")
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (a *API) DeleteTunnel(w http.ResponseWriter, r *http.Request) {
	tunnelID := chi.URLParam(r, "id")

	if err := a.Tunnel.StopTunnel(tunnelID); err != nil {
		log.Printf("Advertencia al detener el túnel: %v", err)
	}

	if a.DB != nil {
		a.DB.DeleteTunnel(tunnelID)
	}

	w.Write([]byte(`{"status":"stopped"}`))
}

func (a *API) GetTunnelStatus(w http.ResponseWriter, r *http.Request) {
	tunnelID := chi.URLParam(r, "id")

	type statusResp struct {
		ID        string `json:"id"`
		IsRunning bool   `json:"is_running"`
		PublicURL string `json:"public_url"`
	}

	resp := statusResp{
		ID:        tunnelID,
		IsRunning: a.Tunnel.IsRunning(tunnelID),
		PublicURL: a.Tunnel.GetTunnelURL(tunnelID),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
