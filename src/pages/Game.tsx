
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "@/components/GameBoard";
import PlayerRack from "@/components/PlayerRack";
import GameHeader from "@/components/GameHeader";
import GameSidebar from "@/components/GameSidebar";
import { useToast } from "@/hooks/use-toast";
import { GameState, Player, Tile } from "@/types/game";
import { generateInitialTiles, drawTiles } from "@/utils/tileUtils";
import { validateWord } from "@/utils/dictionaryUtils";
import { calculateScore } from "@/utils/scoreUtils";

const Game = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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
  const [placedTiles, setPlacedTiles] = useState<{row: number, col: number, tile: Tile}[]>([]);

  useEffect(() => {
    const playerName = localStorage.getItem("playerName");
    const storedRoomCode = localStorage.getItem("roomCode");

    if (!playerName || !storedRoomCode || storedRoomCode !== roomCode) {
      navigate("/");
      return;
    }

    // Initialize game
    const tileBag = generateInitialTiles();
    const player: Player = {
      id: "player1",
      name: playerName,
      score: 0,
      tiles: drawTiles(tileBag, 7),
      isConnected: true
    };

    setCurrentPlayer(player);
    setGameState(prev => ({
      ...prev,
      players: [player],
      tileBag: tileBag.slice(7),
      gameStarted: true
    }));

    toast({
      title: "Game Created",
      description: `Room ${roomCode} is ready! Share the code with your friend.`
    });
  }, [roomCode, navigate, toast]);

  const handleTilePlacement = (row: number, col: number, tile: Tile) => {
    if (gameState.board[row][col] !== null) return;

    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    newBoard[row][col] = tile;

    setGameState(prev => ({
      ...prev,
      board: newBoard
    }));

    setPlacedTiles(prev => [...prev, { row, col, tile }]);

    // Remove tile from player's rack
    if (currentPlayer) {
      const updatedTiles = currentPlayer.tiles.filter(t => t.id !== tile.id);
      setCurrentPlayer(prev => prev ? { ...prev, tiles: updatedTiles } : null);
    }
  };

  const handleTileReturn = (tile: Tile) => {
    if (!currentPlayer) return;

    const updatedTiles = [...currentPlayer.tiles, tile];
    setCurrentPlayer(prev => prev ? { ...prev, tiles: updatedTiles } : null);
  };

  const submitWord = async () => {
    if (placedTiles.length === 0) {
      toast({
        title: "No tiles placed",
        description: "Please place some tiles on the board first.",
        variant: "destructive"
      });
      return;
    }

    // Basic word validation (in real game, this would check against dictionary)
    const isValid = await validateWord("test"); // Placeholder
    
    if (isValid) {
      const score = calculateScore(placedTiles, gameState.board);
      
      if (currentPlayer) {
        // Draw new tiles to replace the ones used
        const newTiles = drawTiles([...gameState.tileBag], placedTiles.length);
        const remainingTileBag = gameState.tileBag.slice(placedTiles.length);
        
        const updatedPlayer = {
          ...currentPlayer,
          score: currentPlayer.score + score,
          tiles: [...currentPlayer.tiles, ...newTiles]
        };
        
        setCurrentPlayer(updatedPlayer);
        setGameState(prev => ({
          ...prev,
          tileBag: remainingTileBag
        }));
        setPlacedTiles([]);
        
        toast({
          title: "Word accepted!",
          description: `You scored ${score} points!`
        });
      }
    } else {
      // Return tiles to rack
      placedTiles.forEach(({ row, col, tile }) => {
        const newBoard = gameState.board.map(boardRow => [...boardRow]);
        newBoard[row][col] = null;
        
        setGameState(prev => ({
          ...prev,
          board: newBoard
        }));
        
        handleTileReturn(tile);
      });
      
      setPlacedTiles([]);
      
      toast({
        title: "Invalid word",
        description: "Please try a different word.",
        variant: "destructive"
      });
    }
  };

  const recallTiles = () => {
    placedTiles.forEach(({ row, col, tile }) => {
      const newBoard = gameState.board.map(boardRow => [...boardRow]);
      newBoard[row][col] = null;
      
      setGameState(prev => ({
        ...prev,
        board: newBoard
      }));
      
      handleTileReturn(tile);
    });
    
    setPlacedTiles([]);
    
    toast({
      title: "Tiles recalled",
      description: "All placed tiles have been returned to your rack."
    });
  };

  if (!currentPlayer) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <GameHeader roomCode={roomCode || ""} currentPlayer={currentPlayer} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <GameBoard
              board={gameState.board}
              onTilePlacement={handleTilePlacement}
            />
            
            <div className="mt-6">
              <PlayerRack
                tiles={currentPlayer.tiles}
                onTileSelect={() => {}}
              />
            </div>
            
            <div className="flex gap-4 mt-6 justify-center">
              <button
                onClick={submitWord}
                disabled={placedTiles.length === 0}
                className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg"
              >
                Submit Word ({placedTiles.length} tiles)
              </button>
              
              <button
                onClick={recallTiles}
                disabled={placedTiles.length === 0}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg"
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
