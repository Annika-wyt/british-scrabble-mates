
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RoomValidatorProps {
  playerName: string;
  onJoinGame: (roomCode: string) => void;
}

const RoomValidator = ({ playerName, onJoinGame }: RoomValidatorProps) => {
  const [roomCode, setRoomCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateAndJoinRoom = async () => {
    if (!roomCode.trim()) {
      toast({
        title: "Room code required",
        description: "Please enter a room code to join a game.",
        variant: "destructive"
      });
      return;
    }

    if (!playerName.trim()) {
      toast({
        title: "Player name required",
        description: "Please enter your name first.",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    try {
      // Check if room exists
      const { data: existingGame, error } = await supabase
        .from('games')
        .select('id')
        .eq('room_code', roomCode.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error('Error validating room:', error);
        toast({
          title: "Error",
          description: "Failed to validate room code. Please try again.",
          variant: "destructive"
        });
        setIsValidating(false);
        return;
      }

      if (!existingGame) {
        toast({
          title: "Room not found",
          description: "The room code you entered does not exist. Please check and try again.",
          variant: "destructive"
        });
        setIsValidating(false);
        return;
      }

      // Room exists, proceed to join
      onJoinGame(roomCode.toUpperCase());
    } catch (error) {
      console.error('Error validating room:', error);
      toast({
        title: "Error",
        description: "Failed to validate room code. Please try again.",
        variant: "destructive"
      });
    }

    setIsValidating(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
          Room Code
        </label>
        <Input
          id="roomCode"
          type="text"
          placeholder="Enter room code (e.g., ABC123)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="text-center text-lg font-mono"
        />
      </div>
      
      <Button
        onClick={validateAndJoinRoom}
        disabled={isValidating || !roomCode.trim() || !playerName.trim()}
        className="w-full"
      >
        {isValidating ? "Validating..." : "Join Game"}
      </Button>
    </div>
  );
};

export default RoomValidator;
