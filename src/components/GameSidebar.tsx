
import { useState } from "react";
import { Player, ChatMessage } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trophy, Users, MessageCircle } from "lucide-react";

interface GameSidebarProps {
  players: Player[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

const GameSidebar = ({ players, chatMessages, onSendMessage }: GameSidebarProps) => {
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4">
      {/* Players Card */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Users className="w-5 h-5" />
            Players
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {players.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                <span className="font-medium text-gray-800">{player.name}</span>
                {player.isConnected && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
              </div>
              <span className="font-bold text-blue-600">{player.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chat Card */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <MessageCircle className="w-5 h-5" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-gray-500 text-center text-sm">No messages yet...</div>
            ) : (
              chatMessages.map((message) => (
                <div key={message.id} className="text-sm">
                  <span className="font-semibold text-blue-600">{message.playerName}:</span>
                  <span className="ml-2 text-gray-700">{message.message}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-sm border-gray-300"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Game Rules Card */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-800">Quick Rules</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <div>• Form words using your tiles</div>
          <div>• Connect to existing words</div>
          <div>• Use special squares for bonus points</div>
          <div>• First word must cross the center star</div>
          <div>• Score based on letter values and multipliers</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameSidebar;
