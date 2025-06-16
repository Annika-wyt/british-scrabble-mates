
import { Tile } from "@/types/game";

export const calculateScore = (
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): number => {
  if (placedTiles.length === 0) return 0;

  let totalScore = 0;
  let wordMultiplier = 1;
  
  // Calculate main word score
  const mainWordScore = calculateMainWordScore(placedTiles, board);
  totalScore += mainWordScore.score;
  wordMultiplier *= mainWordScore.wordMultiplier;
  
  // Calculate cross word scores (perpendicular words formed)
  const crossWordScores = calculateCrossWordScores(placedTiles, board);
  totalScore += crossWordScores;
  
  // Apply word multiplier to main word
  totalScore = (totalScore - mainWordScore.score) + (mainWordScore.score * wordMultiplier);
  
  // Bonus for using all 7 tiles (Bingo)
  if (placedTiles.length === 7) {
    totalScore += 50;
  }
  
  return totalScore;
};

const calculateMainWordScore = (
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): { score: number; wordMultiplier: number } => {
  if (placedTiles.length === 0) return { score: 0, wordMultiplier: 1 };
  
  // Sort tiles to form the main word
  const sortedTiles = [...placedTiles].sort((a, b) => {
    if (a.row === b.row) return a.col - b.col;
    return a.row - b.row;
  });
  
  const isHorizontal = sortedTiles.every(t => t.row === sortedTiles[0].row);
  
  let wordScore = 0;
  let wordMultiplier = 1;
  
  if (isHorizontal) {
    // Horizontal word
    const row = sortedTiles[0].row;
    const startCol = sortedTiles[0].col;
    const endCol = sortedTiles[sortedTiles.length - 1].col;
    
    // Find the actual start of the word (including existing tiles)
    let actualStartCol = startCol;
    while (actualStartCol > 0 && board[row][actualStartCol - 1] !== null) {
      actualStartCol--;
    }
    
    // Find the actual end of the word
    let actualEndCol = endCol;
    while (actualEndCol < 14 && board[row][actualEndCol + 1] !== null) {
      actualEndCol++;
    }
    
    // Calculate score for the entire word
    for (let col = actualStartCol; col <= actualEndCol; col++) {
      const tile = board[row][col];
      const placedTile = placedTiles.find(t => t.row === row && t.col === col);
      
      if (tile) {
        let tileScore = tile.isBlank ? 0 : tile.value;
        
        // Apply letter multiplier only if this is a newly placed tile
        if (placedTile) {
          const square = getSquareMultiplier(row, col);
          if (square.type === 'double-letter') {
            tileScore *= 2;
          } else if (square.type === 'triple-letter') {
            tileScore *= 3;
          } else if (square.type === 'double-word' || square.type === 'center') {
            wordMultiplier *= 2;
          } else if (square.type === 'triple-word') {
            wordMultiplier *= 3;
          }
        }
        
        wordScore += tileScore;
      }
    }
  } else {
    // Vertical word
    const col = sortedTiles[0].col;
    const startRow = sortedTiles[0].row;
    const endRow = sortedTiles[sortedTiles.length - 1].row;
    
    // Find the actual start of the word
    let actualStartRow = startRow;
    while (actualStartRow > 0 && board[actualStartRow - 1][col] !== null) {
      actualStartRow--;
    }
    
    // Find the actual end of the word
    let actualEndRow = endRow;
    while (actualEndRow < 14 && board[actualEndRow + 1][col] !== null) {
      actualEndRow++;
    }
    
    // Calculate score for the entire word
    for (let row = actualStartRow; row <= actualEndRow; row++) {
      const tile = board[row][col];
      const placedTile = placedTiles.find(t => t.row === row && t.col === col);
      
      if (tile) {
        let tileScore = tile.isBlank ? 0 : tile.value;
        
        // Apply letter multiplier only if this is a newly placed tile
        if (placedTile) {
          const square = getSquareMultiplier(row, col);
          if (square.type === 'double-letter') {
            tileScore *= 2;
          } else if (square.type === 'triple-letter') {
            tileScore *= 3;
          } else if (square.type === 'double-word' || square.type === 'center') {
            wordMultiplier *= 2;
          } else if (square.type === 'triple-word') {
            wordMultiplier *= 3;
          }
        }
        
        wordScore += tileScore;
      }
    }
  }
  
  return { score: wordScore, wordMultiplier };
};

