
-- Drop all existing RLS policies that are causing infinite recursion
DROP POLICY IF EXISTS "Players can view games they participate in" ON public.games;
DROP POLICY IF EXISTS "Players can update games they participate in" ON public.games;
DROP POLICY IF EXISTS "Players can view other players in their games" ON public.game_players;
DROP POLICY IF EXISTS "Players can join games" ON public.game_players;
DROP POLICY IF EXISTS "Players can update their own record" ON public.game_players;
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;

-- Allow public access to games table for room validation and creation
CREATE POLICY "Public access to games" ON public.games
FOR ALL USING (true) WITH CHECK (true);

-- Allow public access to game_players for now to avoid recursion
CREATE POLICY "Public access to game_players" ON public.game_players
FOR ALL USING (true) WITH CHECK (true);
