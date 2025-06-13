
import { Player } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameHeaderProps {
  roomCode: string;
  currentPlayer: Player;
}

const GameHeader = ({ roomCode, currentPlayer }: GameHeaderProps) => {
  const { toast } = useToast();

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Room code copied!",
      description: "Share this code with your friend to join the game."
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-amber-200 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Crown className="w-8 h-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-amber-800">Scrabble</h1>
            </div>
            
            <div className="flex items-center gap-2 bg-amber-100 px-3 py-2 rounded-lg">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-amber-800">Room: {roomCode}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomCode}
                className="p-1 h-auto hover:bg-amber-200"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{currentPlayer.name}</div>
              <div className="text-lg font-bold text-amber-600">{currentPlayer.score} points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHeader;
