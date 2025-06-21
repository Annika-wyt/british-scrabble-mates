
// Collins Scrabble Words (CSW) dictionary validation
// This is a subset for demo purposes - in production you'd use the full CSW dictionary
const CSW_WORDS = new Set([
  // Common 2-letter words
  'AA', 'AB', 'AD', 'AE', 'AG', 'AH', 'AI', 'AL', 'AM', 'AN', 'AR', 'AS', 'AT', 'AW', 'AX', 'AY',
  'BA', 'BE', 'BI', 'BO', 'BY',
  'DA', 'DE', 'DO',
  'EF', 'EH', 'EL', 'EM', 'EN', 'ER', 'ES', 'ET', 'EX',
  'FA', 'FE',
  'GI', 'GO',
  'HA', 'HE', 'HI', 'HM', 'HO',
  'ID', 'IF', 'IN', 'IS', 'IT',
  'JO',
  'KA', 'KI',
  'LA', 'LI', 'LO',
  'MA', 'ME', 'MI', 'MM', 'MO', 'MU', 'MY',
  'NA', 'NE', 'NO', 'NU',
  'OB', 'OD', 'OE', 'OF', 'OH', 'OI', 'OM', 'ON', 'OO', 'OP', 'OR', 'OS', 'OW', 'OX', 'OY',
  'PA', 'PE', 'PI', 'PO',
  'QI',
  'RE',
  'SH', 'SI', 'SO',
  'TA', 'TI', 'TO',
  'UG', 'UH', 'UM', 'UN', 'UP', 'UR', 'US', 'UT',
  'WE', 'WO',
  'XI', 'XU',
  'YA', 'YE', 'YO',
  'ZA', 'ZO',
  
  // Common 3-letter words
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'DAY', 'GET',
  'USE', 'MAN', 'NEW', 'NOW', 'WAY', 'MAY', 'SAY', 'AGO', 'SIT', 'SET', 'RUN', 'EAT', 'FAR', 'SEA', 'EYE',
  'RED', 'TOP', 'ARM', 'TOO', 'ANY', 'SUN', 'LET', 'PUT', 'END', 'WHY', 'TRY', 'GOD', 'SIX', 'DOG', 'EAR',
  'SIT', 'FUN', 'BAD', 'YES', 'YET', 'CAR', 'JOB', 'LOT', 'BED', 'HIT', 'EAT', 'AGE', 'BIG', 'BOX', 'FEW',
  'GOT', 'HOT', 'LAW', 'SON', 'WAR', 'OFF', 'BAG', 'ART', 'BAR', 'BOY', 'DID', 'FLY', 'GUN', 'LED', 'LIE',
  'NET', 'PAY', 'ROW', 'SAD', 'TAX', 'VAN', 'WIN', 'ZOO', 'ACT', 'BUY', 'CUP', 'DIG', 'EGG', 'FIG', 'HAM',
  'ICE', 'JAM', 'KEY', 'LAP', 'MUD', 'NUT', 'OWL', 'PIG', 'RAG', 'SIP', 'TOY', 'URN', 'VET', 'WIG', 'ZIP',
  
  // Common longer words (but be more restrictive for testing)
  'WORD', 'GAME', 'PLAY', 'TILE', 'HELLO', 'WORLD', 'CHAT', 'LOVE', 'NICE', 'COOL', 'BEST', 'GOOD', 'TIME',
  'HOUSE', 'WATER', 'LIGHT', 'RIGHT', 'PLACE', 'THINK', 'GREAT', 'WHERE', 'BEING', 'EVERY', 'NEVER', 'AFTER',
  'FIRST', 'THING', 'COULD', 'OTHER', 'THOSE', 'THEIR', 'BEFORE', 'THREE', 'SHOULD', 'AGAIN', 'FOUND', 'SMALL',
  'STILL', 'MIGHT', 'YEARS', 'POINT', 'UNDER', 'WHILE', 'STATE', 'PEOPLE',
  'FAMILY', 'SCHOOL', 'MOTHER', 'FATHER', 'SISTER', 'FRIEND', 'STUDENT', 'TEACHER',
  
  // Single letters (valid in Scrabble when forming words)
  'A', 'I'
]);

export const validateWord = async (word: string): Promise<boolean> => {
  // Convert to uppercase for consistency
  const upperWord = word.toUpperCase();
  
  console.log(`Validating word: ${upperWord}`);
  
  // Check if word exists in CSW dictionary
  const isValid = CSW_WORDS.has(upperWord);
  
  console.log(`Word ${upperWord} is ${isValid ? 'valid' : 'invalid'} in CSW dictionary`);
  
  return isValid;
};

