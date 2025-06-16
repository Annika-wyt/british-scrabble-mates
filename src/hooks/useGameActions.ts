import React, { useState } from "react";
import { toast } from "sonner";
import { Tile } from "@/types/game";
import { calculateScore } from "@/utils/scoreUtils";
import { validateAllWordsFormed, validateTilePlacement } from "@/utils/dictionaryUtils";
import { removePlayerTiles, restoreTilesToBag } from "@/utils/tileManagementUtils";
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

  // Helper function to check if a placement is adjacent to existing tiles
  const isAdjacentToExistingTiles = (placedTiles: {row: number, col: number, tile: Tile}[], board: (Tile | null)[][]): boolean => {
    // If this is the first move in the game, it must include the center square (7,7)
    const isCenterSquareEmpty = board[7][7] === null;
    if (isCenterSquareEmpty) {
      return placedTiles.some(tile => tile.row === 7 && tile.col === 7);
    }

    // For subsequent moves, at least one placed tile must be adjacent to an existing tile
    for (const placedTile of placedTiles) {
      const { row, col } = placedTile;
      
      // Check all four adjacent positions
      const adjacentPositions = [
        { row: row - 1, col }, // Up
        { row: row + 1, col }, // Down
        { row, col: col - 1 }, // Left
        { row, col: col + 1 }  // Right
      ];

      for (const pos of adjacentPositions) {
        // Check bounds
        if (pos.row >= 0 && pos.row < 15 && pos.col >= 0 && pos.col < 15) {
          // Check if there's an existing tile at this position
          if (board[pos.row][pos.col] !== null) {
            return true;
          }
        }
      }
    }

    return false;
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
        // Update local board
        const newBoard = localBoard.map((boardRow: any[]) => [...boardRow]);
        newBoard[row][col] = null;
        setLocalBoard(newBoard);

        const updatedTiles = [...currentPlayer.tiles, tileOnBoard];
        updatePlayerTiles(updatedTiles);

        setPlacedTilesThisTurn(prev => 
          prev.filter(placed => !(placed.row === row && placed.col === col))
        );
      }
    }
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

      // Validate tile placement (straight line, no gaps)
      const placementValidation = validateTilePlacement(placedTilesThisTurn);
      if (!placementValidation.isValid) {
        toast.error(placementValidation.error || 'Invalid tile placement');
        return;
      }

      // Validate adjacency to existing tiles
      if (!isAdjacentToExistingTiles(placedTilesThisTurn, gameState.board)) {
        toast.error('Word must be placed adjacent to existing tiles on the board');
        return;
      }

      // Calculate score for the move
      const score = calculateScore(placedTilesThisTurn, localBoard);
      const newScore = currentPlayer.score + score;

      console.log('Score calculated:', score);
      console.log('New total score:', newScore);

      // Now update the actual game board for all players
      await updateGameBoard(localBoard);

      // Update player score
      await updatePlayerScore(newScore);

      // Draw new tiles to replenish the rack
      const tilesUsed = placedTilesThisTurn.length;
      await drawTilesForPlayer(currentPlayer.id, tilesUsed);

      // Create pending challenge data - store the original tiles and drawn tiles info
      const pendingChallenge = {
        originalPlayerId: currentPlayer.id,
        placedTiles: placedTilesThisTurn,
        score: score,
        tilesUsed: tilesUsed // Store how many tiles were drawn
      };

      // Set pending challenge
      await setPendingChallengeInGame(pendingChallenge);

      // Clear placed tiles tracking
      setPlacedTilesThisTurn([]);
      
      toast.success(`Word submitted! Score: +${score} points. Drew ${tilesUsed} new tiles. Opponents can challenge within 20 seconds.`);
      
      console.log('=== WORD SUBMISSION SUCCESS ===');

      // Auto-advance turn and clear challenge after 20 seconds (only if no challenge is made)
      setTimeout(async () => {
        if (game?.pending_challenge?.originalPlayerId === currentPlayer.id) {
          await clearPendingChallengeInGame();
          await nextTurn();
          toast.info('Challenge period expired. Turn advanced.');
        }
      }, 20000);

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
      tilesToReturn.push(tile);
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
    if (!game?.pending_challenge || !currentPlayer) return;

    try {
      console.log('=== CHALLENGE START ===');
      console.log('Challenger:', currentPlayer.player_name || currentPlayer.name);
      console.log('Challenge data:', game.pending_challenge);

      const challenge = game.pending_challenge;
      
      // Validate the challenged words using CSW dictionary
      const validation = await validateAllWordsFormed(challenge.placedTiles, gameState.board);
      
      console.log('Challenge validation result:', validation);
      
      if (validation.isValid) {
        // Challenge failed - challenger loses turn, advance to next player
        toast.error(`Challenge failed! All words are valid. You lose your turn.`);
        
        // Clear the challenge and advance turn normally
        await clearPendingChallengeInGame();
        await nextTurn();
      } else {
        // Challenge succeeded - original player loses points and tiles are restored
        toast.success(`Challenge succeeded! Invalid words: ${validation.invalidWords.join(', ')}`);
        
        // Find the original player
        const originalPlayer = players.find(p => p.id === challenge.originalPlayerId);
        if (originalPlayer) {
          // Deduct points
          const newScore = Math.max(0, originalPlayer.score - challenge.score);
          await updateAnyPlayerScore(originalPlayer.id, newScore);

          // Restore the placed tiles to the original player's rack
          const tilesToRestore = challenge.placedTiles.map(pt => pt.tile);
          const updatedPlayerTiles = [...originalPlayer.tiles, ...tilesToRestore];
          
          // Remove the newly drawn tiles from the player's rack (last N tiles)
          const tilesWithoutNewlyDrawn = updatedPlayerTiles.slice(0, -challenge.tilesUsed);
          
          // Update the original player's tiles
          await supabase
            .from('game_players')
            .update({ tiles: tilesWithoutNewlyDrawn as any })
            .eq('id', originalPlayer.id);

          // Return the newly drawn tiles back to the tile bag
          const newlyDrawnTiles = updatedPlayerTiles.slice(-challenge.tilesUsed);
          const restoredTileBag = restoreTilesToBag(newlyDrawnTiles, game.tile_bag);
          await updateTileBag(restoredTileBag);
        }

        // Remove the placed tiles from the board
        const newBoard = gameState.board.map((boardRow: any[]) => [...boardRow]);
        challenge.placedTiles.forEach(({ row, col }: { row: number; col: number }) => {
          newBoard[row][col] = null;
        });
        await updateGameBoard(newBoard);

        // Clear the challenge and advance turn normally
        await clearPendingChallengeInGame();
        await nextTurn();
      }

      console.log('=== CHALLENGE END ===');
    } catch (error) {
      console.error('Error handling challenge:', error);
      toast.error('Failed to process challenge');
    }
  };

  return {
    placedTilesThisTurn,
    localBoard, // Return local board for display
    handleTilePlacement,
    handleTileDoubleClick,
    handleShuffleTiles,
    handleSubmitWord,
    handleRetrieveTiles,
    handleChallenge
  };
};
