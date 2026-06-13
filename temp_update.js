const fs = require('fs');
const file = 'src/components/games/MemoryGame.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = \  const checkMatch = (indices: number[]) => {
    setIsChecking(true);
    const card1 = cards[indices[0]];
    const card2 = cards[indices[1]];

    setTimeout(() => {
      if (card1.wordId === card2.wordId) {
        // Match found
        setMatched(prev => new Set([...prev, ...indices]));
        setCorrectMatches(prev => prev + 1);

        if (matched.size + 2 === cards.length) {
          setTimeout(() => completeGame(), 500);
        }
      }

      setFlipped(new Set());
      setIsChecking(false);
    }, 1000);
  };\;

const newStr = \  const checkMatch = (indices: number[]) => {
    setIsChecking(true);
    const card1 = cards[indices[0]];
    const card2 = cards[indices[1]];

    setTimeout(() => {
      const isMatch = card1.wordId === card2.wordId;
      if (isMatch) {
        // Match found
        setMatched(prev => new Set([...prev, ...indices]));
        setCorrectMatches(prev => prev + 1);
        StorageManager.markWordLearned(card1.wordId);
        StorageManager.addWeakWord(card1.wordId, true);

        if (matched.size + 2 === cards.length) {
          setTimeout(() => completeGame(), 500);
        }
      } else {
        StorageManager.addWeakWord(card1.wordId, false);
      }

      setFlipped(new Set());
      setIsChecking(false);
    }, 1000);
  };\;

if(content.includes(oldStr)) {
  fs.writeFileSync(file, content.replace(oldStr, newStr));
  console.log('Success MemoryGame');
} else {
  console.log('Pattern not found MemoryGame');
}
