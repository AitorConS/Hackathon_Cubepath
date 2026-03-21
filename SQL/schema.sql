-- Supabase SQL Schema for CubePod

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Templates Table
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    docker_image TEXT NOT NULL,
    category TEXT,
    default_command TEXT,
    exposed_ports JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed some simple templates
INSERT INTO public.templates (slug, name, description, docker_image, category, default_command)
VALUES 
    ('ubuntu-shell', 'Ubuntu Shell', 'A basic Ubuntu 22.04 shell', 'ubuntu:22.04', 'os', 'sleep infinity'),
    ('node-dev', 'Node.js Dev', 'Node.js 20 environment', 'node:20', 'language', 'sleep infinity'),
    ('python-dev', 'Python Dev', 'Python 3.11 environment', 'python:3.11', 'language', 'sleep infinity'),
    ('nginx-demo', 'Nginx Demo', 'Nginx Alpine web server', 'nginx:alpine', 'web', 'nginx -g "daemon off;"')
ON CONFLICT (slug) DO NOTHING;

-- 2. Pods Table
CREATE TABLE public.pods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    docker_container_id TEXT UNIQUE,
    status TEXT DEFAULT 'creating' NOT NULL, -- creating, running, stopped, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) for pods
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

-- Users can only read their own pods
CREATE POLICY "Users can only view their own pods" 
ON public.pods FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own pods
CREATE POLICY "Users can insert their own pods" 
ON public.pods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pods
CREATE POLICY "Users can update their own pods" 
ON public.pods FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own pods
CREATE POLICY "Users can delete their own pods" 
ON public.pods FOR DELETE 
USING (auth.uid() = user_id);

-- Templates are readable by any authenticated user
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are viewable by authenticated users" 
ON public.templates FOR SELECT 
TO authenticated 
USING (true);
