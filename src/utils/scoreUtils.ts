
import { Tile } from "@/types/game";

export const calculateScore = (
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): number => {
  // Basic scoring implementation
  // In a real game, this would be much more complex, considering:
  // - Word multipliers
  // - Letter multipliers
  // - Bonus for using all 7 tiles
  // - Multiple words formed in one turn
  
  let totalScore = 0;
  
  placedTiles.forEach(({ tile }) => {
    totalScore += tile.value;
  });
  
  // Apply basic multipliers (simplified)
  if (placedTiles.length >= 5) {
    totalScore *= 1.5; // Bonus for longer words
  }
  
  if (placedTiles.length === 7) {
    totalScore += 50; // Bingo bonus
  }
  
  return Math.round(totalScore);
};

export const getSquareMultiplier = (row: number, col: number): { type: string; multiplier: number } => {
  // Center square
  if (row === 7 && col === 7) return { type: 'center', multiplier: 1 };
  
  // Triple word squares
  const tripleWordSquares = [
    [0, 0], [0, 7], [0, 14],
    [7, 0], [7, 14],
    [14, 0], [14, 7], [14, 14]
  ];
  
  if (tripleWordSquares.some(([r, c]) => r === row && c === col)) {
    return { type: 'triple-word', multiplier: 3 };
  }
  
  // Double word squares  
  const doubleWordSquares = [
    [1, 1], [1, 13], [2, 2], [2, 12], [3, 3], [3, 11],
    [4, 4], [4, 10], [10, 4], [10, 10], [11, 3], [11, 11],
    [12, 2], [12, 12], [13, 1], [13, 13]
  ];
  
  if (doubleWordSquares.some(([r, c]) => r === row && c === col)) {
    return { type: 'double-word', multiplier: 2 };
  }
  
  // Triple letter squares
  const tripleLetterSquares = [
    [1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13],
    [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]
  ];
  
  if (tripleLetterSquares.some(([r, c]) => r === row && c === col)) {
    return { type: 'triple-letter', multiplier: 3 };
  }
  
  // Double letter squares
  const doubleLetterSquares = [
    [0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14],
    [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11],
    [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14],
    [12, 6], [12, 8], [14, 3], [14, 11]
  ];
  
  if (doubleLetterSquares.some(([r, c]) => r === row && c === col)) {
    return { type: 'double-letter', multiplier: 2 };
  }
  
  return { type: 'normal', multiplier: 1 };
};
