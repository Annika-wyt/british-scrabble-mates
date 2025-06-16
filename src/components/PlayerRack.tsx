
import { Tile } from "@/types/game";
import { cn } from "@/lib/utils";

interface PlayerRackProps {
  tiles: Tile[];
  onTileSelect: (tile: Tile) => void;
  onTileDrag?: (tile: Tile) => void;
}

const PlayerRack = ({ tiles, onTileSelect, onTileDrag }: PlayerRackProps) => {
  const handleDragStart = (e: React.DragEvent, tile: Tile) => {
    e.dataTransfer.setData('tile', JSON.stringify(tile));
    e.dataTransfer.effectAllowed = 'move';
    if (onTileDrag) {
      onTileDrag(tile);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
        <div className="flex gap-2">
          {tiles.map((tile, index) => (
            <div
              key={`${tile.id}-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, tile)}
              onClick={() => onTileSelect(tile)}
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-100 to-yellow-200",
                "border-2 border-yellow-300 rounded-lg shadow-sm",
                "flex flex-col items-center justify-center",
                "cursor-grab active:cursor-grabbing",
                "hover:scale-105 hover:shadow-md transition-all duration-200",
                "text-gray-900 font-bold"
              )}
            >
              <span className="text-lg sm:text-xl">
                {tile.isBlank ? (tile.chosenLetter || '?') : tile.letter}
              </span>
              <span className="text-xs">
                {tile.isBlank ? 0 : tile.value}
              </span>
            </div>
          ))}
          
          {/* Fill empty slots */}
          {Array.from({ length: Math.max(0, 7 - tiles.length) }, (_, index) => (
            <div
              key={`empty-${index}`}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 border-2 border-gray-200 rounded-lg opacity-50"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerRack;
