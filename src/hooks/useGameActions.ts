
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

      // Set up pending challenge with all the move data
      const pendingChallenge = {
        originalPlayerId: currentPlayer.id,
        placedTiles: placedTilesThisTurn,
        score: score,
        originalBoard: gameState.board, // Store the board state before the move
        drawnTiles: [] // Will be populated after drawing tiles
      };

      // Update the actual game board for all players
      await updateGameBoard(localBoard);

      // Update player score
      await updatePlayerScore(newScore);

      // Draw new tiles to replenish the rack
      const tilesUsed = placedTilesThisTurn.length;
      await drawTilesForPlayer(currentPlayer.id, tilesUsed);

      // Set the pending challenge in the game state
      await setPendingChallengeInGame(pendingChallenge);

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
        
        toast.success(`Challenge failed! All words are valid. You lose your next turn.`);
        
      } else {
        // Invalid words found - undo the move
        console.log('Challenge successful - invalid words found:', wordValidation.invalidWords);
        
        // Revert the board to the state before the move
        await updateGameBoard(challenge.originalBoard);
        
        // Return tiles to the challenged player's rack
        const restoredTiles = challenge.placedTiles.map(({ tile }) => 
          tile.isBlank ? { ...tile, chosenLetter: undefined, letter: '?' } : tile
        );
        const challengedPlayerTiles = [...challengedPlayer.tiles, ...restoredTiles];
        
        // Update the challenged player's tiles and score
        const { error: tilesError } = await supabase
          .from('game_players')
          .update({ tiles: challengedPlayerTiles as any })
          .eq('id', challengedPlayer.id);
          
        if (tilesError) {
          console.error('Error updating challenged player tiles:', tilesError);
          throw tilesError;
        }
        
        // Remove the score gained from the invalid move
        const revertedScore = challengedPlayer.score - challenge.score;
        await updateAnyPlayerScore(challengedPlayer.id, revertedScore);
        
        // Return the drawn tiles back to the tile bag
        // Note: This is simplified - in a real implementation you'd need to track which tiles were drawn
        
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
