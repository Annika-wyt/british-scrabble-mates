
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatMessage, Tile } from "@/types/game";
import { useGameActions } from "@/hooks/useGameActions";
import WaitingRoom from "@/components/WaitingRoom";
import GameInterface from "@/components/GameInterface";
import GameError from "@/components/GameError";
import GameLoading from "@/components/GameLoading";
import BlankTileSelector from "@/components/BlankTileSelector";

const Game = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isBlankSelectorOpen, setIsBlankSelectorOpen] = useState(false);
  const [pendingBlankTile, setPendingBlankTile] = useState<Tile | null>(null);

  const {
    game,
    players,
    currentPlayer,
    gameState,
    isLoading,
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
    drawTilesForPlayer,
    setPendingChallengeInGame,
    clearPendingChallengeInGame,
    nextTurn,
    refreshGameState,
  } = useMultiplayerGame(roomCode || "", playerName);

  const {
    placedTilesThisTurn,
    localBoard,
    handleTilePlacement,
    handleTileDoubleClick,
    handleBlankTileRedefinition,
    handleShuffleTiles,
    handleSubmitWord,
    handleRetrieveTiles,
    handleChallenge
  } = useGameActions({
    currentPlayer,
    gameState,
    game,
    updateGameBoard,
    updatePlayerTiles,
    updatePlayerScore,
    updateAnyPlayerScore,
    updateTileBag,
    drawTilesForPlayer,
    setPendingChallengeInGame,
    clearPendingChallengeInGame,
    nextTurn,
    players
  });

  // Get player name from localStorage on mount
  useEffect(() => {
    const storedPlayerName = localStorage.getItem("playerName");
    if (storedPlayerName) {
      setPlayerName(storedPlayerName);
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Check if room exists and create if necessary
  useEffect(() => {
    const checkOrCreateRoom = async () => {
      if (!roomCode || !playerName) return;

      try {
        const { data: existingGame, error: selectError } = await supabase
          .from('games')
          .select('id, room_code, game_started')
          .eq('room_code', roomCode)
          .maybeSingle();

        if (selectError) {
          console.error('Error checking for existing room:', selectError);
          toast.error('Failed to check room status');
          return;
        }

        if (existingGame) {
          setRoomExists(true);
        } else {
          setIsCreatingRoom(true);
          
          const { data: newGame, error: insertError } = await supabase
            .from('games')
            .insert({
              room_code: roomCode,
              board: Array(15).fill(null).map(() => Array(15).fill(null)),
              current_player_index: 0,
              tile_bag: [],
              game_started: false,
              game_over: false,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating room:', insertError);
            toast.error('Failed to create room');
            setIsCreatingRoom(false);
            return;
          }

          setRoomExists(true);
          setIsCreatingRoom(false);
          toast.success(`Room ${roomCode} created successfully!`);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        toast.error('An unexpected error occurred');
        setIsCreatingRoom(false);
      }
    };

    checkOrCreateRoom();
  }, [roomCode, playerName]);

  // Auto-join game when room is ready
  useEffect(() => {
    if (roomExists && playerName && !isConnected && !isLoading) {
      joinGame();
    }
  }, [roomExists, playerName, isConnected, isLoading, joinGame]);

  // Refresh player count periodically to ensure accurate count
  useEffect(() => {
    if (game?.id && !game.game_started) {
      const interval = setInterval(() => {
        refreshGameState();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [game?.id, game?.game_started, refreshGameState]);

  const handleTileSelect = (tile: Tile) => {
    if (tile.isBlank) {
      setPendingBlankTile(tile);
      setIsBlankSelectorOpen(true);
    } else {
      setSelectedTile(tile);
    }
  };

  const handleBlankTileLetterSelect = (letter: string) => {
    if (pendingBlankTile) {
      handleBlankTileRedefinition(pendingBlankTile.id, letter);
    }
    setPendingBlankTile(null);
    setIsBlankSelectorOpen(false);
  };

  const handleSendMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: currentPlayer?.id || "",
      playerName: currentPlayer?.name || playerName,
      message,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleStartGame = async () => {
    if (players.length < 2) {
      toast.error('Need at least 2 players to start the game');
      return;
    }
    await startGame();
  };

  const isRoomCreator = () => {
    if (!currentPlayer || !players || players.length === 0) {
      return false;
    }

    const sortedPlayers = [...players].sort((a, b) => a.player_order - b.player_order);
    const roomCreator = sortedPlayers[0];
    
    return currentPlayer.id === roomCreator?.id;
  };

  const handleQuitGame = () => {
    if (window.confirm('Are you sure you want to quit the game?')) {
      navigate('/');
    }
  };

  const roomCreator = isRoomCreator();
  const shouldShowGameInterface = game?.game_started && players.length >= 2 && currentPlayer;
  const shouldShowWaitingRoom = !game?.game_started || players.length < 2;

  // Determine if the current player can challenge
  const canChallenge = !!(
    game?.pending_challenge && 
    !isCurrentTurn && 
    currentPlayer?.id !== game.pending_challenge.originalPlayerId
  );

  // Create gameState with local board for current player's view
  const displayGameState = {
    ...gameState,
    board: localBoard || gameState.board
  };

  if (!roomCode) {
    return (
      <GameError
        title="Invalid Room"
        message="No room code provided."
        onBack={() => navigate("/")}
      />
    );
  }

  if (!playerName) {
    return (
      <GameError
        title="No Player Name"
        message="Please go back and enter your name."
        onBack={() => navigate("/")}
      />
    );
  }

  if (isCreatingRoom) {
    return (
      <GameLoading
        title="Creating Room"
        message={`Setting up room ${roomCode}...`}
      />
    );
  }

  if (roomExists === false) {
    return (
      <GameError
        title="Room Not Found"
        message={`Room "${roomCode}" does not exist.`}
        onBack={() => navigate("/")}
      />
    );
  }

  if (isLoading || roomExists === null) {
    return (
      <GameLoading
        title="Loading Game"
        message={`Connecting to room ${roomCode}...`}
      />
    );
  }

  if (connectionError) {
    return (
      <GameError
        title="Connection Error"
        message={connectionError}
        onBack={() => navigate("/")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (shouldShowWaitingRoom) {
    return (
      <WaitingRoom
        roomCode={roomCode}
        players={players}
        playerName={playerName}
        isRoomCreator={roomCreator}
        gameStarted={game?.game_started || false}
        onStartGame={handleStartGame}
        onLeaveRoom={() => navigate("/")}
      />
    );
  }

  if (shouldShowGameInterface) {
    return (
      <>
        <GameInterface
          roomCode={roomCode}
          gameState={displayGameState}
          currentPlayer={currentPlayer}
          players={players}
          isCurrentTurn={isCurrentTurn}
          canChallenge={canChallenge}
          chatMessages={chatMessages}
          hasPlacedTiles={placedTilesThisTurn.length > 0}
          onTilePlacement={handleTilePlacement}
          onTileDoubleClick={handleTileDoubleClick}
          onTileSelect={handleTileSelect}
          onSendMessage={handleSendMessage}
          onShuffleTiles={handleShuffleTiles}
          onSubmitWord={handleSubmitWord}
          onRetrieveTiles={handleRetrieveTiles}
          onQuitGame={handleQuitGame}
          onChallenge={handleChallenge}
        />
        <BlankTileSelector
          isOpen={isBlankSelectorOpen}
          onClose={() => setIsBlankSelectorOpen(false)}
          onLetterSelect={handleBlankTileLetterSelect}
        />
      </>
    );
  }

  return null;
};

export default Game;
