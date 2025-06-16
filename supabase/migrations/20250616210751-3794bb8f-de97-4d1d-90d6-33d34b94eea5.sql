
-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Players can view games they are part of" ON public.games;
DROP POLICY IF EXISTS "Players can update games they are part of" ON public.games;
DROP POLICY IF EXISTS "Players can view players in their games" ON public.game_players;
DROP POLICY IF EXISTS "Players can update their own data" ON public.game_players;
DROP POLICY IF EXISTS "Players can view moves in their games" ON public.game_moves;
DROP POLICY IF EXISTS "Players can create moves in their games" ON public.game_moves;

-- Create a security definer function to get player's game IDs without recursion
CREATE OR REPLACE FUNCTION public.get_player_game_ids()
RETURNS TABLE(game_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT gp.game_id
  FROM public.game_players gp
  WHERE gp.player_name = current_setting('app.current_player_name', true);
$$;

-- Create safer policies for games table
CREATE POLICY "Players can view games they are part of" ON public.games
FOR SELECT USING (
  id IN (SELECT game_id FROM public.get_player_game_ids())
);

CREATE POLICY "Players can update games they are part of" ON public.games
FOR UPDATE USING (
  id IN (SELECT game_id FROM public.get_player_game_ids())
);

-- Create safer policies for game_players table
CREATE POLICY "Players can view players in their games" ON public.game_players
FOR SELECT USING (
  game_id IN (SELECT game_id FROM public.get_player_game_ids())
);

CREATE POLICY "Players can update their own data" ON public.game_players
FOR UPDATE USING (
  player_name = current_setting('app.current_player_name', true)
);

-- Create safer policies for game_moves table
CREATE POLICY "Players can view moves in their games" ON public.game_moves
FOR SELECT USING (
  game_id IN (SELECT game_id FROM public.get_player_game_ids())
);

CREATE POLICY "Players can create moves in their games" ON public.game_moves
FOR INSERT WITH CHECK (
  game_id IN (SELECT game_id FROM public.get_player_game_ids())
);
