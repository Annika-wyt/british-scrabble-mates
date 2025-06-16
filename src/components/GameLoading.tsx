
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface GameLoadingProps {
  title: string;
  message: string;
}

const GameLoading = ({ title, message }: GameLoadingProps) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameLoading;
