package docker

import (
	"context"
	"fmt"
	"io"
	"log"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

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

// PullImage ensures the image is available locally
func (s *Service) PullImage(ctx context.Context, imageName string) error {
	log.Printf("Pulling image %s...", imageName)
	reader, err := s.cli.ImagePull(ctx, imageName, types.ImagePullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()

	// Just consume to wait for pull
	// In a complete app we would stream/log this output
	buf := make([]byte, 1024)
	for {
		_, err := reader.Read(buf)
		if err != nil {
			break
		}
	}
	return nil
}

// CreateContainer creates a container from the given image with a command, returning the ID
func (s *Service) CreateContainer(ctx context.Context, imageName, containerName, cmdStr string) (string, error) {
	var cmd []string
	if cmdStr != "" {
		// Just a simple split for now; realistically requires parsing
		cmd = []string{"sh", "-c", cmdStr}
	}

	resp, err := s.cli.ContainerCreate(ctx, &container.Config{
		Image:     imageName,
		Cmd:       cmd,
		Tty:       true, // Needed for interactive terminals
		OpenStdin: true,
	}, &container.HostConfig{
		// Basic security/resource limits could be applied here
		// E.g., Memory: 128*1024*1024
		AutoRemove: false,
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
	timeout := 10 // stop timeout in seconds
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
