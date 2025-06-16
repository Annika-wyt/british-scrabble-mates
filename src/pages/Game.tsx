
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "@/components/GameBoard";
import PlayerRack from "@/components/PlayerRack";
import GameHeader from "@/components/GameHeader";
import GameSidebar from "@/components/GameSidebar";
import { useToast } from "@/hooks/use-toast";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Tile } from "@/types/game";
import { validateWord } from "@/utils/dictionaryUtils";
import { calculateScore } from "@/utils/scoreUtils";

const Game = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [playerName, setPlayerName] = useState<string>("");
  const [placedTiles, setPlacedTiles] = useState<{row: number, col: number, tile: Tile}[]>([]);

  const {
    gameState,
    currentPlayer,
    updateGameBoard,
    updatePlayerTiles,
    updatePlayerScore,
    nextTurn,
    isReady,
    isLoading,
    connectionError
  } = useMultiplayerGame(roomCode || "", playerName);

  useEffect(() => {
    const storedPlayerName = localStorage.getItem("playerName");
    const storedRoomCode = localStorage.getItem("roomCode");

    if (!storedPlayerName || !storedRoomCode || storedRoomCode !== roomCode) {
      navigate("/");
      return;
    }

    setPlayerName(storedPlayerName);
  }, [roomCode, navigate]);

  // Check if it's current player's turn
  const isMyTurn = () => {
    if (!currentPlayer || !gameState.players.length) return false;
    const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentTurnPlayer?.id === currentPlayer.id;
  };

  const handleTilePlacement = async (row: number, col: number, tile: Tile) => {
    if (!isMyTurn()) {
      toast({
        title: "Not your turn",
        description: "Please wait for your turn to place tiles.",
        variant: "destructive"
      });
      return;
    }

    if (gameState.board[row][col] !== null) {
      console.log('Square already occupied, cannot place tile');
      return;
    }

    console.log('Placing tile:', { row, col, tile: tile.letter, tileId: tile.id });

    // Add to placed tiles for tracking
    const newPlacedTiles = [...placedTiles, { row, col, tile }];
    setPlacedTiles(newPlacedTiles);

    // Update board immediately for local state
    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    newBoard[row][col] = tile;
    
    // Update board in database
    await updateGameBoard(newBoard);

    // Remove tile from player's rack
    if (currentPlayer) {
      const updatedTiles = currentPlayer.tiles.filter(t => t.id !== tile.id);
      console.log('Updated player tiles:', updatedTiles.length, 'tiles remaining');
      await updatePlayerTiles(updatedTiles);
    }
  };

  const handleTileReturn = async (tile: Tile) => {
    if (!currentPlayer) return;

    console.log('Returning tile to rack:', { letter: tile.letter, id: tile.id });
    const updatedTiles = [...currentPlayer.tiles, tile];
    await updatePlayerTiles(updatedTiles);
  };

  const submitWord = async () => {
    if (!isMyTurn()) {
      toast({
        title: "Not your turn",
        description: "Please wait for your turn to submit a word.",
        variant: "destructive"
      });
      return;
    }

    if (placedTiles.length === 0) {
      toast({
        title: "No tiles placed",
        description: "Please place some tiles on the board first.",
        variant: "destructive"
      });
      return;
    }

    console.log('Submitting word with tiles:', placedTiles);

    // Basic word validation (in real game, this would check against dictionary)
    const isValid = await validateWord("test"); // Placeholder
    
    if (isValid) {
      const score = calculateScore(placedTiles, gameState.board);
      
      if (currentPlayer) {
        const newScore = currentPlayer.score + score;
        await updatePlayerScore(newScore);
        
        // Clear placed tiles and move to next player
        setPlacedTiles([]);
        await nextTurn();
        
        toast({
          title: "Word accepted!",
          description: `You scored ${score} points! It's now the next player's turn.`
        });
      }
    } else {
      // Return tiles to rack
      for (const { row, col, tile } of placedTiles) {
        const newBoard = gameState.board.map(boardRow => [...boardRow]);
        newBoard[row][col] = null;
        await updateGameBoard(newBoard);
        await handleTileReturn(tile);
      }
      
      setPlacedTiles([]);
      
      toast({
        title: "Invalid word",
        description: "Please try a different word.",
        variant: "destructive"
      });
    }
  };

  const recallTiles = async () => {
    if (!isMyTurn()) {
      toast({
        title: "Not your turn",
        description: "Please wait for your turn to recall tiles.",
        variant: "destructive"
      });
      return;
    }

    console.log('Recalling tiles:', placedTiles);
    
    // Process each placed tile
    for (const { row, col, tile } of placedTiles) {
      // Remove from board
      const newBoard = gameState.board.map(boardRow => [...boardRow]);
      newBoard[row][col] = null;
      await updateGameBoard(newBoard);
      
      // Return to player's rack
      await handleTileReturn(tile);
    }
    
    setPlacedTiles([]);
    
    toast({
      title: "Tiles recalled",
      description: "All placed tiles have been returned to your rack."
    });
  };

  // Show connection error if there is one
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Failed</h2>
          <p className="text-gray-600 mb-4">{connectionError}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !isReady || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to game...</p>
          <p className="text-sm text-gray-500 mt-2">Room: {roomCode}</p>
          <p className="text-sm text-gray-500">Player: {playerName}</p>
          <p className="text-sm text-gray-500">Players in game: {gameState.players.length}</p>
        </div>
      </div>
    );
  }

  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <GameHeader roomCode={roomCode || ""} currentPlayer={currentPlayer} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Turn indicator */}
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="text-center">
                {isMyTurn() ? (
                  <p className="text-green-600 font-semibold text-lg">
                    🎯 Your turn! Place your tiles and submit a word.
                  </p>
                ) : (
                  <p className="text-gray-600 font-semibold text-lg">
                    ⏳ {currentTurnPlayer?.name || 'Unknown'}'s turn. Please wait...
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <GameBoard
                board={gameState.board}
                onTilePlacement={handleTilePlacement}
              />
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Tiles</h3>
              <PlayerRack
                tiles={currentPlayer.tiles}
                onTileSelect={() => {}}
              />
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={submitWord}
                disabled={placedTiles.length === 0 || !isMyTurn()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors shadow-lg"
              >
                Submit Word ({placedTiles.length} tiles)
              </button>
              
              <button
                onClick={recallTiles}
                disabled={placedTiles.length === 0 || !isMyTurn()}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors shadow-lg"
              >
                Recall Tiles
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <GameSidebar
              players={gameState.players}
              chatMessages={gameState.chatMessages}
              onSendMessage={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
