// Tunnel DB CRUD methods - appended to the db package
package db

import "context"

func (d *Database) GetTunnelsByUser(userID string) ([]Tunnel, error) {
	query := `SELECT id, user_id, pod_id, port, public_url, status, created_at FROM public.tunnels WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := d.pool.Query(context.Background(), query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tunnels []Tunnel
	for rows.Next() {
		var t Tunnel
		var url *string
		if err := rows.Scan(&t.ID, &t.UserID, &t.PodID, &t.Port, &url, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		if url != nil {
			t.PublicURL = *url
		}
		tunnels = append(tunnels, t)
	}
	if tunnels == nil {
		tunnels = []Tunnel{}
	}
	return tunnels, nil
}

func (d *Database) InsertTunnel(t *Tunnel) error {
	query := `INSERT INTO public.tunnels (id, user_id, pod_id, port, public_url, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING created_at`
	return d.pool.QueryRow(context.Background(), query, t.ID, t.UserID, t.PodID, t.Port, t.PublicURL, t.Status).Scan(&t.CreatedAt)
}

func (d *Database) UpdateTunnelURL(tunnelID, publicURL, status string) error {
	query := `UPDATE public.tunnels SET public_url = $1, status = $2 WHERE id = $3`
	_, err := d.pool.Exec(context.Background(), query, publicURL, status, tunnelID)
	return err
}

func (d *Database) DeleteTunnel(tunnelID string) error {
	query := `DELETE FROM public.tunnels WHERE id = $1`
	_, err := d.pool.Exec(context.Background(), query, tunnelID)
	return err
}
