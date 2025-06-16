
import { Tile } from "@/types/game";

export interface PlacedTile {
  row: number;
  col: number;
  tile: Tile;
}

export const validateWordPlacement = (
  placedTiles: PlacedTile[],
  board: (Tile | null)[][]
): { isValid: boolean; reason?: string } => {
  if (placedTiles.length === 0) {
    return { isValid: false, reason: "No tiles placed" };
  }

  if (placedTiles.length === 1) {
    // Single tile must connect to existing tiles
    const { row, col } = placedTiles[0];
    const hasAdjacent = checkAdjacentTiles(row, col, board);
    
    // Exception: first move must be on center square (7,7)
    const isFirstMove = board.flat().every(cell => cell === null);
    const isCenterSquare = row === 7 && col === 7;
    
    if (isFirstMove) {
      if (!isCenterSquare) {
        return { isValid: false, reason: "First word must include the center square" };
      }
      return { isValid: true };
    }
    
    if (!hasAdjacent) {
      return { isValid: false, reason: "Word must connect to existing tiles" };
    }
    
    return { isValid: true };
  }

  // Multiple tiles - check alignment
  const alignmentCheck = checkAlignment(placedTiles);
  if (!alignmentCheck.isValid) {
    return alignmentCheck;
  }

  // Check if tiles form a continuous line
  const continuityCheck = checkContinuity(placedTiles, board);
  if (!continuityCheck.isValid) {
    return continuityCheck;
  }

  // Check connection to existing tiles (except for first move)
  const isFirstMove = board.flat().every(cell => cell === null);
  const touchesCenterSquare = placedTiles.some(({ row, col }) => row === 7 && col === 7);
  
  if (isFirstMove) {
    if (!touchesCenterSquare) {
      return { isValid: false, reason: "First word must include the center square" };
    }
    return { isValid: true };
  }

  const connectionCheck = checkConnection(placedTiles, board);
  if (!connectionCheck.isValid) {
    return connectionCheck;
  }

  return { isValid: true };
};

const checkAdjacentTiles = (row: number, col: number, board: (Tile | null)[][]): boolean => {
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // up, down, left, right
  ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    
    if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15) {
      if (board[newRow][newCol] !== null) {
        return true;
      }
    }
  }
  
  return false;
};

const checkAlignment = (placedTiles: PlacedTile[]): { isValid: boolean; reason?: string } => {
  if (placedTiles.length < 2) return { isValid: true };

  const rows = placedTiles.map(t => t.row);
  const cols = placedTiles.map(t => t.col);

  const allSameRow = rows.every(row => row === rows[0]);
  const allSameCol = cols.every(col => col === cols[0]);

  if (!allSameRow && !allSameCol) {
    return { isValid: false, reason: "Tiles must be placed in a straight line (horizontal or vertical)" };
  }

  return { isValid: true };
};

const checkContinuity = (placedTiles: PlacedTile[], board: (Tile | null)[][]): { isValid: boolean; reason?: string } => {
  if (placedTiles.length < 2) return { isValid: true };

  // Sort tiles by position
  const sortedTiles = [...placedTiles].sort((a, b) => {
    if (a.row === b.row) {
      return a.col - b.col; // Same row, sort by column
    }
    return a.row - b.row; // Sort by row
  });

  // Check if tiles form a continuous line (allowing existing tiles in between)
  const isHorizontal = sortedTiles.every(t => t.row === sortedTiles[0].row);
  
  if (isHorizontal) {
    // Check horizontal continuity
    const row = sortedTiles[0].row;
    const startCol = sortedTiles[0].col;
    const endCol = sortedTiles[sortedTiles.length - 1].col;
    
    for (let col = startCol; col <= endCol; col++) {
      const hasPlacedTile = sortedTiles.some(t => t.col === col);
      const hasExistingTile = board[row][col] !== null;
      
      if (!hasPlacedTile && !hasExistingTile) {
        return { isValid: false, reason: "Tiles must form a continuous word" };
      }
    }
  } else {
    // Check vertical continuity
    const col = sortedTiles[0].col;
    const startRow = sortedTiles[0].row;
    const endRow = sortedTiles[sortedTiles.length - 1].row;
    
    for (let row = startRow; row <= endRow; row++) {
      const hasPlacedTile = sortedTiles.some(t => t.row === row);
      const hasExistingTile = board[row][col] !== null;
      
      if (!hasPlacedTile && !hasExistingTile) {
        return { isValid: false, reason: "Tiles must form a continuous word" };
      }
    }
  }

  return { isValid: true };
};

const checkConnection = (placedTiles: PlacedTile[], board: (Tile | null)[][]): { isValid: boolean; reason?: string } => {
  // Check if any placed tile is adjacent to an existing tile on the board
  for (const { row, col } of placedTiles) {
    if (checkAdjacentTiles(row, col, board)) {
      return { isValid: true };
    }
  }
  
  return { isValid: false, reason: "Word must connect to existing tiles on the board" };
};
