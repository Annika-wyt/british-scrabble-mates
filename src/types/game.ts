
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

export interface GamePlayer {
  id: string;
  game_id: string;
  player_name: string;
  player_order: number;
  score: number;
  tiles: Tile[];
  is_connected: boolean;
  joined_at: string;
  // Add computed properties for compatibility with Player interface
  name: string;
  isConnected: boolean;
}

export interface Game {
  id: string;
  room_code: string;
  board: (Tile | null)[][];
  current_player_index: number;
  tile_bag: Tile[];
  game_started: boolean;
  game_over: boolean;
  pending_challenge: PendingChallenge | null;
  created_at: string;
  updated_at: string;
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
  originalBoard?: (Tile | null)[][];
  originalTiles?: Tile[];
  drawnTiles?: Tile[];
}
