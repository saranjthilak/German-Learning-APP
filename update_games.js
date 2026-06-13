const fs = require('fs');

// QuizGame
let file = 'src/components/games/QuizGame.tsx';
let content = fs.readFileSync(file, 'utf8');
let updated = content.replace(
  /const handleAnswer = \(index: number\) => \{[\s\S]*?if \(index === questions\[currentQuestion\]\.correct\) \{[\s\S]*?setCorrectAnswers\(prev => prev \+ 1\);[\s\S]*?\}[\s\S]*?\};/,
  `const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === questions[currentQuestion].correct;
    const wordId = questions[currentQuestion].word.id;

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      StorageManager.markWordLearned(wordId);
      StorageManager.addWeakWord(wordId, true);
    } else {
      StorageManager.addWeakWord(wordId, false);
    }
  };`
);
if (content !== updated) {
  fs.writeFileSync(file, updated);
  console.log('QuizGame updated');
} else {
  console.log('QuizGame not matched');
}

// MemoryGame
file = 'src/components/games/MemoryGame.tsx';
content = fs.readFileSync(file, 'utf8');
updated = content.replace(
  /const checkMatch = \(indices: number\[\]\) => \{[\s\S]*?if \(card1\.wordId === card2\.wordId\) \{[\s\S]*?setMatched\(prev => new Set\(\[\.\.\.prev, \.\.\.indices\]\)\);[\s\S]*?setCorrectMatches\(prev => prev \+ 1\);[\s\S]*?if \(matched\.size \+ 2 === cards\.length\) \{[\s\S]*?setTimeout\(\(\) => completeGame\(\), 500\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?setFlipped\(new Set\(\)\);[\s\S]*?setIsChecking\(false\);[\s\S]*?\}, 1000\);[\s\S]*?\};/,
  `const checkMatch = (indices: number[]) => {
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
  };`
);
if (content !== updated) {
  fs.writeFileSync(file, updated);
  console.log('MemoryGame updated');
} else {
  console.log('MemoryGame not matched');
}
