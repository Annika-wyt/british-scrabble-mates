import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Game, GamePlayer, Tile, PendingChallenge, GameState, Player } from '@/types/game';
import { generateInitialTiles } from '@/utils/tileUtils';

export const useMultiplayerGame = (roomCode: string, playerName: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    players: [],
    currentPlayerIndex: 0,
    tileBag: [],
    gameStarted: false,
    gameOver: false,
    chatMessages: []
  });
  const queryClient = useQueryClient();

  // Fetch game data
  const { data: game, isLoading: gameLoading, error: gameError } = useQuery({
    queryKey: ['game', roomCode],
    queryFn: async () => {
      console.log('Fetching game data for room:', roomCode);
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching game:', error);
        throw error;
      }
      
      if (!data) {
        console.log('No game found for room code:', roomCode);
        return null;
      }
      
      console.log('Game data fetched successfully:', data);
      
      // Convert the database data to our Game type with proper type casting
      return {
        ...data,
        board: (data.board as unknown) as (Tile | null)[][],
        tile_bag: (data.tile_bag as unknown) as Tile[],
        pending_challenge: data.pending_challenge ? (data.pending_challenge as unknown) as PendingChallenge : null
      } as Game;
    },
    enabled: !!roomCode,
    retry: 1,
    refetchInterval: 3000, // Refetch every 3 seconds as fallback
  });

  // Fetch players data
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', game?.id],
    queryFn: async () => {
      if (!game?.id) {
        console.log('No game ID available for fetching players');
        return [];
      }
      
      console.log('Fetching players for game:', game.id);
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .order('player_order');
      
      if (error) {
        console.error('Error fetching players:', error);
        throw error;
      }
      
      console.log('Players fetched successfully:', data);
      
      // Convert database data to GamePlayer type with proper type casting and computed properties
      return data.map(player => ({
        ...player,
        tiles: (player.tiles as unknown) as Tile[],
        // Add computed properties for compatibility
        name: player.player_name,
        isConnected: player.is_connected
      })) as GamePlayer[];
    },
    enabled: !!game?.id,
    retry: 1,
    refetchInterval: 2000, // Refetch every 2 seconds as fallback
  });

  // Handle errors
  useEffect(() => {
    if (gameError) {
      console.error('Game query error:', gameError);
      setConnectionError('Failed to load game data');
    }
  }, [gameError]);

  // Update gameState when data changes
  useEffect(() => {
    if (game && players) {
      console.log('Updating game state with players:', players.map(p => ({
        id: p.id,
        name: p.player_name,
        order: p.player_order
      })));

      const mappedPlayers: Player[] = players.map(p => ({
        id: p.id,
        name: p.player_name,
        score: p.score,
        tiles: p.tiles,
        isConnected: p.is_connected
      }));

      setGameState({
        board: game.board,
        players: mappedPlayers,
        currentPlayerIndex: game.current_player_index,
        tileBag: game.tile_bag,
        gameStarted: game.game_started,
        gameOver: game.game_over,
        chatMessages: []
      });
    }
  }, [game, players]);

  // Enhanced current player detection
  const getCurrentPlayer = useCallback(() => {
    if (!players || !playerName) {
      return null;
    }

    // Try to find by player_name first, then by name
    let foundPlayer = players.find(p => p.player_name === playerName);
    if (!foundPlayer) {
      foundPlayer = players.find(p => p.name === playerName);
    }

    if (foundPlayer) {
      // Convert to Player type for consistency
      const playerResult = {
        id: foundPlayer.id,
        name: foundPlayer.player_name,
        score: foundPlayer.score,
        tiles: foundPlayer.tiles,
        isConnected: foundPlayer.is_connected,
        // Keep original properties for compatibility
        player_name: foundPlayer.player_name
      };
      return playerResult;
    }

    return null;
  }, [players, playerName]);

  // Join game function
  const joinGame = useCallback(async () => {
    if (!game || !playerName) {
      console.log('Cannot join game - missing game or player name');
      return;
    }

    try {
      console.log('Attempting to join game:', game.id, 'as player:', playerName);
      
      // Check if player already exists
      const existingPlayer = players?.find(p => p.player_name === playerName);
      
      if (!existingPlayer) {
        const playerOrder = players?.length || 0;
        console.log('Creating new player with order:', playerOrder);
        
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

        if (error) {
          console.error('Error creating player:', error);
          throw error;
        }
        
        console.log('Player created successfully');
        toast.success(`Joined game ${roomCode}`);
      } else {
        console.log('Player already exists, updating connection status');
        // Update connection status
        const { error } = await supabase
          .from('game_players')
          .update({ is_connected: true })
          .eq('id', existingPlayer.id);

        if (error) {
          console.error('Error updating player connection:', error);
          throw error;
        }
        
        console.log('Player connection updated');
      }

      setIsConnected(true);
      setConnectionError(null);
      // Force immediate refresh of players data
      queryClient.invalidateQueries({ queryKey: ['players', game.id] });
      queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game');
      setConnectionError('Failed to join game');
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
          tile_bag: tiles as any,
          board: Array(15).fill(null).map(() => Array(15).fill(null)) as any,
        })
        .eq('id', game.id);

      if (gameError) throw gameError;

      // Update all players with their tiles
      for (const player of updatedPlayers) {
        const { error } = await supabase
          .from('game_players')
          .update({ tiles: player.tiles as any })
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

  // Game action functions
  const updateGameBoard = useCallback(async (newBoard: (Tile | null)[][]) => {
    if (!game) return;
    
    const { error } = await supabase
      .from('games')
      .update({ board: newBoard as any })
      .eq('id', game.id);
    
    if (error) {
      console.error('Error updating board:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
  }, [game, roomCode, queryClient]);

  const updatePlayerTiles = useCallback(async (newTiles: Tile[]) => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    const { error } = await supabase
      .from('game_players')
      .update({ tiles: newTiles as any })
      .eq('id', currentPlayer.id);
    
    if (error) {
      console.error('Error updating player tiles:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['players', game?.id] });
  }, [getCurrentPlayer, game?.id, queryClient]);

  const updatePlayerScore = useCallback(async (newScore: number) => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    const { error } = await supabase
      .from('game_players')
      .update({ score: newScore })
      .eq('id', currentPlayer.id);
    
    if (error) {
      console.error('Error updating player score:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['players', game?.id] });
  }, [getCurrentPlayer, game?.id, queryClient]);

  // New function to update any player's score (for challenges)
  const updateAnyPlayerScore = useCallback(async (playerId: string, newScore: number) => {
    const { error } = await supabase
      .from('game_players')
      .update({ score: newScore })
      .eq('id', playerId);
    
    if (error) {
      console.error('Error updating player score:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['players', game?.id] });
  }, [game?.id, queryClient]);

  const updateTileBag = useCallback(async (newTileBag: Tile[]) => {
    if (!game) return;
    
    const { error } = await supabase
      .from('games')
      .update({ tile_bag: newTileBag as any })
      .eq('id', game.id);
    
    if (error) {
      console.error('Error updating tile bag:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
  }, [game, roomCode, queryClient]);

  const nextTurn = useCallback(async () => {
    if (!game || !players) return;
    
    const nextPlayerIndex = (game.current_player_index + 1) % players.length;
    
    const { error } = await supabase
      .from('games')
      .update({ current_player_index: nextPlayerIndex })
      .eq('id', game.id);
    
    if (error) {
      console.error('Error updating turn:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
  }, [game, players, roomCode, queryClient]);

  const setPendingChallengeInGame = useCallback(async (challenge: PendingChallenge) => {
    if (!game) return;
    
    const { error } = await supabase
      .from('games')
      .update({ pending_challenge: challenge as any })
      .eq('id', game.id);
    
    if (error) {
      console.error('Error setting pending challenge:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
  }, [game, roomCode, queryClient]);

  const clearPendingChallengeInGame = useCallback(async () => {
    if (!game) return;
    
    const { error } = await supabase
      .from('games')
      .update({ pending_challenge: null })
      .eq('id', game.id);
    
    if (error) {
      console.error('Error clearing pending challenge:', error);
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
  }, [game, roomCode, queryClient]);

  const refreshGameState = useCallback(async () => {
    console.log('Refreshing game state...');
    queryClient.invalidateQueries({ queryKey: ['game', roomCode] });
    queryClient.invalidateQueries({ queryKey: ['players', game?.id] });
  }, [queryClient, roomCode, game?.id]);

  // Enhanced real-time subscriptions with better error handling
  useEffect(() => {
    if (!game?.id || !playerName) return;

    console.log('Setting up real-time subscriptions for game:', game.id);

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
        (payload) => {
          console.log('Real-time game update:', payload);
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
        (payload) => {
          console.log('Real-time players update:', payload);
          queryClient.invalidateQueries({ queryKey: ['players', game.id] });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
        }
      });

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(gameChannel);
    };
  }, [game?.id, roomCode, queryClient, playerName]);

  // Use the enhanced getCurrentPlayer function
  const currentPlayer = getCurrentPlayer();
  const isCurrentTurn = game && currentPlayer && 
    players?.[game.current_player_index]?.player_name === (currentPlayer.player_name || currentPlayer.name);
  const pendingChallenge = game?.pending_challenge;
  const isReady = !!game && !!players && !!currentPlayer;

  return {
    game,
    players: players || [],
    currentPlayer,
    gameState,
    pendingChallenge,
    isLoading: gameLoading || playersLoading,
    isConnected,
    isCurrentTurn,
    isReady,
    connectionError,
    joinGame,
    startGame,
    updateGameBoard,
    updatePlayerTiles,
    updatePlayerScore,
    updateAnyPlayerScore,
    updateTileBag,
    nextTurn,
    refreshGameState,
    setPendingChallengeInGame,
    clearPendingChallengeInGame,
  };
};
