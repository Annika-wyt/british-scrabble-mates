
import { Tile } from "@/types/game";

// Standard Scrabble tile values
const TILE_VALUES: { [key: string]: number } = {
  'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
  'D': 2, 'G': 2,
  'B': 3, 'C': 3, 'M': 3, 'P': 3,
  'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
  'K': 5,
  'J': 8, 'X': 8,
  'Q': 10, 'Z': 10
};

export const calculateScore = (
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): number => {
  if (placedTiles.length === 0) return 0;

  console.log('Calculating score for placed tiles:', placedTiles);
  
  // Create a temporary board with the new tiles placed
  const tempBoard = board.map(row => [...row]);
  for (const { row, col, tile } of placedTiles) {
    tempBoard[row][col] = tile;
  }
  
  let totalScore = 0;
  const wordsFormed = findAllWordsFormed(placedTiles, tempBoard);
  
  console.log('Words formed:', wordsFormed);
  
  // Score each word formed
  for (const word of wordsFormed) {
    const wordScore = calculateWordScore(word, placedTiles, tempBoard);
    console.log(`Word score for positions ${word.map(pos => `(${pos.row},${pos.col})`).join(',')}: ${wordScore}`);
    totalScore += wordScore;
  }
  
  // Bingo bonus: 50 points if all 7 tiles used
  if (placedTiles.length === 7) {
    console.log('Bingo bonus: +50 points');
    totalScore += 50;
  }
  
  console.log('Total score:', totalScore);
  return totalScore;
};

const findAllWordsFormed = (
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): { row: number; col: number }[][] => {
  const words: { row: number; col: number }[][] = [];
  const processedWords = new Set<string>();
  
  // Check for horizontal and vertical words containing any placed tile
  for (const { row, col } of placedTiles) {
    // Check horizontal word
    const horizontalWord = getWordAt(board, row, col, 'horizontal');
    if (horizontalWord.length > 1) {
      const wordKey = `h-${horizontalWord.map(pos => `${pos.row}-${pos.col}`).join('-')}`;
      if (!processedWords.has(wordKey)) {
        words.push(horizontalWord);
        processedWords.add(wordKey);
      }
    }
    
    // Check vertical word
    const verticalWord = getWordAt(board, row, col, 'vertical');
    if (verticalWord.length > 1) {
      const wordKey = `v-${verticalWord.map(pos => `${pos.row}-${pos.col}`).join('-')}`;
      if (!processedWords.has(wordKey)) {
        words.push(verticalWord);
        processedWords.add(wordKey);
      }
    }
  }
  
  return words;
};

const getWordAt = (
  board: (Tile | null)[][],
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): { row: number; col: number }[] => {
  const positions: { row: number; col: number }[] = [];
  
  if (direction === 'horizontal') {
    // Find start of word
    let startCol = col;
    while (startCol > 0 && board[row][startCol - 1] !== null) {
      startCol--;
    }
    
    // Find end of word
    let endCol = col;
    while (endCol < 14 && board[row][endCol + 1] !== null) {
      endCol++;
    }
    
    // Collect all positions in the word
    for (let c = startCol; c <= endCol; c++) {
      if (board[row][c] !== null) {
        positions.push({ row, col: c });
      }
    }
  } else {
    // Find start of word
    let startRow = row;
    while (startRow > 0 && board[startRow - 1][col] !== null) {
      startRow--;
    }
    
    // Find end of word
    let endRow = row;
    while (endRow < 14 && board[endRow + 1][col] !== null) {
      endRow++;
    }
    
    // Collect all positions in the word
    for (let r = startRow; r <= endRow; r++) {
      if (board[r][col] !== null) {
        positions.push({ row: r, col });
      }
    }
  }
  
  return positions;
};

const calculateWordScore = (
  wordPositions: { row: number; col: number }[],
  placedTiles: { row: number; col: number; tile: Tile }[],
  board: (Tile | null)[][]
): number => {
  let wordScore = 0;
  let wordMultiplier = 1;
  
  // Check if this is the very first move of the game (original board has no tiles)
  const originalBoard = board.map(row => [...row]);
  // Remove the newly placed tiles to check if the original board was empty
  for (const { row, col } of placedTiles) {
    originalBoard[row][col] = null;
  }
  const isFirstMoveOfGame = originalBoard.flat().every(cell => cell === null);
  
  console.log('Calculating word score for positions:', wordPositions);
  console.log('Placed tiles in this turn:', placedTiles);
  
  for (const { row, col } of wordPositions) {
    // Get the tile at this position
    const tile = board[row][col];
    if (!tile) continue;
    
    // Check if this tile was placed in the current turn
    const isNewlyPlaced = placedTiles.some(pt => pt.row === row && pt.col === col);
    
    // Get base tile value
    let tileValue = tile.isBlank ? 0 : TILE_VALUES[tile.letter.toUpperCase()] || 0;
    
    console.log(`Tile at (${row},${col}): ${tile.letter}, value: ${tileValue}, newly placed: ${isNewlyPlaced}`);
    
    // Apply letter multipliers only for newly placed tiles
    if (isNewlyPlaced) {
      const square = getSquareMultiplier(row, col);
      
      if (square.type === 'double-letter') {
        tileValue *= 2;
        console.log(`Applied double letter bonus at (${row},${col}): ${tile.letter} value ${tileValue/2} -> ${tileValue}`);
      } else if (square.type === 'triple-letter') {
        tileValue *= 3;
        console.log(`Applied triple letter bonus at (${row},${col}): ${tile.letter} value ${tileValue/3} -> ${tileValue}`);
      } else if (square.type === 'double-word') {
        wordMultiplier *= 2;
        console.log(`Applied double word bonus at (${row},${col})`);
      } else if (square.type === 'triple-word') {
        wordMultiplier *= 3;
        console.log(`Applied triple word bonus at (${row},${col})`);
      } else if (square.type === 'center' && isFirstMoveOfGame) {
        // Only apply center square bonus for the very first move of the game
        wordMultiplier *= 2;
        console.log(`Applied center square bonus at (${row},${col}) for first move`);
      }
    }
    
    wordScore += tileValue;
    console.log(`Running word score after tile ${tile.letter}: ${wordScore}`);
  }
  
  // Apply word multiplier
  const finalScore = wordScore * wordMultiplier;
  console.log(`Word score calculation: base=${wordScore}, multiplier=${wordMultiplier}, final=${finalScore}`);
  
  return finalScore;
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
