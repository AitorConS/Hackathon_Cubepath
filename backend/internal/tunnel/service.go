package tunnel

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"regexp"
	"sync"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	dockerclient "github.com/docker/docker/client"
)

// ActiveTunnel representa un contenedor sidecar cloudflared en ejecución
type ActiveTunnel struct {
	ID          string
	PodID       string
	Port        int
	PublicURL   string
	ContainerID string
}

// Service gestiona todos los contenedores sidecar de túneles cloudflared activos
type Service struct {
	mu      sync.RWMutex
	tunnels map[string]*ActiveTunnel
	cli     *dockerclient.Client
}

func NewService(cli *dockerclient.Client) *Service {
	return &Service{
		tunnels: make(map[string]*ActiveTunnel),
		cli:     cli,
	}
}

// StartTunnel inicia un contenedor sidecar cloudflared que comparte el namespace de red del contenedor pod destino
func (s *Service) StartTunnel(ctx context.Context, tunnelID, podContainerID string, port int) (string, error) {
	targetURL := fmt.Sprintf("http://localhost:%d", port)

	// Pull the cloudflared image if not present (best-effort)
	reader, err := s.cli.ImagePull(ctx, "cloudflare/cloudflared:latest", types.ImagePullOptions{})
	if err == nil {
		buf := make([]byte, 1024)
		for {
			_, err := reader.Read(buf)
			if err != nil {
				break
			}
		}
		reader.Close()
	}

	containerName := "cubepod-tunnel-" + tunnelID[:8]

	resp, err := s.cli.ContainerCreate(ctx,
		&container.Config{
			Image: "cloudflare/cloudflared:latest",
			Cmd:   []string{"tunnel", "--url", targetURL, "--no-autoupdate"},
		},
		&container.HostConfig{
			NetworkMode: container.NetworkMode(fmt.Sprintf("container:%s", podContainerID)),
			AutoRemove:  true,
		},
		nil, nil,
		containerName,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create cloudflared container: %w", err)
	}

	if err := s.cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return "", fmt.Errorf("failed to start cloudflared container: %w", err)
	}

	// Follow container logs to find the tunnel URL
	logReader, err := s.cli.ContainerLogs(ctx, resp.ID, types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
	})
	if err != nil {
		return "", fmt.Errorf("failed to read cloudflared container logs: %w", err)
	}
	defer logReader.Close()

	urlCh := make(chan string, 1)
	urlRegex := regexp.MustCompile(`https?://[a-zA-Z0-9\-]+\.trycloudflare\.com`)

	go func() {
		scanner := bufio.NewScanner(logReader)
		for scanner.Scan() {
			line := scanner.Text()
			log.Printf("[cloudflared sidecar %s] %s", tunnelID[:8], line)
			if match := urlRegex.FindString(line); match != "" {
				select {
				case urlCh <- match:
				default:
				}
			}
		}
	}()

	var publicURL string
	select {
	case publicURL = <-urlCh:
		log.Printf("Túnel %s establecido en %s", tunnelID, publicURL)
	case <-ctx.Done():
		s.cli.ContainerKill(context.Background(), resp.ID, "SIGKILL")
		return "", fmt.Errorf("timeout waiting for tunnel URL")
	}

	at := &ActiveTunnel{
		ID:          tunnelID,
		Port:        port,
		PublicURL:   publicURL,
		ContainerID: resp.ID,
	}

	s.mu.Lock()
	s.tunnels[tunnelID] = at
	s.mu.Unlock()

	return publicURL, nil
}

// StopTunnel detiene el contenedor sidecar cloudflared
func (s *Service) StopTunnel(tunnelID string) error {
	s.mu.Lock()
	at, ok := s.tunnels[tunnelID]
	if ok {
		delete(s.tunnels, tunnelID)
	}
	s.mu.Unlock()

	if !ok {
		return nil
	}

	timeout := 5
	return s.cli.ContainerStop(context.Background(), at.ContainerID, container.StopOptions{Timeout: &timeout})
}

// GetTunnelURL returns the public URL for a given tunnel ID
func (s *Service) GetTunnelURL(tunnelID string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if at, ok := s.tunnels[tunnelID]; ok {
		return at.PublicURL
	}
	return ""
}

// IsRunning returns true if the tunnel sidecar is tracked as active
func (s *Service) IsRunning(tunnelID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.tunnels[tunnelID]
	return ok
}
