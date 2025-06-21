import React, { useState } from "react";
import { toast } from "sonner";
import { Tile } from "@/types/game";
import { calculateScore } from "@/utils/scoreUtils";
import { validateAllWordsFormed, validateTilePlacement } from "@/utils/dictionaryUtils";
import { removePlayerTiles, restoreTilesToBag, resetBlankTiles } from "@/utils/tileManagementUtils";
import { supabase } from "@/integrations/supabase/client";

interface UseGameActionsProps {
  currentPlayer: any;
  gameState: any;
  game: any;
  updateGameBoard: (board: (Tile | null)[][]) => Promise<void>;
  updatePlayerTiles: (tiles: Tile[]) => Promise<void>;
  updatePlayerScore: (score: number) => Promise<void>;
  updateAnyPlayerScore: (playerId: string, score: number) => Promise<void>;
  updateTileBag: (tileBag: Tile[]) => Promise<void>;
  drawTilesForPlayer: (playerId: string, tilesUsed: number) => Promise<void>;
  setPendingChallengeInGame: (challenge: any) => Promise<void>;
  clearPendingChallengeInGame: () => Promise<void>;
  nextTurn: () => Promise<void>;
  players: any[];
}

export const useGameActions = ({
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
}: UseGameActionsProps) => {
  const [placedTilesThisTurn, setPlacedTilesThisTurn] = useState<{row: number, col: number, tile: Tile}[]>([]);
  const [localBoard, setLocalBoard] = useState<(Tile | null)[][]>(() => gameState.board);

  // Update local board when game state changes
  React.useEffect(() => {
    setLocalBoard(gameState.board);
  }, [gameState.board]);

  // Helper function to check if placed tiles connect to existing tiles on the board
  const isConnectedToExistingTiles = (placedTiles: {row: number, col: number, tile: Tile}[], currentBoard: (Tile | null)[][]): boolean => {
    console.log('=== CHECKING TILE CONNECTIONS ===');
    console.log('Placed tiles:', placedTiles);
    console.log('Current board state:', currentBoard);
    
    // Check if this is the first move by counting existing tiles on the board (excluding tiles placed this turn)
    let existingTileCount = 0;
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (currentBoard[row][col] !== null) {
          // Check if this position is one of the tiles being placed this turn
          const isPlacedThisTurn = placedTiles.some(p => p.row === row && p.col === col);
          if (!isPlacedThisTurn) {
            existingTileCount++;
          }
        }
      }
    }
    
    const isFirstMove = existingTileCount === 0;
    console.log('Existing tiles on board (excluding current placement):', existingTileCount);
    console.log('Is this the first move?', isFirstMove);
    
    if (isFirstMove) {
      // First turn: only requirement is that one of the placed tiles covers the center square
      const includesCenter = placedTiles.some(tile => tile.row === 7 && tile.col === 7);
      console.log('First move includes center?', includesCenter);
      console.log('=== END TILE CONNECTION CHECK (FIRST TURN) ===');
      return includesCenter;
    }

    // For subsequent moves, each newly placed tile must connect to at least one existing tile
    // (either directly or through other newly placed tiles that form valid words)
    
    // Check if all newly placed tiles connect to existing tiles on the board
    const allTilesConnected = placedTiles.every(placedTile => {
      const { row, col } = placedTile;
      console.log(`Checking connections for tile at (${row}, ${col})`);
      
      // Check all four adjacent positions
      const adjacentPositions = [
        { row: row - 1, col }, // Up
        { row: row + 1, col }, // Down
        { row, col: col - 1 }, // Left
        { row, col: col + 1 }  // Right
      ];

      // Check if directly adjacent to an existing tile (not placed this turn)
      for (const pos of adjacentPositions) {
        // Check bounds
        if (pos.row >= 0 && pos.row < 15 && pos.col >= 0 && pos.col < 15) {
          const hasExistingTile = currentBoard[pos.row][pos.col] !== null;
          const isPlacedThisTurn = placedTiles.some(p => p.row === pos.row && p.col === pos.col);
          
          console.log(`  Adjacent position (${pos.row}, ${pos.col}): hasExisting=${hasExistingTile}, placedThisTurn=${isPlacedThisTurn}`);
          
          if (hasExistingTile && !isPlacedThisTurn) {
            console.log(`  ✓ Tile at (${row}, ${col}) connects to existing tile at (${pos.row}, ${pos.col})`);
            return true;
          }
        }
      }
      
      console.log(`  ✗ Tile at (${row}, ${col}) does not connect to any existing tiles`);
      return false;
    });
    
    console.log('All tiles connected to existing tiles?', allTilesConnected);
    console.log('=== END TILE CONNECTION CHECK ===');
    return allTilesConnected;
  };

  const handleTilePlacement = (row: number, col: number, tile: Tile) => {
    // Update local board immediately for UI responsiveness
    const newBoard = localBoard.map((boardRow: any[]) => [...boardRow]);
    newBoard[row][col] = tile;
    setLocalBoard(newBoard);

    if (currentPlayer) {
      const updatedTiles = removePlayerTiles(currentPlayer.tiles, [tile]);
      updatePlayerTiles(updatedTiles);
    }

    setPlacedTilesThisTurn(prev => [...prev, { row, col, tile }]);
  };

  const handleTileDoubleClick = (row: number, col: number) => {
    // Check if this tile was placed this turn
    const wasPlacedThisTurn = placedTilesThisTurn.some(placed => placed.row === row && placed.col === col);
    
    if (wasPlacedThisTurn && currentPlayer) {
      const tileOnBoard = localBoard[row][col];
      if (tileOnBoard) {
        // Reset blank tile definition when retrieving
        const tileToReturn = tileOnBoard.isBlank ? 
          { ...tileOnBoard, chosenLetter: undefined, letter: '?' } : 
          tileOnBoard;

        // Update local board
        const newBoard = localBoard.map((boardRow: any[]) => [...boardRow]);
        newBoard[row][col] = null;
        setLocalBoard(newBoard);

        const updatedTiles = [...currentPlayer.tiles, tileToReturn];
        updatePlayerTiles(updatedTiles);

        setPlacedTilesThisTurn(prev => 
          prev.filter(placed => !(placed.row === row && placed.col === col))
        );
      }
    }
  };

  const handleBlankTileRedefinition = (tileId: string, newLetter: string) => {
    if (!currentPlayer) return;

    // Update tiles in player's rack
    const updatedRackTiles = currentPlayer.tiles.map((tile: Tile) => 
      tile.id === tileId && tile.isBlank ? 
        { ...tile, chosenLetter: newLetter, letter: newLetter } : 
        tile
    );
    updatePlayerTiles(updatedRackTiles);

    // Update any placed tiles on the board
    const updatedPlacedTiles = placedTilesThisTurn.map(placed => 
      placed.tile.id === tileId && placed.tile.isBlank ? 
        { ...placed, tile: { ...placed.tile, chosenLetter: newLetter, letter: newLetter } } :
        placed
    );
    setPlacedTilesThisTurn(updatedPlacedTiles);

    // Update local board if tile is placed
    const newBoard = localBoard.map((boardRow: any[]) => [...boardRow]);
    updatedPlacedTiles.forEach(({ row, col, tile }) => {
      if (tile.id === tileId && tile.isBlank) {
        newBoard[row][col] = tile;
      }
    });
    setLocalBoard(newBoard);
  };

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
      console.log('=== WORD SUBMISSION START ===');
      console.log('Player submitting:', currentPlayer.player_name || currentPlayer.name);
      console.log('Placed tiles:', placedTilesThisTurn);

      // Validate connection to existing tiles on the board using the CURRENT board state (localBoard)
      // This ensures we check against all tiles currently on the board, including previous moves
      if (!isConnectedToExistingTiles(placedTilesThisTurn, localBoard)) {
        toast.error('Each placed tile must connect to existing tiles on the board');
        return;
      }

      // Calculate score for the move
      const score = calculateScore(placedTilesThisTurn, localBoard);
      const newScore = currentPlayer.score + score;

      console.log('Score calculated:', score);
      console.log('New total score:', newScore);

      // Update the actual game board for all players
      await updateGameBoard(localBoard);

      // Update player score
      await updatePlayerScore(newScore);

      // Draw new tiles to replenish the rack and get the drawn tiles
      const tilesUsed = placedTilesThisTurn.length;
      const tilesToDraw = Math.min(tilesUsed, gameState.tileBag.length);
      const drawnTiles = gameState.tileBag.slice(0, tilesToDraw);
      
      console.log('Tiles drawn for challenge tracking:', drawnTiles);

      // Set up pending challenge with all the move data including the drawn tiles
      const pendingChallenge = {
        originalPlayerId: currentPlayer.id,
        placedTiles: placedTilesThisTurn,
        score: score,
        originalBoard: gameState.board, // Store the board state before the move
        originalTiles: currentPlayer.tiles, // Store the player's tiles before the move
        drawnTiles: drawnTiles // Store the actual tiles that were drawn
      };

      // Set the pending challenge in the game state BEFORE drawing tiles
      await setPendingChallengeInGame(pendingChallenge);

      // Now draw new tiles to replenish the rack
      await drawTilesForPlayer(currentPlayer.id, tilesUsed);

      // Clear placed tiles tracking
      setPlacedTilesThisTurn([]);
      
      // Advance turn to allow the opponent to challenge or continue
      await nextTurn();
      
      toast.success(`Word submitted! Score: +${score} points. Opponent can now challenge.`);
      
      console.log('=== WORD SUBMISSION SUCCESS ===');

    } catch (error) {
      console.error('Error submitting word:', error);
      toast.error('Failed to submit word');
    }
  };

  const handleRetrieveTiles = () => {
    if (placedTilesThisTurn.length === 0) return;

    // Update local board
    const newBoard = localBoard.map((boardRow: any[]) => [...boardRow]);
    const tilesToReturn: Tile[] = [];

    placedTilesThisTurn.forEach(({ row, col, tile }) => {
      newBoard[row][col] = null;
      // Reset blank tiles when retrieving
      const tileToReturn = tile.isBlank ? 
        { ...tile, chosenLetter: undefined, letter: '?' } : 
        tile;
      tilesToReturn.push(tileToReturn);
    });

    setLocalBoard(newBoard);

    if (currentPlayer) {
      const updatedTiles = [...currentPlayer.tiles, ...tilesToReturn];
      updatePlayerTiles(updatedTiles);
    }

    setPlacedTilesThisTurn([]);
    toast.success('Tiles retrieved successfully!');
  };

  const handleChallenge = async () => {
    if (!currentPlayer || !game?.pending_challenge) {
      toast.error('No move to challenge');
      return;
    }

    try {
      console.log('=== CHALLENGE START ===');
      console.log('Challenger:', currentPlayer.player_name || currentPlayer.name);
      
      const challenge = game.pending_challenge;
      const challengedPlayer = players.find(p => p.id === challenge.originalPlayerId);
      
      if (!challengedPlayer) {
        toast.error('Cannot find the challenged player');
        return;
      }

      // Validate all words formed by the challenged move
      const wordValidation = await validateAllWordsFormed(challenge.placedTiles, localBoard);
      
      console.log('Word validation result:', wordValidation);

      if (wordValidation.isValid) {
        // All words are valid - challenger loses next turn
        console.log('Challenge failed - all words are valid');
        
        // Clear the pending challenge
        await clearPendingChallengeInGame();
        
        // Advance turn again (challenger loses their turn)
        await nextTurn();
        
        toast.success(`Challenge failed: This word is valid. You lose your next turn.`);
        
      } else {
        // Invalid words found - undo the move
        console.log('Challenge successful - invalid words found:', wordValidation.invalidWords);
        
        // Revert the board to the state before the move
        await updateGameBoard(challenge.originalBoard);
        
        // Get the original placed tiles back (reset blank tiles if any)
        const restoredPlacedTiles = challenge.placedTiles.map(({ tile }) => 
          tile.isBlank ? { ...tile, chosenLetter: undefined, letter: '?' } : tile
        );
        
        // Return the drawn tiles to the tile bag using the tracked drawn tiles
        const drawnTiles = challenge.drawnTiles || [];
        console.log('Returning drawn tiles to bag:', drawnTiles);
        
        if (drawnTiles.length > 0) {
          const updatedTileBag = restoreTilesToBag(drawnTiles, gameState.tileBag);
          await updateTileBag(updatedTileBag);
        }
        
        // Set the challenged player's tiles to their original tiles plus the restored placed tiles
        const originalTiles = challenge.originalTiles || [];
        const finalTiles = [...originalTiles, ...restoredPlacedTiles];
        
        // Ensure exactly 7 tiles
        if (finalTiles.length !== 7) {
          console.warn(`Player should have 7 tiles but has ${finalTiles.length}`);
        }
        
        console.log('Final tiles for challenged player:', finalTiles);
        
        // Update the challenged player's tiles
        const { error: tilesError } = await supabase
          .from('game_players')
          .update({ tiles: finalTiles as any })
          .eq('id', challengedPlayer.id);
          
        if (tilesError) {
          console.error('Error updating challenged player tiles:', tilesError);
          throw tilesError;
        }
        
        // Remove the score gained from the invalid move
        const revertedScore = challengedPlayer.score - challenge.score;
        await updateAnyPlayerScore(challengedPlayer.id, revertedScore);
        
        // Clear the pending challenge
        await clearPendingChallengeInGame();
        
        // The challenged player loses their turn, so advance to the challenger
        // (Turn was already advanced after the original submission, so we don't need to advance again)
        
        toast.success(`Challenge successful! Invalid words: ${wordValidation.invalidWords.join(', ')}. Move has been undone.`);
      }
      
      console.log('=== CHALLENGE END ===');
      
    } catch (error) {
      console.error('Error processing challenge:', error);
      toast.error('Failed to process challenge');
    }
  };

  return {
    placedTilesThisTurn,
    localBoard,
    handleTilePlacement,
    handleTileDoubleClick,
    handleBlankTileRedefinition,
    handleShuffleTiles,
    handleSubmitWord,
    handleRetrieveTiles,
    handleChallenge
  };
};
