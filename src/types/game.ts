export interface Tile {
  letter: string;
  value: number;
  id: string;
  isBlank?: boolean;
  chosenLetter?: string; // For blank tiles that have been assigned a letter
}

export interface Player {
  id: string;
  name: string;
  score: number;
  tiles: Tile[];
  isConnected: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  board: (Tile | null)[][];
  players: Player[];
  currentPlayerIndex: number;
  tileBag: Tile[];
  gameStarted: boolean;
  gameOver: boolean;
  chatMessages: ChatMessage[];
}

export interface BoardSquare {
  type: 'normal' | 'double-letter' | 'triple-letter' | 'double-word' | 'triple-word' | 'center';
  multiplier?: number;
}

export interface PendingChallenge {
  challengerId?: string;
  originalPlayerId: string;
  placedTiles: { row: number; col: number; tile: Tile; }[];
  score: number;
  drawnTiles?: Tile[];
}
