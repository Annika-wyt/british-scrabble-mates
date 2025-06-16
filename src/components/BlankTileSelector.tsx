
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BlankTileSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onLetterSelect: (letter: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const BlankTileSelector = ({ isOpen, onClose, onLetterSelect }: BlankTileSelectorProps) => {
  const [selectedLetter, setSelectedLetter] = useState<string>("");

  const handleConfirm = () => {
    if (selectedLetter) {
      onLetterSelect(selectedLetter);
      setSelectedLetter("");
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedLetter("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Letter for Blank Tile</DialogTitle>
          <DialogDescription>
            Select which letter this blank tile should represent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Select value={selectedLetter} onValueChange={setSelectedLetter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a letter..." />
            </SelectTrigger>
            <SelectContent>
              {ALPHABET.map((letter) => (
                <SelectItem key={letter} value={letter}>
                  {letter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedLetter}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlankTileSelector;
