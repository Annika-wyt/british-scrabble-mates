
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
  const { toast } = useToast();

  const createOrJoinGame = useCallback(async () => {
    try {
      // First, try to find existing game
      const { data: existingGame } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      let game: DbGame;

      if (existingGame) {
        game = existingGame;
        setGameId(game.id);
      } else {
        // Create new game
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

        if (error) throw error;
        game = newGame;
        setGameId(game.id);
      }

      // Check if player already exists in this game
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .eq('player_name', playerName)
        .single();

      let player: DbPlayer;

      if (existingPlayer) {
        player = existingPlayer;
        // Update connection status
        await supabase
          .from('game_players')
          .update({ is_connected: true })
          .eq('id', player.id);
      } else {
        // Get current player count to determine order
        const { data: players } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', game.id);

        const playerOrder = players ? players.length : 0;
        
        // Draw initial tiles for new player
        const tileBagArray = Array.isArray(game.tile_bag) ? game.tile_bag as unknown as Tile[] : [];
        const playerTiles = drawTiles([...tileBagArray], 7);
        const remainingTiles = tileBagArray.slice(7);

        // Create new player
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

        if (error) throw error;
        player = newPlayer;

        // Update game's tile bag
        await supabase
          .from('games')
          .update({ tile_bag: remainingTiles as any })
          .eq('id', game.id);
      }

      setPlayerId(player.id);
      loadGameState();

    } catch (error) {
      console.error('Error creating/joining game:', error);
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
    }
  }, [roomCode, playerName, toast]);

  const loadGameState = useCallback(async () => {
    if (!gameId) return;

    try {
      // Load game data
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      // Load players
      const { data: players } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('player_order');

      if (game && players) {
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
        if (playerId) {
          const currentP = gameStatePlayers.find(p => p.id === playerId);
          if (currentP) {
            setCurrentPlayer(currentP);
          }
        }
      }
    } catch (error) {
      console.error('Error loading game state:', error);
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
        () => {
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
        () => {
          loadGameState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, loadGameState]);

  // Initialize game on mount
  useEffect(() => {
    if (roomCode && playerName) {
      createOrJoinGame();
    }
  }, [roomCode, playerName, createOrJoinGame]);

  return {
    gameState,
    currentPlayer,
    updateGameBoard,
    updatePlayerTiles,
    updatePlayerScore,
    isReady: !!gameId && !!playerId
  };
};
