package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	pool *pgxpool.Pool
}

type Template struct {
	ID             uuid.UUID `json:"ID"`
	Slug           string    `json:"Slug"`
	Name           string    `json:"Name"`
	Description    string    `json:"Description"`
	DockerImage    string    `json:"DockerImage"`
	Category       string    `json:"Category"`
	DefaultCommand string    `json:"DefaultCommand"`
	ExposedPorts   string    `json:"ExposedPorts"` // JSON
	CreatedAt      time.Time `json:"CreatedAt"`
}

type Pod struct {
	ID                uuid.UUID `json:"ID"`
	UserID            uuid.UUID `json:"UserID"`
	TemplateID        uuid.UUID `json:"TemplateID"`
	Name              string    `json:"Name"`
	DockerContainerID string    `json:"DockerContainerID"`
	Status            string    `json:"Status"`
	CreatedAt         time.Time `json:"CreatedAt"`
	UpdatedAt         time.Time `json:"UpdatedAt"`
}

type Tunnel struct {
	ID        uuid.UUID `json:"ID"`
	UserID    uuid.UUID `json:"UserID"`
	PodID     uuid.UUID `json:"PodID"`
	Port      int       `json:"Port"`
	PublicURL string    `json:"PublicURL"`
	Status    string    `json:"Status"` // starting, active, stopped
	CreatedAt time.Time `json:"CreatedAt"`
}

func Connect(connStr string) (*Database, error) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Connected to Supabase PostgreSQL database")
	return &Database{pool: pool}, nil
}

func (d *Database) Close() {
	d.pool.Close()
}

func (d *Database) GetTemplates() ([]Template, error) {
	query := `SELECT id, slug, name, description, docker_image, category, default_command, exposed_ports, created_at FROM public.templates`
	rows, err := d.pool.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Slug, &t.Name, &t.Description, &t.DockerImage, &t.Category, &t.DefaultCommand, &t.ExposedPorts, &t.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (d *Database) GetPodsByUser(userID string) ([]Pod, error) {
	query := `SELECT id, user_id, template_id, name, docker_container_id, status, created_at, updated_at FROM public.pods WHERE user_id = $1`
	rows, err := d.pool.Query(context.Background(), query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pods []Pod
	for rows.Next() {
		var p Pod
		var dockerID *string
		if err := rows.Scan(&p.ID, &p.UserID, &p.TemplateID, &p.Name, &dockerID, &p.Status, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if dockerID != nil {
			p.DockerContainerID = *dockerID
		}
		pods = append(pods, p)
	}
	return pods, nil
}

func (d *Database) GetTemplateBySlug(slug string) (*Template, error) {
	query := `SELECT id, slug, name, description, docker_image, category, default_command, exposed_ports, created_at FROM public.templates WHERE slug = $1`
	var t Template
	if err := d.pool.QueryRow(context.Background(), query, slug).Scan(&t.ID, &t.Slug, &t.Name, &t.Description, &t.DockerImage, &t.Category, &t.DefaultCommand, &t.ExposedPorts, &t.CreatedAt); err != nil {
		return nil, err
	}
	return &t, nil
}

func (d *Database) GetPodByID(podID, userID string) (*Pod, error) {
	query := `SELECT id, user_id, template_id, name, docker_container_id, status, created_at, updated_at FROM public.pods WHERE id = $1 AND user_id = $2`
	var p Pod
	var dockerID *string
	if err := d.pool.QueryRow(context.Background(), query, podID, userID).Scan(&p.ID, &p.UserID, &p.TemplateID, &p.Name, &dockerID, &p.Status, &p.CreatedAt, &p.UpdatedAt); err != nil {
		return nil, err
	}
	if dockerID != nil {
		p.DockerContainerID = *dockerID
	}
	return &p, nil
}

func (d *Database) InsertPod(p *Pod) error {
	query := `INSERT INTO public.pods (user_id, template_id, name, docker_container_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`
	err := d.pool.QueryRow(context.Background(), query, p.UserID, p.TemplateID, p.Name, p.DockerContainerID, p.Status).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	return err
}

func (d *Database) UpdatePodStatus(podID string, status string) error {
	query := `UPDATE public.pods SET status = $1, updated_at = now() WHERE id = $2`
	_, err := d.pool.Exec(context.Background(), query, status, podID)
	return err
}

func (d *Database) UpdatePodContainerID(podID string, containerID string) error {
	query := `UPDATE public.pods SET docker_container_id = $1, updated_at = now() WHERE id = $2`
	_, err := d.pool.Exec(context.Background(), query, containerID, podID)
	return err
}

func (d *Database) DeletePod(podID string) error {
	query := `DELETE FROM public.pods WHERE id = $1`
	_, err := d.pool.Exec(context.Background(), query, podID)
	return err
}
