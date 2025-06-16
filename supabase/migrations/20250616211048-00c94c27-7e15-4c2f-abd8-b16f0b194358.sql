
-- First, let's check what policies currently exist and drop them safely
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Public can view games by room code" ON public.games;
DROP POLICY IF EXISTS "Players can view games they joined" ON public.games;

-- Now create the policies we need
-- Allow anyone to create games (needed for room creation)
CREATE POLICY "Anyone can create games" ON public.games
FOR INSERT WITH CHECK (true);

-- Allow public access to games by room code (needed for room validation)
CREATE POLICY "Public can view games by room code" ON public.games
FOR SELECT USING (true);

-- Create a policy for authenticated players to view games they joined
CREATE POLICY "Players can view games they joined" ON public.games
FOR SELECT USING (
  -- Allow if player has joined this game
  id IN (SELECT game_id FROM public.get_player_game_ids())
);
