
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface GameErrorProps {
  title: string;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}

const GameError = ({ title, message, onBack, onRetry }: GameErrorProps) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="space-y-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                Try Again
              </Button>
            )}
            <Button onClick={onBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameError;
