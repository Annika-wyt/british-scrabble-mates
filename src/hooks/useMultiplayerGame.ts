import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GameState, Player, Tile } from "@/types/game";
import { generateInitialTiles, drawTiles } from "@/utils/tileUtils";
import { Database } from "@/integrations/supabase/types";

type DbGame = Database['public']['Tables']['games']['Row'];
type DbPlayer = Database['public']['Tables']['game_players']['Row'];

export const useMultiplayerGame = (roomCode: string, playerName: string) => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    players: [],
    currentPlayerIndex: 0,
    tileBag: [],
    gameStarted: false,
    gameOver: false,
    chatMessages: []
  });
  
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();

  const createOrJoinGame = useCallback(async () => {
    console.log('Starting createOrJoinGame with:', { roomCode, playerName });
    setIsLoading(true);
    setConnectionError(null);

    try {
      // First, try to find existing game
      console.log('Searching for existing game with room code:', roomCode);
      const { data: existingGame, error: findError } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (findError) {
        console.error('Error finding existing game:', findError);
        throw findError;
      }

      let game: DbGame;

      if (existingGame) {
        console.log('Found existing game:', existingGame.id);
        game = existingGame;
        setGameId(game.id);
      } else {
        // Create new game
        console.log('Creating new game with room code:', roomCode);
        const tileBag = generateInitialTiles();
        const { data: newGame, error } = await supabase
          .from('games')
          .insert({
            room_code: roomCode,
            board: Array(15).fill(null).map(() => Array(15).fill(null)) as any,
            tile_bag: tileBag as any,
            current_player_index: 0,
            game_started: false
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating new game:', error);
          throw error;
        }
        
        console.log('Created new game:', newGame.id);
        game = newGame;
        setGameId(game.id);
      }

      // Check if player already exists in this game
      console.log('Checking if player exists:', { gameId: game.id, playerName });
      const { data: existingPlayer, error: playerFindError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .eq('player_name', playerName)
        .maybeSingle();

      if (playerFindError) {
        console.error('Error finding existing player:', playerFindError);
        throw playerFindError;
      }

      let player: DbPlayer;

      if (existingPlayer) {
        console.log('Found existing player:', existingPlayer.id);
        player = existingPlayer;
        // Update connection status
        const { error: updateError } = await supabase
          .from('game_players')
          .update({ is_connected: true })
          .eq('id', player.id);

        if (updateError) {
          console.error('Error updating player connection:', updateError);
          throw updateError;
        }
      } else {
        // Get current player count to determine order
        console.log('Getting current players for game:', game.id);
        const { data: players, error: playersError } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', game.id);

        if (playersError) {
          console.error('Error getting players:', playersError);
          throw playersError;
        }

        const playerOrder = players ? players.length : 0;
        console.log('Player order will be:', playerOrder);
        
        // Draw initial tiles for new player
        const tileBagArray = Array.isArray(game.tile_bag) ? game.tile_bag as unknown as Tile[] : [];
        const playerTiles = drawTiles([...tileBagArray], 7);
        const remainingTiles = tileBagArray.slice(7);

        // Create new player
        console.log('Creating new player');
        const { data: newPlayer, error } = await supabase
          .from('game_players')
          .insert({
            game_id: game.id,
            player_name: playerName,
            tiles: playerTiles as any,
            player_order: playerOrder,
            score: 0,
            is_connected: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating new player:', error);
          throw error;
        }

        console.log('Created new player:', newPlayer.id);
        player = newPlayer;

        // Update game's tile bag
        const { error: updateTilesError } = await supabase
          .from('games')
          .update({ tile_bag: remainingTiles as any })
          .eq('id', game.id);

        if (updateTilesError) {
          console.error('Error updating tile bag:', updateTilesError);
          throw updateTilesError;
        }
      }

      console.log('Setting player ID:', player.id);
      setPlayerId(player.id);
      
      console.log('Loading initial game state');
      await loadGameState(game.id, player.id);

      setIsLoading(false);
      console.log('Game setup complete');

    } catch (error) {
      console.error('Error in createOrJoinGame:', error);
      setIsLoading(false);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to game');
      toast({
        title: "Connection Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
    }
  }, [roomCode, playerName, toast]);

  const loadGameState = useCallback(async (gameIdParam?: string, playerIdParam?: string) => {
    const currentGameId = gameIdParam || gameId;
    const currentPlayerId = playerIdParam || playerId;
    
    if (!currentGameId) {
      console.log('No game ID available for loading state');
      return;
    }

    try {
      console.log('Loading game state for game:', currentGameId);
      
      // Load game data
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', currentGameId)
        .single();

      if (gameError) {
        console.error('Error loading game:', gameError);
        throw gameError;
      }

      // Load players
      const { data: players, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', currentGameId)
        .order('player_order');

      if (playersError) {
        console.error('Error loading players:', playersError);
        throw playersError;
      }

      if (game && players) {
        console.log('Loaded game data:', { game: game.id, players: players.length });
        
        const gameStatePlayers: Player[] = players.map(p => ({
          id: p.id,
          name: p.player_name,
          score: p.score,
          tiles: Array.isArray(p.tiles) ? p.tiles as unknown as Tile[] : [],
          isConnected: p.is_connected
        }));

        setGameState({
          board: Array.isArray(game.board) ? game.board as unknown as (Tile | null)[][] : Array(15).fill(null).map(() => Array(15).fill(null)),
          players: gameStatePlayers,
          currentPlayerIndex: game.current_player_index,
          tileBag: Array.isArray(game.tile_bag) ? game.tile_bag as unknown as Tile[] : [],
          gameStarted: game.game_started,
          gameOver: game.game_over,
          chatMessages: []
        });

        // Set current player
        if (currentPlayerId) {
          const currentP = gameStatePlayers.find(p => p.id === currentPlayerId);
          if (currentP) {
            console.log('Set current player:', currentP.name);
            setCurrentPlayer(currentP);
          }
        }
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      setConnectionError('Failed to load game state');
    }
  }, [gameId, playerId]);

  const updateGameBoard = useCallback(async (newBoard: (Tile | null)[][]) => {
    if (!gameId) return;

    try {
      await supabase
        .from('games')
        .update({ 
          board: newBoard as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);
    } catch (error) {
      console.error('Error updating board:', error);
    }
  }, [gameId]);

  const updatePlayerTiles = useCallback(async (tiles: Tile[]) => {
    if (!playerId) return;

    try {
      await supabase
        .from('game_players')
        .update({ tiles: tiles as any })
        .eq('id', playerId);
    } catch (error) {
      console.error('Error updating player tiles:', error);
    }
  }, [playerId]);

  const updatePlayerScore = useCallback(async (score: number) => {
    if (!playerId) return;

    try {
      await supabase
        .from('game_players')
        .update({ score })
        .eq('id', playerId);
    } catch (error) {
      console.error('Error updating player score:', error);
    }
  }, [playerId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!gameId) return;

    console.log('Setting up real-time subscriptions for game:', gameId);

    const gameChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('Game table change detected:', payload);
          loadGameState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Players table change detected:', payload);
          loadGameState();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, loadGameState]);

  // Initialize game on mount
  useEffect(() => {
    if (roomCode && playerName && !isLoading && !gameId) {
      console.log('Initializing game connection');
      createOrJoinGame();
    }
  }, [roomCode, playerName, createOrJoinGame, isLoading, gameId]);

  return {
    gameState,
    currentPlayer,
    updateGameBoard,
    updatePlayerTiles,
    updatePlayerScore,
    isReady: !!gameId && !!playerId && !isLoading,
    isLoading,
    connectionError
  };
};
