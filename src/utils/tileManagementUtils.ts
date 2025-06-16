
import { Tile } from "@/types/game";

export const drawNewTiles = (tileBag: Tile[], playerTiles: Tile[], tilesUsed: number): { newTiles: Tile[], remainingBag: Tile[] } => {
  const tilesToDraw = Math.min(tilesUsed, tileBag.length);
  const drawnTiles = tileBag.slice(0, tilesToDraw);
  const remainingBag = tileBag.slice(tilesToDraw);
  
  return {
    newTiles: [...playerTiles, ...drawnTiles],
    remainingBag
  };
};

export const restoreTilesToBag = (tilesToRestore: Tile[], tileBag: Tile[]): Tile[] => {
  // Add the tiles back to the bag
  const newBag = [...tileBag, ...tilesToRestore];
  
  // Shuffle the bag to randomize tile positions
  for (let i = newBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
  }
  
  return newBag;
};

export const removePlayerTiles = (playerTiles: Tile[], tilesToRemove: Tile[]): Tile[] => {
  return playerTiles.filter(tile => 
    !tilesToRemove.some(removeTitle => removeTitle.id === tile.id)
  );
};

export const resetBlankTiles = (tiles: Tile[]): Tile[] => {
  return tiles.map(tile => {
    if (tile.isBlank) {
      return {
        ...tile,
        chosenLetter: undefined,
        letter: '?'
      };
    }
    return tile;
  });
};
