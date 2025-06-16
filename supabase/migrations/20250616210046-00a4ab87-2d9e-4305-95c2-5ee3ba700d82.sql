
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;
DROP POLICY IF EXISTS "Anyone can view game players" ON public.game_players;
DROP POLICY IF EXISTS "Anyone can create game players" ON public.game_players;
DROP POLICY IF EXISTS "Anyone can update game players" ON public.game_players;
DROP POLICY IF EXISTS "Anyone can view game moves" ON public.game_moves;
DROP POLICY IF EXISTS "Anyone can create game moves" ON public.game_moves;

-- Create secure policies for games table
CREATE POLICY "Players can view games they are part of" ON public.games
FOR SELECT USING (
  id IN (
    SELECT game_id FROM public.game_players 
    WHERE player_name = current_setting('app.current_player_name', true)
  )
);

CREATE POLICY "Anyone can create games" ON public.games
FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update games they are part of" ON public.games
FOR UPDATE USING (
  id IN (
    SELECT game_id FROM public.game_players 
    WHERE player_name = current_setting('app.current_player_name', true)
  )
);

-- Create secure policies for game_players table
CREATE POLICY "Players can view players in their games" ON public.game_players
FOR SELECT USING (
  game_id IN (
    SELECT game_id FROM public.game_players 
    WHERE player_name = current_setting('app.current_player_name', true)
  )
);

CREATE POLICY "Anyone can join games" ON public.game_players
FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their own data" ON public.game_players
FOR UPDATE USING (
  player_name = current_setting('app.current_player_name', true)
);

-- Create secure policies for game_moves table
CREATE POLICY "Players can view moves in their games" ON public.game_moves
FOR SELECT USING (
  game_id IN (
    SELECT game_id FROM public.game_players 
    WHERE player_name = current_setting('app.current_player_name', true)
  )
);

CREATE POLICY "Players can create moves in their games" ON public.game_moves
FOR INSERT WITH CHECK (
  game_id IN (
    SELECT game_id FROM public.game_players 
    WHERE player_name = current_setting('app.current_player_name', true)
  )
);

-- Add function to set player context
CREATE OR REPLACE FUNCTION public.set_player_context(player_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_player_name', player_name, true);
END;
$$;

-- Add data integrity constraints
ALTER TABLE public.games ADD CONSTRAINT valid_current_player_index 
CHECK (current_player_index >= 0);

ALTER TABLE public.game_players ADD CONSTRAINT valid_score 
CHECK (score >= 0);

ALTER TABLE public.game_players ADD CONSTRAINT valid_player_order 
CHECK (player_order >= 0);

-- Ensure room codes are always uppercase and valid format
ALTER TABLE public.games ADD CONSTRAINT valid_room_code 
CHECK (room_code ~ '^[A-Z0-9]{6}$');
