-- Fix Bun template with correct Docker image
UPDATE public.templates 
SET docker_image = 'oven/bun:1-debian',
    default_command = 'sleep infinity'
WHERE slug = 'bun-dev' OR name = 'Bun Dev' OR docker_image LIKE '%bun%';

-- If the template doesn't exist, insert it
INSERT INTO public.templates (slug, name, description, docker_image, category, default_command)
VALUES ('bun-dev', 'Bun Dev', 'Bun JavaScript runtime environment', 'oven/bun:1-debian', 'language', 'sleep infinity')
ON CONFLICT (slug) DO UPDATE SET 
    docker_image = 'oven/bun:1-debian',
    default_command = 'sleep infinity';
