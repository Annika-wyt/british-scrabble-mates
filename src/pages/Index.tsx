
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gamepad2, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const navigate = useNavigate();

  const createRoom = () => {
    if (!playerName.trim()) return;
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("playerName", playerName);
    localStorage.setItem("roomCode", newRoomCode);
    navigate(`/game/${newRoomCode}`);
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    localStorage.setItem("playerName", playerName);
    localStorage.setItem("roomCode", roomCode.toUpperCase());
    navigate(`/game/${roomCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-amber-600" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-red-600 bg-clip-text text-transparent">
              Scrabble
            </h1>
            <Sparkles className="w-12 h-12 text-amber-600" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Challenge your friends to the classic word game online. Create words, score points, and become the ultimate wordsmith!
          </p>
        </div>

        {/* Game Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <Card className="relative overflow-hidden border-2 border-amber-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 to-orange-100/20"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-amber-100 rounded-full">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-800">Create Game</CardTitle>
              </div>
              <CardDescription className="text-lg">
                Start a new game and invite your friends to join
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-lg py-3 border-2 border-amber-200 focus:border-amber-400 rounded-xl"
                />
              </div>
              <Button 
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Gamepad2 className="w-5 h-5 mr-2" />
                Create Room
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="relative overflow-hidden border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-indigo-100/20"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-800">Join Game</CardTitle>
              </div>
              <CardDescription className="text-lg">
                Join an existing game with a room code
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-lg py-3 border-2 border-blue-200 focus:border-blue-400 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                <Input
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="text-lg py-3 border-2 border-blue-200 focus:border-blue-400 rounded-xl uppercase"
                />
              </div>
              <Button 
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Room
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Real-time Play</h3>
            <p className="text-gray-600">Play instantly with friends anywhere in the world</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">British Dictionary</h3>
            <p className="text-gray-600">Uses authentic British English word validation</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Beautiful Design</h3>
            <p className="text-gray-600">Elegant interface with smooth animations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
