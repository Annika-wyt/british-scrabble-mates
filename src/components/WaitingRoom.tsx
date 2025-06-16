
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, ArrowLeft } from "lucide-react";
import { GamePlayer } from "@/types/game";

interface WaitingRoomProps {
  roomCode: string;
  players: GamePlayer[];
  playerName: string;
  isRoomCreator: boolean;
  gameStarted: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const WaitingRoom = ({
  roomCode,
  players,
  playerName,
  isRoomCreator,
  gameStarted,
  onStartGame,
  onLeaveRoom
}: WaitingRoomProps) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Waiting Room - {roomCode}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800 mb-2">
                Players in Room ({players.length}/2 minimum)
              </p>
              <p className="text-sm text-gray-500">
                {players.length < 2 
                  ? `Need ${2 - players.length} more player${2 - players.length === 1 ? '' : 's'} to start`
                  : 'Ready to start!'}
              </p>
            </div>
            
            <div className="space-y-3">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                    <span className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-800">
                      {player.name} 
                      {(player.name === playerName || player.player_name === playerName) && ' (You)'}
                      {index === 0 && ' (Creator)'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {player.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              ))}
            </div>

            {isRoomCreator && players.length >= 2 && !gameStarted && (
              <Button onClick={onStartGame} className="w-full bg-green-600 hover:bg-green-700">
                <Crown className="w-4 h-4 mr-2" />
                Start Game ({players.length} players)
              </Button>
            )}
            
            {!isRoomCreator && players.length >= 2 && !gameStarted && (
              <div className="text-center text-sm text-gray-500 p-3 bg-yellow-50 rounded-lg">
                Waiting for room creator to start the game...
              </div>
            )}

            {players.length < 2 && (
              <div className="text-center text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                Share room code <strong>{roomCode}</strong> with friends to join!
              </div>
            )}

            <Button onClick={onLeaveRoom} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingRoom;
