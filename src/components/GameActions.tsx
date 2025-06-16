
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shuffle, Send, RotateCcw, LogOut, AlertTriangle } from "lucide-react";
import { Tile } from "@/types/game";
import { useState, useEffect } from "react";

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
  const [challengeDisabled, setChallengeDisabled] = useState(false);

  // Start 20-second timer when challenge becomes available
  useEffect(() => {
    if (canChallenge && !challengeDisabled) {
      setChallengeDisabled(false);
      const timer = setTimeout(() => {
        setChallengeDisabled(true);
      }, 20000); // 20 seconds

      return () => clearTimeout(timer);
    }
  }, [canChallenge]);

  // Reset challenge disabled state when challenge period ends
  useEffect(() => {
    if (!canChallenge) {
      setChallengeDisabled(false);
    }
  }, [canChallenge]);

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

          {/* Submit word - disabled when not current turn or when challenge is pending */}
          <Button
            onClick={onSubmitWord}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            disabled={!isCurrentTurn || !hasPlacedTiles || canChallenge}
          >
            <Send className="w-4 h-4" />
            Submit Word
          </Button>

          {/* Retrieve tiles - disabled when not current turn or when challenge is pending */}
          <Button
            onClick={onRetrieveTiles}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!isCurrentTurn || !hasPlacedTiles || canChallenge}
          >
            <RotateCcw className="w-4 h-4" />
            Retrieve Tiles
          </Button>

          {/* Challenge button - enabled when there's a word to challenge and within 20 seconds */}
          <Button
            onClick={onChallenge}
            variant="destructive"
            className="flex items-center gap-2"
            disabled={!canChallenge || challengeDisabled}
          >
            <AlertTriangle className="w-4 h-4" />
            Challenge Word
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
          {canChallenge ? (
            challengeDisabled ? (
              <span className="text-gray-500">Challenge period expired</span>
            ) : (
              <span className="text-red-600 font-semibold">Word can be challenged! Click "Challenge Word" if you think it's invalid.</span>
            )
          ) : isCurrentTurn ? (
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
