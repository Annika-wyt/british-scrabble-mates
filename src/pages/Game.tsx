import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ArrowLeft, Crown } from "lucide-react";
import { toast } from "sonner";
import GameBoard from "@/components/GameBoard";
import GameSidebar from "@/components/GameSidebar";
import GameHeader from "@/components/GameHeader";
import PlayerRack from "@/components/PlayerRack";
import { ChatMessage, Tile } from "@/types/game";
import { drawNewTiles, removePlayerTiles } from "@/utils/tileManagementUtils";
import GameActions from "@/components/GameActions";
import { calculateScore } from "@/utils/scoreUtils";
import { validateAllWordsFormed } from "@/utils/dictionaryUtils";

const Game = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [placedTilesThisTurn, setPlacedTilesThisTurn] = useState<{row: number, col: number, tile: Tile}[]>([]);

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
    nextTurn,
    refreshGameState,
    setPendingChallengeInGame,
    clearPendingChallengeInGame,
  } = useMultiplayerGame(roomCode || "", playerName);

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

  const handleTilePlacement = (row: number, col: number, tile: Tile) => {
    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    newBoard[row][col] = tile;
    updateGameBoard(newBoard);

    if (currentPlayer) {
      const updatedTiles = removePlayerTiles(currentPlayer.tiles, [tile]);
      updatePlayerTiles(updatedTiles);
    }

    setPlacedTilesThisTurn(prev => [...prev, { row, col, tile }]);
  };

  const handleTileDoubleClick = (row: number, col: number) => {
    const tileOnBoard = gameState.board[row][col];
    if (tileOnBoard && currentPlayer) {
      const newBoard = gameState.board.map(boardRow => [...boardRow]);
      newBoard[row][col] = null;
      updateGameBoard(newBoard);

      const updatedTiles = [...currentPlayer.tiles, tileOnBoard];
      updatePlayerTiles(updatedTiles);

      setPlacedTilesThisTurn(prev => 
        prev.filter(placed => !(placed.row === row && placed.col === col))
      );
    }
  };

  const handleTileSelect = (tile: Tile) => {
    setSelectedTile(tile);
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

  const roomCreator = isRoomCreator();
  const shouldShowGameInterface = game?.game_started && players.length >= 2 && currentPlayer;
  const shouldShowWaitingRoom = !game?.game_started || players.length < 2;

  // Check if there's a pending challenge that can be acted upon
  const canChallenge = game?.pending_challenge && 
    game.pending_challenge.originalPlayerId !== currentPlayer?.id &&
    !game.pending_challenge.challengerId;

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Room</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">No room code provided.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!playerName) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">No Player Name</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Please go back and enter your name.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreatingRoom) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Setting up room {roomCode}...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roomExists === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Room Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Room "{roomCode}" does not exist.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || roomExists === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Connecting to room {roomCode}...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{connectionError}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (shouldShowWaitingRoom) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Waiting Room - {roomCode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  Players in Room ({players.length}/2 minimum)
                </p>
                <p className="text-sm text-gray-500">
                  {players.length < 2 
                    ? `Need ${2 - players.length} more player${2 - players.length === 1 ? '' : 's'} to start`
                    : 'Ready to start!'}
                </p>
              </div>
              
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                      <span className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="font-medium text-gray-800">
                        {player.name} 
                        {(player.name === playerName || player.player_name === playerName) && ' (You)'}
                        {index === 0 && ' (Creator)'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {player.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                ))}
              </div>

              {roomCreator && players.length >= 2 && !game?.game_started && (
                <Button onClick={handleStartGame} className="w-full bg-green-600 hover:bg-green-700">
                  <Crown className="w-4 h-4 mr-2" />
                  Start Game ({players.length} players)
                </Button>
              )}
              
              {!roomCreator && players.length >= 2 && !game?.game_started && (
                <div className="text-center text-sm text-gray-500 p-3 bg-yellow-50 rounded-lg">
                  Waiting for room creator to start the game...
                </div>
              )}

              {players.length < 2 && (
                <div className="text-center text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                  Share room code <strong>{roomCode}</strong> with friends to join!
                </div>
              )}

              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Leave Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleShuffleTiles = () => {
    if (!currentPlayer) return;
    
    const shuffledTiles = [...currentPlayer.tiles];
    for (let i = shuffledTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTiles[i], shuffledTiles[j]] = [shuffledTiles[j], shuffledTiles[i]];
    }
    
    updatePlayerTiles(shuffledTiles);
  };

  const handleSubmitWord = async () => {
    if (!currentPlayer || placedTilesThisTurn.length === 0) {
      toast.error('No tiles placed to submit');
      return;
    }

    try {
      // Calculate score for the move (no validation here)
      const score = calculateScore(placedTilesThisTurn, gameState.board);
      const newScore = currentPlayer.score + score;

      // Update player score
      await updatePlayerScore(newScore);

      // Draw new tiles to replenish the rack
      const tilesUsed = placedTilesThisTurn.length;
      await drawTilesForPlayer(currentPlayer.id, tilesUsed);

      // Create pending challenge data
      const pendingChallenge = {
        originalPlayerId: currentPlayer.id,
        placedTiles: placedTilesThisTurn,
        score: score
      };

      // Set pending challenge
      await setPendingChallengeInGame(pendingChallenge);

      // Clear placed tiles tracking
      setPlacedTilesThisTurn([]);
      
      toast.success(`Word submitted! Score: +${score} points. Drew ${tilesUsed} new tiles. Opponents can challenge within 30 seconds.`);
      
      // Auto-advance turn after challenge period (30 seconds)
      setTimeout(async () => {
        if (game?.pending_challenge?.originalPlayerId === currentPlayer.id) {
          await clearPendingChallengeInGame();
          await nextTurn();
          toast.info('Challenge period expired. Turn advanced.');
        }
      }, 30000);

    } catch (error) {
      console.error('Error submitting word:', error);
      toast.error('Failed to submit word');
    }
  };

  const handleRetrieveTiles = () => {
    if (placedTilesThisTurn.length === 0) return;

    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    const tilesToReturn: Tile[] = [];

    placedTilesThisTurn.forEach(({ row, col, tile }) => {
      newBoard[row][col] = null;
      tilesToReturn.push(tile);
    });

    updateGameBoard(newBoard);

    if (currentPlayer) {
      const updatedTiles = [...currentPlayer.tiles, ...tilesToReturn];
      updatePlayerTiles(updatedTiles);
    }

    setPlacedTilesThisTurn([]);
    toast.success('Tiles retrieved successfully!');
  };

  const handleChallenge = async () => {
    if (!game?.pending_challenge || !currentPlayer) return;

    try {
      const challenge = game.pending_challenge;
      
      // Validate the challenged words using CSW dictionary
      const validation = await validateAllWordsFormed(challenge.placedTiles, gameState.board);
      
      if (validation.isValid) {
        // Challenge failed - challenger loses turn, original player keeps their turn
        toast.error(`Challenge failed! All words are valid. You lose your turn.`);
        
        // Clear the challenge but don't advance turn - let the original player continue
        await clearPendingChallengeInGame();
        
        // Don't call nextTurn() here - the original player should retain their turn
        // The turn will advance naturally when they finish their move
      } else {
        // Challenge succeeded - original player loses points and turn
        toast.success(`Challenge succeeded! Invalid words: ${validation.invalidWords.join(', ')}`);
        
        // Find the original player and deduct points
        const originalPlayer = players.find(p => p.id === challenge.originalPlayerId);
        if (originalPlayer) {
          const newScore = Math.max(0, originalPlayer.score - challenge.score);
          await updateAnyPlayerScore(originalPlayer.id, newScore);
        }

        // Remove the placed tiles from the board
        const newBoard = gameState.board.map(boardRow => [...boardRow]);
        challenge.placedTiles.forEach(({ row, col }) => {
          newBoard[row][col] = null;
        });
        await updateGameBoard(newBoard);

        // Clear the challenge and advance turn normally
        await clearPendingChallengeInGame();
        await nextTurn();
      }
    } catch (error) {
      console.error('Error handling challenge:', error);
      toast.error('Failed to process challenge');
    }
  };

  const handleQuitGame = () => {
    if (window.confirm('Are you sure you want to quit the game?')) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <GameHeader
        roomCode={roomCode}
        currentPlayer={currentPlayer || { id: "", name: playerName, score: 0, tiles: [], isConnected: true }}
      />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <GameBoard
              board={gameState.board}
              onTilePlacement={handleTilePlacement}
              onTileDoubleClick={handleTileDoubleClick}
            />
            
            {currentPlayer && (
              <div className="mt-6">
                <PlayerRack
                  tiles={currentPlayer.tiles || []}
                  onTileSelect={handleTileSelect}
                />
              </div>
            )}

            <GameActions
              isCurrentTurn={isCurrentTurn}
              canChallenge={canChallenge || false}
              playerTiles={currentPlayer?.tiles || []}
              onShuffleTiles={handleShuffleTiles}
              onSubmitWord={handleSubmitWord}
              onRetrieveTiles={handleRetrieveTiles}
              onQuitGame={handleQuitGame}
              onChallenge={handleChallenge}
              hasPlacedTiles={placedTilesThisTurn.length > 0}
            />
          </div>
          <div className="lg:col-span-1">
            <GameSidebar
              players={gameState.players}
              chatMessages={chatMessages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
