
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Game, GamePlayer, Tile } from '@/types/game';
import { generateInitialTiles } from '@/utils/tileUtils';

export const useMultiplayerGame = (roomCode: string, playerName: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Set player context for RLS
  useEffect(() => {
    const setPlayerContext = async () => {
      if (playerName) {
        const { error } = await supabase.rpc('set_player_context', { 
          player_name: playerName 
        });
        if (error) {
          console.error('Error setting player context:', error);
        }
      }
    };
    setPlayerContext();
  }, [playerName]);

  // Fetch game data
  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', roomCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .single();
      
      if (error) throw error;
      return data as Game;
    },
    enabled: !!roomCode,
  });

  // Fetch players data
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', game?.id],
    queryFn: async () => {
      if (!game?.id) return [];
      
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .order('player_order');
      
      if (error) throw error;
      return data as GamePlayer[];
    },
    enabled: !!game?.id,
  });

  // Join game function
  const joinGame = useCallback(async () => {
    if (!game || !playerName) return;

    try {
      // Check if player already exists
      const existingPlayer = players?.find(p => p.player_name === playerName);
      
      if (!existingPlayer) {
        const playerOrder = players?.length || 0;
        
        const { error } = await supabase
          .from('game_players')
          .insert({
            game_id: game.id,
            player_name: playerName,
            player_order: playerOrder,
            tiles: [],
            score: 0,
            is_connected: true,
          });

        if (error) throw error;
        
        toast.success(`Joined game ${roomCode}`);
      } else {
        // Update connection status
        const { error } = await supabase
          .from('game_players')
          .update({ is_connected: true })
          .eq('id', existingPlayer.id);

        if (error) throw error;
      }

      setIsConnected(true);
      queryClient.invalidateQueries({ queryKey: ['players', game.id] });
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game');
    }
  }, [game, playerName, players, roomCode, queryClient]);

  // Start game function
  const startGame = useCallback(async () => {
    if (!game || !players || players.length < 2) return;

    try {
      const tiles = generateInitialTiles();
      const tilesPerPlayer = 7;
      
      // Distribute tiles to players
      const updatedPlayers = players.map((player, index) => {
        const playerTiles = tiles.splice(0, tilesPerPlayer);
        return {
          ...player,
          tiles: playerTiles,
        };
      });

      // Update game state
      const { error: gameError } = await supabase
        .from('games')
        .update({
          game_started: true,
          tile_bag: tiles,
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
        })
        .eq('id', game.id);

      if (gameError) throw gameError;

      // Update all players with their tiles
      for (const player of updatedPlayers) {
        const { error } = await supabase
          .from('game_players')
          .update({ tiles: player.tiles })
          .eq('id', player.id);

        if (error) throw error;
      }

      toast.success('Game started!');
      queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
      queryClient.invalidateQueries({ queryKey: ['players', game.id] });
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game');
    }
  }, [game, players, roomCode, queryClient]);

  // Real-time subscriptions
  useEffect(() => {
    if (!game?.id) return;

    const gameChannel = supabase
      .channel(`game_${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['players', game.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [game?.id, roomCode, queryClient]);

  const currentPlayer = players?.find(p => p.player_name === playerName);
  const isCurrentTurn = game && currentPlayer && 
    players?.[game.current_player_index]?.player_name === playerName;

  return {
    game,
    players,
    currentPlayer,
    isLoading: gameLoading || playersLoading,
    isConnected,
    isCurrentTurn,
    joinGame,
    startGame,
  };
};
