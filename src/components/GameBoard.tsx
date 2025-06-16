import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tile, BoardSquare } from "@/types/game";
import { Star } from "lucide-react";
import BlankTileSelector from "./BlankTileSelector";

interface GameBoardProps {
  board: (Tile | null)[][];
  onTilePlacement: (row: number, col: number, tile: Tile) => void;
  onTileDoubleClick?: (row: number, col: number) => void;
}

const getBoardSquare = (row: number, col: number): BoardSquare => {
  // Center square
  if (row === 7 && col === 7) return { type: 'center' };
  
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
  
  return { type: 'normal' };
};

const getSquareClasses = (square: BoardSquare) => {
  switch (square.type) {
    case 'center':
      return 'bg-gradient-to-br from-red-400 to-red-500 text-white';
    case 'triple-word':
      return 'bg-gradient-to-br from-red-500 to-red-600 text-white';
    case 'double-word':
      return 'bg-gradient-to-br from-pink-400 to-pink-500 text-white';
    case 'triple-letter':
      return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white';
    case 'double-letter':
      return 'bg-gradient-to-br from-sky-400 to-sky-500 text-white';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getSquareLabel = (square: BoardSquare) => {
  switch (square.type) {
    case 'center':
      return '★';
    case 'triple-word':
      return 'TW';
    case 'double-word':
      return 'DW';
    case 'triple-letter':
      return 'TL';
    case 'double-letter':
      return 'DL';
    default:
      return '';
  }
};

const GameBoard = ({ board, onTilePlacement, onTileDoubleClick }: GameBoardProps) => {
  const [dragOverSquare, setDragOverSquare] = useState<{row: number, col: number} | null>(null);
  const [pendingBlankTile, setPendingBlankTile] = useState<{
    row: number;
    col: number;
    tile: Tile;
  } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    // Only show drag over effect if the square is empty
    if (board[row][col] === null) {
      setDragOverSquare({ row, col });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear drag over state if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSquare(null);
    }
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverSquare(null);
    
    // Check if square is already occupied
    if (board[row][col] !== null) {
      console.log('Square already occupied');
      return;
    }
    
    try {
      const tileData = e.dataTransfer.getData('tile');
      console.log('Drop event - tile data:', tileData);
      
      if (tileData) {
        const tile: Tile = JSON.parse(tileData);
        console.log('Parsed tile for placement:', tile);
        
        // If it's a blank tile, show the letter selector
        if (tile.isBlank && !tile.chosenLetter) {
          setPendingBlankTile({ row, col, tile });
        } else {
          onTilePlacement(row, col, tile);
        }
      }
    } catch (error) {
      console.error('Error handling tile drop:', error);
    }
  };

  const handleBlankTileLetterSelect = (letter: string) => {
    if (pendingBlankTile) {
      const updatedTile: Tile = {
        ...pendingBlankTile.tile,
        chosenLetter: letter,
        letter: letter // Update the display letter
      };
      
      onTilePlacement(pendingBlankTile.row, pendingBlankTile.col, updatedTile);
      setPendingBlankTile(null);
    }
  };

  const handleBlankTileCancel = () => {
    setPendingBlankTile(null);
  };

  const handleTileDoubleClick = (row: number, col: number) => {
    if (onTileDoubleClick) {
      onTileDoubleClick(row, col);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-15 gap-px p-4 bg-gray-300 rounded-2xl shadow-xl">
        {board.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            const square = getBoardSquare(rowIndex, colIndex);
            const isDragOver = dragOverSquare?.row === rowIndex && dragOverSquare?.col === colIndex;
            const isEmpty = tile === null;
            
            return (
              <div
                key={`square-${rowIndex}-${colIndex}`}
                className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 border flex items-center justify-center text-xs sm:text-sm relative transition-all duration-200",
                  getSquareClasses(square),
                  !isEmpty ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300 text-gray-900' : '',
                  isDragOver && isEmpty ? 'bg-green-200 border-green-400 scale-105 ring-2 ring-green-300' : '',
                  square.type === 'normal' ? 'border-gray-300' : 'border-white/30'
                )}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, rowIndex, colIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                onDoubleClick={() => handleTileDoubleClick(rowIndex, colIndex)}
              >
                {tile ? (
                  <div className="font-bold flex flex-col items-center leading-none">
                    <span className="text-lg">
                      {tile.isBlank && tile.chosenLetter ? tile.chosenLetter : tile.letter}
                    </span>
                    <span className="text-xs">
                      {tile.isBlank ? 0 : tile.value}
                    </span>
                  </div>
                ) : (
                  square.type === 'center' ? (
                    <Star className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-bold">
                      {getSquareLabel(square)}
                    </span>
                  )
                )}
              </div>
            );
          })
        )}
      </div>
      
      <BlankTileSelector
        isOpen={!!pendingBlankTile}
        onClose={handleBlankTileCancel}
        onLetterSelect={handleBlankTileLetterSelect}
      />
    </div>
  );
};

export default GameBoard;