const calculateCrossWordScores = (
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): number => {
  let totalCrossScore = 0;
  
  // For each placed tile, check if it forms a cross word (perpendicular to main word)
  for (const placedTile of placedTiles) {
    const { row, col, tile } = placedTile;
    
    // Check vertical cross word (if main word is horizontal)
    const verticalCrossScore = calculateCrossWordAt(row, col, tile, board, 'vertical');
    totalCrossScore += verticalCrossScore;
    
    // Check horizontal cross word (if main word is vertical)
    const horizontalCrossScore = calculateCrossWordAt(row, col, tile, board, 'horizontal');
    totalCrossScore += horizontalCrossScore;
  }
  
  return totalCrossScore;
};

const calculateCrossWordAt = (
  row: number,
  col: number,
  tile: Tile,
  board: (Tile | null)[][],
  direction: 'horizontal' | 'vertical'
): number => {
  let hasAdjacentTiles = false;
  let wordScore = 0;
  let wordMultiplier = 1;
  
  if (direction === 'vertical') {
    // Check if there are tiles above or below
    const hasAbove = row > 0 && board[row - 1][col] !== null;
    const hasBelow = row < 14 && board[row + 1][col] !== null;
    
    if (!hasAbove && !hasBelow) return 0; // No cross word formed
    
    // Find start and end of vertical word
    let startRow = row;
    while (startRow > 0 && board[startRow - 1][col] !== null) {
      startRow--;
    }
    
    let endRow = row;
    while (endRow < 14 && board[endRow + 1][col] !== null) {
      endRow++;
    }
    
    // Calculate score for cross word
    for (let r = startRow; r <= endRow; r++) {
      const crossTile = r === row ? tile : board[r][col];
      if (crossTile) {
        let tileScore = crossTile.isBlank ? 0 : crossTile.value;
        
        // Apply multipliers only for the newly placed tile
        if (r === row) {
          const square = getSquareMultiplier(row, col);
          if (square.type === 'double-letter') {
            tileScore *= 2;
          } else if (square.type === 'triple-letter') {
            tileScore *= 3;
          } else if (square.type === 'double-word' || square.type === 'center') {
            wordMultiplier *= 2;
          } else if (square.type === 'triple-word') {
            wordMultiplier *= 3;
          }
        }
        
        wordScore += tileScore;
      }
    }
  } else {
    // Horizontal cross word
    const hasLeft = col > 0 && board[row][col - 1] !== null;
    const hasRight = col < 14 && board[row][col + 1] !== null;
    
    if (!hasLeft && !hasRight) return 0; // No cross word formed
    
    // Find start and end of horizontal word
    let startCol = col;
    while (startCol > 0 && board[row][startCol - 1] !== null) {
      startCol--;
    }
    
    let endCol = col;
    while (endCol < 14 && board[row][endCol + 1] !== null) {
      endCol++;
    }
    
    // Calculate score for cross word
    for (let c = startCol; c <= endCol; c++) {
      const crossTile = c === col ? tile : board[row][c];
      if (crossTile) {
        let tileScore = crossTile.isBlank ? 0 : crossTile.value;
        
        // Apply multipliers only for the newly placed tile
        if (c === col) {
          const square = getSquareMultiplier(row, col);
          if (square.type === 'double-letter') {
            tileScore *= 2;
          } else if (square.type === 'triple-letter') {
            tileScore *= 3;
          } else if (square.type === 'double-word' || square.type === 'center') {
            wordMultiplier *= 2;
          } else if (square.type === 'triple-word') {
            wordMultiplier *= 3;
          }
        }
        
        wordScore += tileScore;
      }
    }
  }
  
  return wordScore * wordMultiplier;
};

export const getSquareMultiplier = (row: number, col: number): { type: string; multiplier: number } => {
  // Center square
  if (row === 7 && col === 7) return { type: 'center', multiplier: 2 };
  
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
