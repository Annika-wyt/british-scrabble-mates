import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "@/components/GameBoard";
import PlayerRack from "@/components/PlayerRack";
import GameHeader from "@/components/GameHeader";
import GameSidebar from "@/components/GameSidebar";
import BlankTileSelector from "@/components/BlankTileSelector";
import { useToast } from "@/hooks/use-toast";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Tile, PendingChallenge } from "@/types/game";
import { validateWord } from "@/utils/dictionaryUtils";
import { calculateScore } from "@/utils/scoreUtils";
import { validateWordPlacement } from "@/utils/wordValidationUtils";
import { drawNewTiles, restoreTilesToBag } from "@/utils/tileManagementUtils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, Shuffle } from "lucide-react";

const Game = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [playerName, setPlayerName] = useState<string>("");
  const [placedTiles, setPlacedTiles] = useState<{row: number, col: number, tile: Tile}[]>([]);
  const [blankTileSelector, setBlankTileSelector] = useState<{
    isOpen: boolean;
    tileId: string | null;
    position: { row: number; col: number } | null;
  }>({
    isOpen: false,
    tileId: null,
    position: null
  });

  const {
    gameState,
    currentPlayer,
    pendingChallenge,
    updateGameBoard,
    updatePlayerTiles,
    updatePlayerScore,
    updateTileBag,
    nextTurn,
    refreshGameState,
    setPendingChallengeInGame,
    clearPendingChallengeInGame,
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

    // Check if this is a blank tile
    if (tile.isBlank && !tile.chosenLetter) {
      setBlankTileSelector({
        isOpen: true,
        tileId: tile.id,
        position: { row, col }
      });
      return;
    }

    console.log('Placing tile:', { row, col, tile: tile.letter, tileId: tile.id });

    // Add to placed tiles for tracking
    const newPlacedTiles = [...placedTiles, { row, col, tile }];
    setPlacedTiles(newPlacedTiles);

    // Update board immediately for local state
    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    newBoard[row][col] = tile;
    
    // Update board in database and refresh state
    await updateGameBoard(newBoard);

    // Remove tile from player's rack
    if (currentPlayer) {
      const updatedTiles = currentPlayer.tiles.filter(t => t.id !== tile.id);
      console.log('Updated player tiles:', updatedTiles.length, 'tiles remaining');
      await updatePlayerTiles(updatedTiles);
    }

    // Refresh game state to ensure UI is updated
    await refreshGameState();
  };

  const handleBlankTileLetterSelect = async (letter: string) => {
    if (!blankTileSelector.tileId || !blankTileSelector.position || !currentPlayer) {
      setBlankTileSelector({ isOpen: false, tileId: null, position: null });
      return;
    }

    const { row, col } = blankTileSelector.position;
    
    // Find the tile in player's rack
    const tileIndex = currentPlayer.tiles.findIndex(t => t.id === blankTileSelector.tileId);
    if (tileIndex === -1) {
      setBlankTileSelector({ isOpen: false, tileId: null, position: null });
      return;
    }

    // Create updated tile with chosen letter
    const updatedTile = {
      ...currentPlayer.tiles[tileIndex],
      chosenLetter: letter,
      letter: letter // Display the chosen letter
    };

    // Place the tile
    const newPlacedTiles = [...placedTiles, { row, col, tile: updatedTile }];
    setPlacedTiles(newPlacedTiles);

    // Update board
    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    newBoard[row][col] = updatedTile;
    await updateGameBoard(newBoard);

    // Remove tile from player's rack
    const updatedPlayerTiles = currentPlayer.tiles.filter(t => t.id !== blankTileSelector.tileId);
    await updatePlayerTiles(updatedPlayerTiles);

    // Close selector and refresh
    setBlankTileSelector({ isOpen: false, tileId: null, position: null });
    await refreshGameState();
  };

  // Allow players to redefine blank tiles before submitting
  const handleTileDoubleClick = (row: number, col: number) => {
    if (!isMyTurn()) return;

    // Check if this tile was placed in current turn and is a blank tile
    const placedTile = placedTiles.find(pt => pt.row === row && pt.col === col);
    if (placedTile && placedTile.tile.isBlank) {
      // Remove from board and placed tiles, return to rack for redefinition
      const newBoard = gameState.board.map(boardRow => [...boardRow]);
      newBoard[row][col] = null;
      updateGameBoard(newBoard);

      const newPlacedTiles = placedTiles.filter(pt => !(pt.row === row && pt.col === col));
      setPlacedTiles(newPlacedTiles);

      // Reset the tile and return to rack
      const originalTile = {
        ...placedTile.tile,
        chosenLetter: undefined,
        letter: '?'
      };

      if (currentPlayer) {
        const updatedTiles = [...currentPlayer.tiles, originalTile];
        updatePlayerTiles(updatedTiles);
      }

      refreshGameState();
      
      toast({
        title: "Blank tile recalled",
        description: "You can now redefine this blank tile."
      });
    }
  };

  const handleTileReturn = async (tile: Tile) => {
    if (!currentPlayer) return;

    console.log('Returning tile to rack:', { letter: tile.letter, id: tile.id });
    const updatedTiles = [...currentPlayer.tiles, tile];
    await updatePlayerTiles(updatedTiles);
    
    // Refresh game state to ensure UI is updated
    await refreshGameState();
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

    // Validate word placement (connection and alignment)
    const validationResult = validateWordPlacement(placedTiles, gameState.board);
    if (!validationResult.isValid) {
      toast({
        title: "Invalid word placement",
        description: validationResult.reason,
        variant: "destructive"
      });
      return;
    }

    console.log('Submitting word with tiles:', placedTiles);

    // Calculate score for the placed tiles
    const score = calculateScore(placedTiles, gameState.board);
    
    if (currentPlayer) {
      const newScore = currentPlayer.score + score;
      await updatePlayerScore(newScore);
      
      // Draw new tiles to replace the ones used
      const { newTiles, remainingBag } = drawNewTiles(
        gameState.tileBag, 
        currentPlayer.tiles, 
        placedTiles.length
      );
      
      // Update player tiles and tile bag
      await updatePlayerTiles(newTiles);
      await updateTileBag(remainingBag);
      
      // Set up pending challenge state in database for all players
      await setPendingChallengeInGame({
        originalPlayerId: currentPlayer.id,
        placedTiles: [...placedTiles],
        score,
        drawnTiles: newTiles.slice(-placedTiles.length) // Store the newly drawn tiles
      });
      
      // Clear placed tiles and move to next player
      setPlacedTiles([]);
      await nextTurn();
      
      // Refresh game state to ensure board updates for all players
      await refreshGameState();
      
      toast({
        title: "Word submitted!",
        description: `You scored ${score} points! Other players can now challenge this word.`
      });
    }
  };

  const challengeWord = async () => {
    if (!pendingChallenge || !currentPlayer) return;

    // Extract word from placed tiles (simplified - in real game would be more complex)
    const word = pendingChallenge.placedTiles.map(t => t.tile.letter).join('');
    
    console.log('Challenging word:', word);
    
    const isValid = await validateWord(word);
    
    if (isValid) {
      // Valid word - challenger loses their turn, move to next player
      await clearPendingChallengeInGame();
      await nextTurn(); // Challenger loses turn, move to next player
      
      toast({
        title: "Challenge failed",
        description: `The word "${word}" is valid. You lose your turn.`,
        variant: "destructive"
      });
    } else {
      // Invalid word - challenger keeps their turn, original player loses score and tiles
      const originalPlayer = gameState.players.find(p => p.id === pendingChallenge.originalPlayerId);
      
      if (originalPlayer) {
        // Remove score from original player
        const newScore = originalPlayer.score - pendingChallenge.score;
        
        // Update the original player's score by finding them in current players
        const originalPlayerInCurrentGame = gameState.players.find(p => p.id === pendingChallenge.originalPlayerId);
        if (originalPlayerInCurrentGame) {
          // Note: This will update the score for the original player, not the current challenger
          // We need to update the correct player's score in the database
          await updatePlayerScore(newScore);
        }
        
        // Remove tiles from board
        const newBoard = gameState.board.map(boardRow => [...boardRow]);
        for (const { row, col } of pendingChallenge.placedTiles) {
          newBoard[row][col] = null;
        }
        await updateGameBoard(newBoard);
        
        // Return the newly drawn tiles to the tile bag and remove them from player's rack
        if (pendingChallenge.drawnTiles && pendingChallenge.drawnTiles.length > 0) {
          const restoredBag = restoreTilesToBag(pendingChallenge.drawnTiles, gameState.tileBag);
          await updateTileBag(restoredBag);
          
          // Remove the drawn tiles from the original player's rack
          const updatedPlayerTiles = originalPlayer.tiles.filter(tile => 
            !pendingChallenge.drawnTiles!.some(drawnTile => drawnTile.id === tile.id)
          );
          
          // Add back the tiles that were placed on the board
          const tilesToReturn = pendingChallenge.placedTiles.map(({ tile }) => tile);
          const finalPlayerTiles = [...updatedPlayerTiles, ...tilesToReturn];
          
          await updatePlayerTiles(finalPlayerTiles);
        }
        
        toast({
          title: "Challenge successful",
          description: `The word "${word}" is invalid. You keep your turn, and the original player's tiles are returned.`
        });
      }
      
      await clearPendingChallengeInGame();
      // Challenger keeps their turn - no nextTurn() call
    }
    
    await refreshGameState();
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

    if (placedTiles.length === 0) {
      toast({
        title: "No tiles to recall",
        description: "You haven't placed any tiles yet.",
        variant: "destructive"
      });
      return;
    }

    console.log('Recalling tiles:', placedTiles);
    
    // Store the tiles to recall before clearing the state
    const tilesToRecall = [...placedTiles];
    
    // Clear placed tiles immediately to prevent issues with real-time updates
    setPlacedTiles([]);
    
    // Create a new board with all placed tiles removed
    const newBoard = gameState.board.map(boardRow => [...boardRow]);
    
    // Remove all placed tiles from the board
    for (const { row, col } of tilesToRecall) {
      newBoard[row][col] = null;
    }
    
    // Update the board once with all tiles removed
    await updateGameBoard(newBoard);
    
    // Return all tiles to player's rack in one batch
    if (currentPlayer) {
      const tilesToReturn = tilesToRecall.map(({ tile }) => tile);
      const updatedTiles = [...currentPlayer.tiles, ...tilesToReturn];
      console.log('Returning tiles to rack:', tilesToReturn.map(t => t.letter).join(', '));
      await updatePlayerTiles(updatedTiles);
    }
    
    // Refresh game state once at the end
    await refreshGameState();
    
    toast({
      title: "Tiles recalled",
      description: `All ${tilesToRecall.length} placed tiles have been returned to your rack.`
    });
  };

  const shuffleTiles = async () => {
    if (!currentPlayer) return;

    // Shuffle the player's tiles
    const shuffledTiles = [...currentPlayer.tiles].sort(() => Math.random() - 0.5);
    await updatePlayerTiles(shuffledTiles);
    await refreshGameState();
    
    toast({
      title: "Tiles shuffled",
      description: "Your tiles have been shuffled."
    });
  };

  const quitGame = () => {
    localStorage.removeItem("playerName");
    localStorage.removeItem("roomCode");
    navigate("/");
    
    toast({
      title: "Game left",
      description: "You have left the game."
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

            {/* Challenge notification - only show to other players, not the one who submitted */}
            {pendingChallenge && currentPlayer && pendingChallenge.originalPlayerId !== currentPlayer.id && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl shadow-lg p-4">
                <div className="text-center">
                  <p className="text-orange-700 font-semibold text-lg mb-3">
                    A word has been played! You can challenge it if you think it's invalid.
                  </p>
                  <Button
                    onClick={challengeWord}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Challenge Word
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <GameBoard
                board={gameState.board}
                onTilePlacement={handleTilePlacement}
                onTileDoubleClick={handleTileDoubleClick}
              />
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Tiles</h3>
              <PlayerRack
                tiles={currentPlayer?.tiles || []}
                onTileSelect={() => {}}
              />
            </div>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={submitWord}
                disabled={placedTiles.length === 0 || !isMyTurn()}
                className="px-8 py-3"
              >
                Submit Word ({placedTiles.length} tiles)
              </Button>
              
              <Button
                onClick={recallTiles}
                disabled={placedTiles.length === 0 || !isMyTurn()}
                variant="outline"
                className="px-8 py-3"
              >
                Recall Tiles
              </Button>

              <Button
                onClick={shuffleTiles}
                disabled={!currentPlayer?.tiles.length}
                variant="outline"
                className="px-6 py-3"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Shuffle
              </Button>

              <Button
                onClick={quitGame}
                variant="destructive"
                className="px-6 py-3"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Quit Game
              </Button>
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

      <BlankTileSelector
        isOpen={blankTileSelector.isOpen}
        onClose={() => setBlankTileSelector({ isOpen: false, tileId: null, position: null })}
        onLetterSelect={handleBlankTileLetterSelect}
      />
    </div>
  );
};

export default Game;
