
-- Drop all existing SELECT policies on games table to avoid conflicts
DROP POLICY IF EXISTS "Public can view games by room code" ON public.games;
DROP POLICY IF EXISTS "Players can view games they joined" ON public.games;
DROP POLICY IF EXISTS "Players can view games they are part of" ON public.games;

-- Create a single comprehensive SELECT policy that allows both public room validation and player access
CREATE POLICY "Games access policy" ON public.games
FOR SELECT USING (
  -- Allow public access for room validation (anyone can check if a room exists)
  true
  OR
  -- Allow authenticated players to view games they joined
  id IN (SELECT game_id FROM public.get_player_game_ids())
);
