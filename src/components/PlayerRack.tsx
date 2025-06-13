
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
      <div className="bg-gradient-to-r from-amber-200 to-orange-200 p-4 rounded-xl shadow-lg border-2 border-amber-300">
        <div className="flex gap-2">
          {tiles.map((tile, index) => (
            <div
              key={tile.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tile)}
              onClick={() => onTileSelect(tile)}
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-200 to-yellow-300",
                "border-2 border-yellow-400 rounded-lg shadow-md",
                "flex flex-col items-center justify-center",
                "cursor-grab active:cursor-grabbing",
                "hover:scale-110 hover:shadow-lg transition-all duration-200",
                "text-black font-bold"
              )}
            >
              <span className="text-lg sm:text-xl">{tile.letter}</span>
              <span className="text-xs">{tile.value}</span>
            </div>
          ))}
          
          {/* Fill empty slots */}
          {Array.from({ length: 7 - tiles.length }, (_, index) => (
            <div
              key={`empty-${index}`}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg opacity-50"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerRack;
