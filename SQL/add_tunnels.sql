-- Migration: Add tunnels table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tunnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
    port INTEGER NOT NULL,
    public_url TEXT,
    status TEXT DEFAULT 'starting' NOT NULL, -- starting, active, stopped, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: users can only manage their own tunnels
ALTER TABLE public.tunnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tunnels"
ON public.tunnels
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
