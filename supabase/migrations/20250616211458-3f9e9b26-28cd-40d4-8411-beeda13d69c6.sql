
-- First, let's check and fix the INSERT policy for games table
-- Drop any existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;

-- Create a clear INSERT policy that allows anyone to create games
CREATE POLICY "Allow game creation" ON public.games
FOR INSERT WITH CHECK (true);

-- Also ensure we have the right UPDATE policy for the creator
DROP POLICY IF EXISTS "Players can update games they are part of" ON public.games;

-- Create UPDATE policy that allows updates for games the player is part of
CREATE POLICY "Players can update their games" ON public.games
FOR UPDATE USING (
  id IN (SELECT game_id FROM public.get_player_game_ids())
);
