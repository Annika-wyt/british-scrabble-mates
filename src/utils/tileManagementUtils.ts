
import { Tile } from "@/types/game";

export const drawNewTiles = (tileBag: Tile[], playerTiles: Tile[], tilesUsed: number): { newTiles: Tile[], remainingBag: Tile[] } => {
  const tilesToDraw = Math.min(tilesUsed, tileBag.length);
  const newTiles = tileBag.slice(0, tilesToDraw);
  const remainingBag = tileBag.slice(tilesToDraw);
  
  return {
    newTiles: [...playerTiles, ...newTiles],
    remainingBag
  };
};

export const restoreTilesToBag = (tilesToRestore: Tile[], tileBag: Tile[]): Tile[] => {
  // Shuffle the tiles back into the bag
  const newBag = [...tileBag, ...tilesToRestore];
  
  // Shuffle the bag
  for (let i = newBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
  }
  
  return newBag;
};
