
-- Add RLS policies for games table to allow players to see games they're part of
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Policy to allow players to view games they're participating in
CREATE POLICY "Players can view games they participate in" 
  ON public.games 
  FOR SELECT 
  USING (
    id IN (
      SELECT game_id 
      FROM public.game_players 
      WHERE player_name = current_setting('app.current_player_name', true)
    )
  );

-- Policy to allow players to update games they participate in
CREATE POLICY "Players can update games they participate in" 
  ON public.games 
  FOR UPDATE 
  USING (
    id IN (
      SELECT game_id 
      FROM public.game_players 
      WHERE player_name = current_setting('app.current_player_name', true)
    )
  );

-- Add RLS policies for game_players table
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

-- Policy to allow players to see all players in games they participate in
CREATE POLICY "Players can view other players in their games" 
  ON public.game_players 
  FOR SELECT 
  USING (
    game_id IN (
      SELECT game_id 
      FROM public.game_players 
      WHERE player_name = current_setting('app.current_player_name', true)
    )
  );

-- Policy to allow players to insert themselves into games
CREATE POLICY "Players can join games" 
  ON public.game_players 
  FOR INSERT 
  WITH CHECK (player_name = current_setting('app.current_player_name', true));

-- Policy to allow players to update their own player record
CREATE POLICY "Players can update their own record" 
  ON public.game_players 
  FOR UPDATE 
  USING (player_name = current_setting('app.current_player_name', true));

-- Policy to allow game creators to insert new games
CREATE POLICY "Anyone can create games" 
  ON public.games 
  FOR INSERT 
  WITH CHECK (true);
