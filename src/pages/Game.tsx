import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ArrowLeft } from "lucide-react";
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
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Waiting Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Welcome to room <span className="font-mono font-bold">{roomCode}</span>!
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Waiting for other players to join...
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Players in room:</p>
              <ul className="text-sm text-gray-600">
                {players.map((player, index) => (
                  <li key={player.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {player.name} {player.name === playerName && '(You)'}
                  </li>
                ))}
              </ul>
            </div>
            {players.length >= 2 && !game?.game_started && (
              <Button onClick={startGame} className="w-full mt-4">
                Start Game
              </Button>
            )}
            {players.length < 2 && (
              <p className="text-sm text-gray-500 mt-4">
                Need at least 2 players to start the game.
              </p>
            )}
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
