import os

def update_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(path + ' updated')
    else:
        print(path + ' not matched')

# TypingGame
old_typing = """    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => {"""
new_typing = """    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      StorageManager.markWordLearned(currentWord.id);
      StorageManager.addWeakWord(currentWord.id, true);
      setStreak(prev => {"""

old_typing_wrong = """    } else {
      setStreak(0);
      setFeedback({ type: 'incorrect'"""
new_typing_wrong = """    } else {
      StorageManager.addWeakWord(currentWord.id, false);
      setStreak(0);
      setFeedback({ type: 'incorrect'"""

update_file('src/components/games/TypingGame.tsx', old_typing, new_typing)
update_file('src/components/games/TypingGame.tsx', old_typing_wrong, new_typing_wrong)

# PronunciationGame
old_pron1 = """        if (sim >= 80) {
          setCorrectAnswers(prev => prev + 1);
          setFeedback({ type: 'correct', message: '? Excellent pronunciation!' });"""
new_pron1 = """        if (sim >= 80) {
          setCorrectAnswers(prev => prev + 1);
          StorageManager.markWordLearned(currentWord.id);
          StorageManager.addWeakWord(currentWord.id, true);
          setFeedback({ type: 'correct', message: '? Excellent pronunciation!' });"""

old_pron2 = """        } else if (sim >= 60) {
          setFeedback({ type: 'close', message: '~ Close! Try again' });"""
new_pron2 = """        } else if (sim >= 60) {
          StorageManager.addWeakWord(currentWord.id, false);
          setFeedback({ type: 'close', message: '~ Close! Try again' });"""

old_pron3 = """        } else {
          setFeedback({ type: 'incorrect', message: '? Not quite right' });"""
new_pron3 = """        } else {
          StorageManager.addWeakWord(currentWord.id, false);
          setFeedback({ type: 'incorrect', message: '? Not quite right' });"""

update_file('src/components/games/PronunciationGame.tsx', old_pron1, new_pron1)
update_file('src/components/games/PronunciationGame.tsx', old_pron2, new_pron2)
update_file('src/components/games/PronunciationGame.tsx', old_pron3, new_pron3)
