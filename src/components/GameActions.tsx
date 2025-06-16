
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
          {/* Challenge button - only show when it's not your turn and there's a word to challenge */}
          {!isCurrentTurn && canChallenge && (
            <Button
              onClick={onChallenge}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Challenge
            </Button>
          )}

          {/* Actions available during your turn */}
          {isCurrentTurn && (
            <>
              {/* Shuffle tiles */}
              <Button
                onClick={onShuffleTiles}
                variant="outline"
                className="flex items-center gap-2"
                disabled={playerTiles.length === 0}
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </Button>

              {/* Submit word */}
              <Button
                onClick={onSubmitWord}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                disabled={!hasPlacedTiles}
              >
                <Send className="w-4 h-4" />
                Submit Word
              </Button>

              {/* Retrieve tiles */}
              <Button
                onClick={onRetrieveTiles}
                variant="outline"
                className="flex items-center gap-2"
                disabled={!hasPlacedTiles}
              >
                <RotateCcw className="w-4 h-4" />
                Retrieve Tiles
              </Button>
            </>
          )}

          {/* Quit game - always available */}
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
            <span className="text-green-600 font-semibold">Your Turn</span>
          ) : (
            <span className="text-gray-500">Waiting for other player...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameActions;
