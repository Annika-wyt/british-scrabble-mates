
// Dictionary validation using external dictionary file
let DICTIONARY_WORDS: Set<string> | null = null;
let dictionaryLoadPromise: Promise<void> | null = null;

const loadDictionary = async (): Promise<void> => {
  if (DICTIONARY_WORDS) return;
  
  try {
    console.log('Loading dictionary from file...');
    const response = await fetch('/src/utils/dictionary.txt');
    
    if (!response.ok) {
      throw new Error(`Failed to load dictionary: ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    DICTIONARY_WORDS = new Set();
    
    // Parse each line assuming format: WORD | MEANING | WORD_TYPE
    for (const line of lines) {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length >= 1 && parts[0]) {
        // First column contains the valid word
        const word = parts[0].toUpperCase();
        DICTIONARY_WORDS.add(word);
      }
    }
    
    console.log(`Dictionary loaded successfully with ${DICTIONARY_WORDS.size} words`);
    
    // Log some sample words to verify dictionary content
    const sampleWords = ['MUSK', 'ME', 'UN'].filter(word => DICTIONARY_WORDS?.has(word));
    console.log('Sample words found in dictionary:', sampleWords);
    
  } catch (error) {
    console.error('Error loading dictionary:', error);
    
    // Fallback to a minimal set of common words if dictionary fails to load
    console.log('Using fallback dictionary...');
    DICTIONARY_WORDS = new Set([
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
      
      // Common longer words
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'DAY', 'GET',
      'USE', 'MAN', 'NEW', 'NOW', 'WAY', 'MAY', 'SAY', 'WORD', 'GAME', 'PLAY', 'TILE', 'HELLO', 'WORLD', 'CHAT', 'LOVE',
      'A', 'I', 'MUSK'
    ]);
  }
};

export const validateWord = async (word: string): Promise<boolean> => {
  // Ensure dictionary is loaded
  if (!dictionaryLoadPromise) {
    dictionaryLoadPromise = loadDictionary();
  }
  await dictionaryLoadPromise;
  
  // Convert to uppercase for consistency
  const upperWord = word.toUpperCase();
  
  console.log(`🔍 Validating word: "${upperWord}"`);
  
  // Check if word exists in dictionary
  const isValid = DICTIONARY_WORDS?.has(upperWord) || false;
  
  console.log(`📝 Word "${upperWord}" is ${isValid ? '✅ VALID' : '❌ INVALID'} in dictionary`);
  console.log(`📊 Dictionary size: ${DICTIONARY_WORDS?.size || 0} words`);
  
  return isValid;
};

export const validateAllWordsFormed = async (
  placedTiles: { row: number; col: number; tile: any }[],
  board: (any | null)[][]
): Promise<{ isValid: boolean; invalidWords: string[] }> => {
  if (placedTiles.length === 0) {
    return { isValid: true, invalidWords: [] };
  }

  console.log('🎯 === WORD VALIDATION START ===');
  console.log('📍 Placed tiles:', placedTiles.map(pt => ({ 
    row: pt.row, 
    col: pt.col, 
    letter: pt.tile?.isBlank && pt.tile?.chosenLetter ? pt.tile.chosenLetter : pt.tile?.letter,
    isBlank: pt.tile?.isBlank || false
  })));

  // Create temporary board with new tiles
  const tempBoard = board.map(row => [...row]);
  for (const { row, col, tile } of placedTiles) {
    tempBoard[row][col] = tile;
  }

  console.log('🎲 Temporary board created with new tiles placed');

  const wordsToValidate = new Set<string>();
  const invalidWords: string[] = [];

  // Find all words that include at least one newly placed tile
  for (const { row, col } of placedTiles) {
    console.log(`🔎 Checking words at position (${row}, ${col})`);
    
    // Check horizontal word
    const horizontalWord = getWordAt(tempBoard, row, col, 'horizontal');
    if (horizontalWord.length > 1) {
      const wordString = horizontalWord.map(pos => {
        const tile = tempBoard[pos.row][pos.col];
        const letter = tile?.isBlank && tile?.chosenLetter ? tile.chosenLetter : (tile?.letter || '');
        console.log(`  📍 Position (${pos.row}, ${pos.col}): tile=${JSON.stringify(tile)}, letter="${letter}"`);
        return letter;
      }).join('');
      console.log(`➡️ Found horizontal word: "${wordString}" (${wordString.length} letters)`);
      if (wordString.length > 0 && wordString.trim() !== '') {
        wordsToValidate.add(wordString.toUpperCase());
      }
    } else {
      console.log(`➡️ No horizontal word found at (${row}, ${col}) - length: ${horizontalWord.length}`);
    }

    // Check vertical word  
    const verticalWord = getWordAt(tempBoard, row, col, 'vertical');
    if (verticalWord.length > 1) {
      const wordString = verticalWord.map(pos => {
        const tile = tempBoard[pos.row][pos.col];
        const letter = tile?.isBlank && tile?.chosenLetter ? tile.chosenLetter : (tile?.letter || '');
        console.log(`  📍 Position (${pos.row}, ${pos.col}): tile=${JSON.stringify(tile)}, letter="${letter}"`);
        return letter;
      }).join('');
      console.log(`⬇️ Found vertical word: "${wordString}" (${wordString.length} letters)`);
      if (wordString.length > 0 && wordString.trim() !== '') {
        wordsToValidate.add(wordString.toUpperCase());
      }
    } else {
      console.log(`⬇️ No vertical word found at (${row}, ${col}) - length: ${verticalWord.length}`);
    }
  }

  console.log('📋 All words to validate:', Array.from(wordsToValidate));

  // Validate each word
  for (const word of wordsToValidate) {
    if (word && word.length > 0) {
      console.log(`🔍 Validating word: "${word}"`);
      const isValid = await validateWord(word);
      console.log(`📝 Word "${word}" validation result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      if (!isValid) {
        invalidWords.push(word);
      }
    }
  }

  const result = {
    isValid: invalidWords.length === 0,
    invalidWords
  };

  console.log('🏁 === WORD VALIDATION END ===');
  console.log('📊 Final validation result:', result);
  console.log(`${result.isValid ? '✅ ALL WORDS VALID' : '❌ INVALID WORDS FOUND'}: ${result.invalidWords.join(', ')}`);
  
  return result;
};

const getWordAt = (
  board: (any | null)[][],
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): { row: number; col: number }[] => {
  const positions: { row: number; col: number }[] = [];

  console.log(`🔍 Getting ${direction} word at (${row}, ${col})`);

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

    console.log(`  📍 Horizontal word spans from column ${startCol} to ${endCol}`);

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

    console.log(`  📍 Vertical word spans from row ${startRow} to ${endRow}`);

    // Collect all positions in the word
    for (let r = startRow; r <= endRow; r++) {
      if (board[r][col] !== null) {
        positions.push({ row: r, col });
      }
    }
  }

  console.log(`📋 Word positions for ${direction} at (${row}, ${col}):`, positions);
  return positions;
};

export const isValidCSWWord = async (word: string): Promise<boolean> => {
  return await validateWord(word);
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
