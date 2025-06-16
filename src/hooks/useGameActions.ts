import { useState } from "react";
import { toast } from "sonner";
import { Tile } from "@/types/game";
import { calculateScore } from "@/utils/scoreUtils";
import { validateAllWordsFormed } from "@/utils/dictionaryUtils";
import { removePlayerTiles } from "@/utils/tileManagementUtils";

interface UseGameActionsProps {
  currentPlayer: any;
  gameState: any;
  game: any;
  updateGameBoard: (board: (Tile | null)[][]) => Promise<void>;
  updatePlayerTiles: (tiles: Tile[]) => Promise<void>;
  updatePlayerScore: (score: number) => Promise<void>;
  updateAnyPlayerScore: (playerId: string, score: number) => Promise<void>;
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
  drawTilesForPlayer,
  setPendingChallengeInGame,
  clearPendingChallengeInGame,
  nextTurn,
  players
}: UseGameActionsProps) => {
  const [placedTilesThisTurn, setPlacedTilesThisTurn] = useState<{row: number, col: number, tile: Tile}[]>([]);

  const handleTilePlacement = (row: number, col: number, tile: Tile) => {
    const newBoard = gameState.board.map((boardRow: any[]) => [...boardRow]);
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
      const newBoard = gameState.board.map((boardRow: any[]) => [...boardRow]);
      newBoard[row][col] = null;
      updateGameBoard(newBoard);

      const updatedTiles = [...currentPlayer.tiles, tileOnBoard];
      updatePlayerTiles(updatedTiles);

      setPlacedTilesThisTurn(prev => 
        prev.filter(placed => !(placed.row === row && placed.col === col))
      );
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

    const newBoard = gameState.board.map((boardRow: any[]) => [...boardRow]);
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
        const newBoard = gameState.board.map((boardRow: any[]) => [...boardRow]);
        challenge.placedTiles.forEach(({ row, col }: { row: number; col: number }) => {
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

  return {
    placedTilesThisTurn,
    handleTilePlacement,
    handleTileDoubleClick,
    handleShuffleTiles,
    handleSubmitWord,
    handleRetrieveTiles,
    handleChallenge
  };
};
