
import GameBoard from "@/components/GameBoard";
import GameSidebar from "@/components/GameSidebar";
import GameHeader from "@/components/GameHeader";
import PlayerRack from "@/components/PlayerRack";
import GameActions from "@/components/GameActions";
import { ChatMessage, Tile, GameState, GamePlayer } from "@/types/game";

interface GameInterfaceProps {
  roomCode: string;
  gameState: GameState;
  currentPlayer: GamePlayer | null;
  players: GamePlayer[];
  isCurrentTurn: boolean;
  canChallenge: boolean;
  chatMessages: ChatMessage[];
  hasPlacedTiles: boolean;
  onTilePlacement: (row: number, col: number, tile: Tile) => void;
  onTileDoubleClick: (row: number, col: number) => void;
  onTileSelect: (tile: Tile) => void;
  onSendMessage: (message: string) => void;
  onShuffleTiles: () => void;
  onSubmitWord: () => void;
  onRetrieveTiles: () => void;
  onQuitGame: () => void;
  onChallenge: () => void;
}

const GameInterface = ({
  roomCode,
  gameState,
  currentPlayer,
  players,
  isCurrentTurn,
  canChallenge,
  chatMessages,
  hasPlacedTiles,
  onTilePlacement,
  onTileDoubleClick,
  onTileSelect,
  onSendMessage,
  onShuffleTiles,
  onSubmitWord,
  onRetrieveTiles,
  onQuitGame,
  onChallenge
}: GameInterfaceProps) => {
  if (!currentPlayer) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <GameHeader
        roomCode={roomCode}
        currentPlayer={currentPlayer}
      />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <GameBoard
              board={gameState.board}
              onTilePlacement={onTilePlacement}
              onTileDoubleClick={onTileDoubleClick}
              isCurrentTurn={isCurrentTurn}
            />
            
            <div className="mt-6">
              <PlayerRack
                tiles={currentPlayer.tiles || []}
                onTileSelect={onTileSelect}
              />
            </div>

            <GameActions
              isCurrentTurn={isCurrentTurn}
              canChallenge={canChallenge}
              playerTiles={currentPlayer.tiles || []}
              onShuffleTiles={onShuffleTiles}
              onSubmitWord={onSubmitWord}
              onRetrieveTiles={onRetrieveTiles}
              onQuitGame={onQuitGame}
              onChallenge={onChallenge}
              hasPlacedTiles={hasPlacedTiles}
            />
          </div>
          <div className="lg:col-span-1">
            <GameSidebar
              players={gameState.players}
              chatMessages={chatMessages}
              onSendMessage={onSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameInterface;
