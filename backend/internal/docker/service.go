package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"sort"
	"strconv"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

// ContainerStats almacena el uso de recursos en tiempo real para un contenedor
type ContainerStats struct {
	CPUPercent float64 `json:"cpu_percent"`
	MemUsage   uint64  `json:"mem_usage"`
	MemLimit   uint64  `json:"mem_limit"`
	MemPercent float64 `json:"mem_percent"`
	NetworkRx  uint64  `json:"network_rx"`
	NetworkTx  uint64  `json:"network_tx"`
}

type Service struct {
	cli *client.Client
}

func NewService() (*Service, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}
	return &Service{cli: cli}, nil
}

// PullImage descarga la imagen de Docker si no está disponible localmente
func (s *Service) PullImage(ctx context.Context, imageName string) error {
	log.Printf("Descargando imagen %s...", imageName)
	reader, err := s.cli.ImagePull(ctx, imageName, types.ImagePullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()

	buf := make([]byte, 1024)
	for {
		_, err := reader.Read(buf)
		if err != nil {
			break
		}
	}
	return nil
}

// CreateContainer crea un contenedor a partir de la imagen especificada
func (s *Service) CreateContainer(ctx context.Context, imageName, containerName, cmdStr string) (string, error) {
	var cmd []string
	if cmdStr != "" {
		cmd = []string{"sh", "-c", cmdStr}
	}

	resp, err := s.cli.ContainerCreate(ctx, &container.Config{
		Image:     imageName,
		Cmd:       cmd,
			Tty:       true,
			OpenStdin: true,
		}, &container.HostConfig{
			AutoRemove: false,
			Resources: container.Resources{
				Memory:   512 * 1024 * 1024,
				NanoCPUs: 1_000_000_000,
	}, nil, nil, containerName)

	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	return resp.ID, nil
}

func (s *Service) StartContainer(ctx context.Context, containerID string) error {
	return s.cli.ContainerStart(ctx, containerID, types.ContainerStartOptions{})
}

func (s *Service) StopContainer(ctx context.Context, containerID string) error {
	timeout := 10
	return s.cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
}

func (s *Service) RemoveContainer(ctx context.Context, containerID string) error {
	return s.cli.ContainerRemove(ctx, containerID, types.ContainerRemoveOptions{
		Force: true,
	})
}

func (s *Service) ExecCommand(ctx context.Context, containerID string, cmd []string) (string, error) {
	execResp, err := s.cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          cmd,
	})
	if err != nil {
		return "", err
	}

	resp, err := s.cli.ContainerExecAttach(ctx, execResp.ID, types.ExecStartCheck{})
	if err != nil {
		return "", err
	}
	defer resp.Close()

	out, err := io.ReadAll(resp.Reader)
	if err != nil {
		return "", err
	}

	return string(out), nil
}

func (s *Service) ExecInteractive(ctx context.Context, containerID string, cmd []string) (types.HijackedResponse, error) {
	execResp, err := s.cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          cmd,
	})
	if err != nil {
		return types.HijackedResponse{}, err
	}

	return s.cli.ContainerExecAttach(ctx, execResp.ID, types.ExecStartCheck{Tty: true})
}

func (s *Service) GetClient() *client.Client {
	return s.cli
}

// StreamLogs retorna un lector que transmite los registros stdout+stderr del contenedor.
func (s *Service) StreamLogs(ctx context.Context, containerID string) (io.ReadCloser, error) {
	return s.cli.ContainerLogs(ctx, containerID, types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Timestamps: false,
		Tail:       "200",
	})
}

// GetStats retorna una snapshot de uso de CPU, memoria y red
func (s *Service) GetStats(ctx context.Context, containerID string) (*ContainerStats, error) {
	resp, err := s.cli.ContainerStats(ctx, containerID, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer resp.Body.Close()

	var statsJSON types.StatsJSON
	if err := json.NewDecoder(resp.Body).Decode(&statsJSON); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	cpuDelta := float64(statsJSON.CPUStats.CPUUsage.TotalUsage - statsJSON.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(statsJSON.CPUStats.SystemUsage - statsJSON.PreCPUStats.SystemUsage)
	numCPUs := float64(statsJSON.CPUStats.OnlineCPUs)
	if numCPUs == 0 {
		numCPUs = float64(len(statsJSON.CPUStats.CPUUsage.PercpuUsage))
	}
	if numCPUs == 0 {
		numCPUs = 1
	}
	var cpuPercent float64
	if systemDelta > 0 && cpuDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * numCPUs * 100.0
	}

	memUsage := statsJSON.MemoryStats.Usage
	memLimit := statsJSON.MemoryStats.Limit
	var memPercent float64
	if memLimit > 0 {
		memPercent = float64(memUsage) / float64(memLimit) * 100.0
	}

	var rxBytes, txBytes uint64
	for _, netStats := range statsJSON.Networks {
		rxBytes += netStats.RxBytes
		txBytes += netStats.TxBytes
	}

	return &ContainerStats{
		CPUPercent: cpuPercent,
		MemUsage:   memUsage,
		MemLimit:   memLimit,
		MemPercent: memPercent,
		NetworkRx:  rxBytes,
		NetworkTx:  txBytes,
	}, nil
}

// GetListeningPorts retorna la lista de puertos TCP en los que el contenedor está escuchando
func (s *Service) GetListeningPorts(ctx context.Context, containerID string) ([]int, error) {
	out, err := s.ExecCommand(ctx, containerID, []string{
		"sh", "-c", `ss -tlnp 2>/dev/null | awk 'NR>1{n=split($4,a,":");print a[n]}'`,
	})
	if err != nil {
		return []int{}, nil
	}

	seen := map[int]bool{}
	var ports []int
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if !isDigitsOnly(line) {
			continue
		}
		port, err := strconv.Atoi(line)
		if err == nil && port > 0 && port < 65536 && !seen[port] {
			seen[port] = true
			ports = append(ports, port)
		}
	}
	sort.Ints(ports)
	return ports, nil
}

func isDigitsOnly(s string) bool {
	if len(s) == 0 {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
