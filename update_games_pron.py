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

old_pron1 = """        if (sim >= 80) {
          setCorrectAnswers(prev => prev + 1);
          setFeedback({ type: 'correct', message: '? Excellent pronunciation!' });"""
new_pron1 = """        if (sim >= 80) {
          setCorrectAnswers(prev => prev + 1);
          StorageManager.markWordLearned(currentWord.id);
          StorageManager.addWeakWord(currentWord.id, true);
          setFeedback({ type: 'correct', message: '? Excellent pronunciation!' });"""

old_pron3 = """        } else {
          setFeedback({ type: 'incorrect', message: '? Not quite right' });"""
new_pron3 = """        } else {
          StorageManager.addWeakWord(currentWord.id, false);
          setFeedback({ type: 'incorrect', message: '? Not quite right' });"""

update_file('src/components/games/PronunciationGame.tsx', old_pron1, new_pron1)
update_file('src/components/games/PronunciationGame.tsx', old_pron3, new_pron3)
