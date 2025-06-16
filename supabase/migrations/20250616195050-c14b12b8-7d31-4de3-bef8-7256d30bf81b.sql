
-- Add pending_challenge column to the games table
ALTER TABLE public.games 
ADD COLUMN pending_challenge jsonb DEFAULT NULL;
