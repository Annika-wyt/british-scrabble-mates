
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shuffle, Send, RotateCcw, LogOut, AlertTriangle } from "lucide-react";
import { Tile } from "@/types/game";

interface GameActionsProps {
  isCurrentTurn: boolean;
  canChallenge: boolean;
  playerTiles: Tile[];
  onShuffleTiles: () => void;
  onSubmitWord: () => void;
  onRetrieveTiles: () => void;
  onQuitGame: () => void;
  onChallenge: () => void;
  hasPlacedTiles: boolean;
}

const GameActions = ({
  isCurrentTurn,
  canChallenge,
  playerTiles,
  onShuffleTiles,
  onSubmitWord,
  onRetrieveTiles,
  onQuitGame,
  onChallenge,
  hasPlacedTiles
}: GameActionsProps) => {
  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {/* Shuffle tiles - always enabled for current player */}
          <Button
            onClick={onShuffleTiles}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!isCurrentTurn || playerTiles.length === 0}
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </Button>

          {/* Submit word - only enabled on current turn with placed tiles */}
          <Button
            onClick={onSubmitWord}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            disabled={!isCurrentTurn || !hasPlacedTiles}
          >
            <Send className="w-4 h-4" />
            Submit Word
          </Button>

          {/* Retrieve tiles - only enabled on current turn with placed tiles */}
          <Button
            onClick={onRetrieveTiles}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!isCurrentTurn || !hasPlacedTiles}
          >
            <RotateCcw className="w-4 h-4" />
            Retrieve Tiles
          </Button>

          {/* Challenge button - only enabled when not current turn and can challenge */}
          <Button
            onClick={onChallenge}
            variant="destructive"
            className="flex items-center gap-2"
            disabled={isCurrentTurn || !canChallenge}
          >
            <AlertTriangle className="w-4 h-4" />
            Challenge
          </Button>

          {/* Quit game - always available with margin-left auto to push to right */}
          <Button
            onClick={onQuitGame}
            variant="destructive"
            className="flex items-center gap-2 ml-auto"
          >
            <LogOut className="w-4 h-4" />
            Quit Game
          </Button>
        </div>

        {/* Turn indicator */}
        <div className="mt-3 text-sm text-center">
          {isCurrentTurn ? (
            <span className="text-green-600 font-semibold">Your Turn - Place tiles and submit your word</span>
          ) : canChallenge ? (
            <span className="text-orange-600 font-semibold">Opponent just played - You can challenge their words</span>
          ) : (
            <span className="text-gray-500">Waiting for other player to submit their word...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameActions;
