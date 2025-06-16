
import { Player } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Copy, Users, Trophy } from "lucide-react";
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
    <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-gray-900">Scrabble</h1>
            
            <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-full">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">Room {roomCode}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomCode}
                className="p-1 h-auto hover:bg-gray-200 rounded-full"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold text-gray-900">{currentPlayer.name}</div>
              <div className="flex items-center gap-1 text-blue-600">
                <Trophy className="w-4 h-4" />
                <span className="font-bold">{currentPlayer.score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHeader;
