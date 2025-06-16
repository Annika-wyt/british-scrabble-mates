
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gamepad2, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RoomValidator from "@/components/RoomValidator";

const Index = () => {
  const [playerName, setPlayerName] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const navigate = useNavigate();

  const createRoom = () => {
    if (!playerName.trim()) return;
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("playerName", playerName);
    localStorage.setItem("roomCode", newRoomCode);
    navigate(`/game/${newRoomCode}`);
  };

  const handleJoinGame = (roomCode: string) => {
    localStorage.setItem("playerName", playerName);
    localStorage.setItem("roomCode", roomCode);
    navigate(`/game/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Crown className="w-12 h-12 text-blue-600" />
            <h1 className="text-6xl font-bold text-gray-900">
              Scrabble
            </h1>
            <Sparkles className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Challenge your friends to the classic word game online. Create words, score points, and become the ultimate wordsmith!
          </p>
        </div>

        {/* Game Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">Create Game</CardTitle>
              </div>
              <CardDescription className="text-lg text-gray-600">
                Start a new game and invite your friends to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-lg py-3 border-gray-300 focus:border-blue-500 rounded-xl"
                />
              </div>
              <Button 
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Gamepad2 className="w-5 h-5 mr-2" />
                Create Room
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">Join Game</CardTitle>
              </div>
              <CardDescription className="text-lg text-gray-600">
                Join an existing game with a room code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-lg py-3 border-gray-300 focus:border-blue-500 rounded-xl"
                />
              </div>
              
              {!showJoinForm ? (
                <Button 
                  onClick={() => setShowJoinForm(true)}
                  disabled={!playerName.trim()}
                  className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Join Room
                </Button>
              ) : (
                <RoomValidator 
                  playerName={playerName}
                  onJoinGame={handleJoinGame}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Play</h3>
            <p className="text-gray-600">Play instantly with friends anywhere in the world</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">British Dictionary</h3>
            <p className="text-gray-600">Uses authentic British English word validation</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Sync</h3>
            <p className="text-gray-600">All moves sync instantly across all players</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