export const validateAllWordsFormed = async (
  placedTiles: { row: number; col: number; tile: any }[],
  board: (any | null)[][]
): Promise<{ isValid: boolean; invalidWords: string[] }> => {
  if (placedTiles.length === 0) {
    return { isValid: true, invalidWords: [] };
  }

  console.log('=== WORD VALIDATION START ===');
  console.log('Placed tiles:', placedTiles.map(pt => ({ 
    row: pt.row, 
    col: pt.col, 
    letter: pt.tile?.isBlank && pt.tile?.chosenLetter ? pt.tile.chosenLetter : pt.tile?.letter 
  })));

  // Create temporary board with new tiles
  const tempBoard = board.map(row => [...row]);
  for (const { row, col, tile } of placedTiles) {
    tempBoard[row][col] = tile;
  }

  const wordsToValidate = new Set<string>();
  const invalidWords: string[] = [];

  // Find all words that include at least one newly placed tile
  for (const { row, col } of placedTiles) {
    console.log(`Checking words at position (${row}, ${col})`);
    
    // Check horizontal word
    const horizontalWord = getWordAt(tempBoard, row, col, 'horizontal');
    if (horizontalWord.length > 1) {
      const wordString = horizontalWord.map(pos => {
        const tile = tempBoard[pos.row][pos.col];
        return tile?.isBlank && tile?.chosenLetter ? tile.chosenLetter : (tile?.letter || '');
      }).join('');
      console.log(`Found horizontal word: ${wordString}`);
      if (wordString.length > 0) {
        wordsToValidate.add(wordString.toUpperCase());
      }
    }

    // Check vertical word  
    const verticalWord = getWordAt(tempBoard, row, col, 'vertical');
    if (verticalWord.length > 1) {
      const wordString = verticalWord.map(pos => {
        const tile = tempBoard[pos.row][pos.col];
        return tile?.isBlank && tile?.chosenLetter ? tile.chosenLetter : (tile?.letter || '');
      }).join('');
      console.log(`Found vertical word: ${wordString}`);
      if (wordString.length > 0) {
        wordsToValidate.add(wordString.toUpperCase());
      }
    }
  }

  console.log('All words to validate:', Array.from(wordsToValidate));

  // Validate each word
  for (const word of wordsToValidate) {
    if (word && word.length > 0) {
      const isValid = await validateWord(word);
      console.log(`Word "${word}" validation result: ${isValid}`);
      if (!isValid) {
        invalidWords.push(word);
      }
    }
  }

  const result = {
    isValid: invalidWords.length === 0,
    invalidWords
  };

  console.log('=== WORD VALIDATION END ===');
  console.log('Final validation result:', result);
  return result;
};

const getWordAt = (
  board: (any | null)[][],
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): { row: number; col: number }[] => {
  const positions: { row: number; col: number }[] = [];

  if (direction === 'horizontal') {
    // Find start of word
    let startCol = col;
    while (startCol > 0 && board[row][startCol - 1] !== null) {
      startCol--;
    }

    // Find end of word
    let endCol = col;
    while (endCol < 14 && board[row][endCol + 1] !== null) {
      endCol++;
    }

    // Collect all positions in the word
    for (let c = startCol; c <= endCol; c++) {
      if (board[row][c] !== null) {
        positions.push({ row, col: c });
      }
    }
  } else {
    // Find start of word
    let startRow = row;
    while (startRow > 0 && board[startRow - 1][col] !== null) {
      startRow--;
    }

    // Find end of word
    let endRow = row;
    while (endRow < 14 && board[endRow + 1][col] !== null) {
      endRow++;
    }

    // Collect all positions in the word
    for (let r = startRow; r <= endRow; r++) {
      if (board[r][col] !== null) {
        positions.push({ row: r, col });
      }
    }
  }

  console.log(`Word positions for ${direction} at (${row}, ${col}):`, positions);
  return positions;
};

export const isValidCSWWord = (word: string): boolean => {
  return CSW_WORDS.has(word.toUpperCase());
};

// New function to validate tile placement is in a straight line
export const validateTilePlacement = (placedTiles: { row: number; col: number; tile: any }[]): { isValid: boolean; error?: string } => {
  if (placedTiles.length === 0) {
    return { isValid: false, error: 'No tiles placed' };
  }

  if (placedTiles.length === 1) {
    return { isValid: true }; // Single tile is always valid
  }

  // Sort tiles by position to check alignment
  const sortedTiles = [...placedTiles].sort((a, b) => a.row - b.row || a.col - b.col);

  // Check if all tiles are in the same row (horizontal)
  const allSameRow = sortedTiles.every(tile => tile.row === sortedTiles[0].row);
  
  // Check if all tiles are in the same column (vertical)
  const allSameCol = sortedTiles.every(tile => tile.col === sortedTiles[0].col);

  if (!allSameRow && !allSameCol) {
    return { isValid: false, error: 'Tiles must be placed in a straight horizontal or vertical line' };
  }

  // Check for gaps in placement
  if (allSameRow) {
    // Check horizontal continuity
    for (let i = 1; i < sortedTiles.length; i++) {
      if (sortedTiles[i].col !== sortedTiles[i-1].col + 1) {
        return { isValid: false, error: 'Tiles must be placed consecutively without gaps' };
      }
    }
  } else {
    // Check vertical continuity
    for (let i = 1; i < sortedTiles.length; i++) {
      if (sortedTiles[i].row !== sortedTiles[i-1].row + 1) {
        return { isValid: false, error: 'Tiles must be placed consecutively without gaps' };
      }
    }
  }

  return { isValid: true };
};
