
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
import { ChatMessage, Tile } from "@/types/game";

const Game = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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
    updateTileBag,
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
        console.log('Checking if room exists:', roomCode);
        
        // First, try to find existing room
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
          console.log('Room found:', existingGame);
          setRoomExists(true);
        } else {
          console.log('Room not found, creating new room:', roomCode);
          setIsCreatingRoom(true);
          
          // Create new game room
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

          console.log('Room created successfully:', newGame);
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
      console.log('Auto-joining game...');
      joinGame();
    }
  }, [roomExists, playerName, isConnected, isLoading, joinGame]);

  // Refresh player count periodically to ensure accurate count
  useEffect(() => {
    if (game?.id && !game.game_started) {
      const interval = setInterval(() => {
        console.log('Refreshing player count...');
        refreshGameState();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [game?.id, game?.game_started, refreshGameState]);

  const handleTilePlacement = (row: number, col: number, tile: Tile) => {
    // Create a copy of the current board
    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    newBoard[row][col] = tile;
    updateGameBoard(newBoard);
  };

  const handleTileDoubleClick = (row: number, col: number) => {
    // Remove tile from board if it exists
    if (gameState.board[row][col]) {
      const newBoard = gameState.board.map(boardRow => [...boardRow]);
      newBoard[row][col] = null;
      updateGameBoard(newBoard);
    }
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
    console.log('Starting game with', players.length, 'players');
    await startGame();
  };

  // Check if current player is the room creator (first player to join)
  const isRoomCreator = currentPlayer && players.length > 0 && 
    players.sort((a, b) => a.player_order - b.player_order)[0]?.id === currentPlayer.id;

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

  if (!isReady) {
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
                  Players in Room ({players.length})
                </p>
                <p className="text-sm text-gray-500">
                  Waiting for players to join...
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
                        {player.name === playerName && ' (You)'}
                        {index === 0 && ' (Creator)'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {player.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Room Status</span>
                  </div>
                  <p>
                    {players.length < 2 
                      ? `Need ${2 - players.length} more player${2 - players.length === 1 ? '' : 's'} to start` 
                      : 'Ready to start! Waiting for room creator to begin.'}
                  </p>
                </div>
              </div>

              {isRoomCreator && players.length >= 2 && !game?.game_started && (
                <Button onClick={handleStartGame} className="w-full bg-green-600 hover:bg-green-700">
                  <Crown className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              )}
              
              {!isRoomCreator && players.length >= 2 && (
                <div className="text-center text-sm text-gray-500">
                  Waiting for room creator to start the game...
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

  // Main game interface
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
