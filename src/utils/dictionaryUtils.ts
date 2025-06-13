
// British English dictionary validation
// In a real implementation, this would use a comprehensive British English dictionary API
const BRITISH_WORDS = new Set([
  'COLOUR', 'HONOUR', 'FAVOUR', 'CENTRE', 'THEATRE', 'METRE', 'FIBRE',
  'REALISE', 'ORGANISE', 'RECOGNISE', 'ANALYSE', 'PARALYSE',
  'GREY', 'CHEQUE', 'TYRE', 'KERB', 'PLOUGH', 'DRAUGHT',
  'HELLO', 'WORLD', 'SCRABBLE', 'GAME', 'WORD', 'LETTER',
  'SCORE', 'PLAY', 'TILE', 'BOARD', 'FRIEND', 'CHAT',
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL',
  'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'DAY', 'GET',
  'USE', 'MAN', 'NEW', 'NOW', 'WAY', 'MAY', 'SAY', 'EACH',
  'SHE', 'HOW', 'ITS', 'OIL', 'SIT', 'SET', 'RUN', 'EAT',
  'FAR', 'SEA', 'EYE', 'RED', 'TOP', 'ARM', 'TOO', 'ANY',
  'SUN', 'LET', 'PUT', 'END', 'WHY', 'TRY', 'GOD', 'SIX',
  'DOG', 'EAR', 'AGO', 'SIT', 'FUN', 'BAD', 'YES', 'YET',
  'CAR', 'JOB', 'LOT', 'BED', 'HIT', 'EAT', 'AGE', 'RED',
  'BIG', 'BOX', 'FEW', 'GOT', 'HOT', 'LAW', 'SON', 'WAR',
  'FAR', 'OFF', 'BAG', 'ART', 'BAR', 'BOY', 'DID', 'END',
  'FLY', 'GUN', 'LED', 'LIE', 'NET', 'PAY', 'ROW', 'SAD',
  'TAX', 'VAN', 'WIN', 'ZOO', 'ACT', 'BUY', 'CUP', 'DIG',
  'EGG', 'FIG', 'HAM', 'ICE', 'JAM', 'KEY', 'LAP', 'MUD',
  'NUT', 'OWL', 'PIG', 'RAG', 'SIP', 'TOY', 'URN', 'VET'
]);

export const validateWord = async (word: string): Promise<boolean> => {
  // Convert to uppercase for consistency
  const upperWord = word.toUpperCase();
  
  // Check if word exists in our British dictionary
  if (BRITISH_WORDS.has(upperWord)) {
    return true;
  }
  
  // In a real implementation, you would call a British English dictionary API here
  // For now, we'll accept words that are 2+ characters and contain only letters
  if (upperWord.length >= 2 && /^[A-Z]+$/.test(upperWord)) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.3; // 70% chance of being valid for demo purposes
  }
  
  return false;
};

export const isValidBritishWord = (word: string): boolean => {
  return BRITISH_WORDS.has(word.toUpperCase());
};
