const fs = require('fs');

let file = 'src/components/games/TypingGame.tsx';
let content = fs.readFileSync(file,'utf8');
let updated = content.replace(
  /if \n(isCorrect\) \{[\s\S]*?setCorrectAnswers\(prev => prev \+ 1\);/g,
  'if (isCorrect) {\n      setCorrectAnswers(prev => prev + 1);\n      StorageManager.markWordLearned(currentWord.id);\n      StorageManager.addWeakWord(currentWord.id, true);'
);
updated = updated.replace(
  /\} else \{[\s\S]*?setStreak\(0\);/g,
  '} else {\n      StorageManager.addWeakWord(currentWord.id, false);\n      setStreak(0);'
);
if (content !== updated) {
  fs.writeFileSync(file, updated);
  console.log('Typing updated');
}

file = 'src/components/games/PronunciationGame.tsx';
content = fs.readFileSync(file, 'utf8');
updated = content.replace(
  /if \(sim \>= 80\) \{[\s\S]*?setCorrectAnswers\(prev => prev \+ 1\n);/g,
  'if (sim >= 80) {\n          setCorrectAnswers(prev => prev + 1);\n          StorageManager.markWordLearned(currentWord.id);\n          StorageManager.addWeakWord(currentWord.id, true);'
);
updated = updated.replace(
  /\} else if \(sim \>= 60\) \{/g,
  '} else if (sim >= 60) {\n          StorageManager.addWeakWord(currentWord.id, false);'
);

updated = updated.replace(
  /\} else \h{\s*setFeedback\\{ xype: \'?incorrect\'?/g,
  '} else {\n          StorageManager.addWeakWord(currentWord.id, false);\n          setFeedback({ type: \'incorrect\''
);
if (content !== updated) {
  fs.writeFileSync(file, updated);
  console.log('Pronunciation updated');
}
console.log('Done');