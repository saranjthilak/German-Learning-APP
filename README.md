# 🇩🇪 German A1 Vocabulary Learning Game

A modern, interactive web application to learn German A1 vocabulary through engaging games, inspired by Duolingo. Built with React + TypeScript + Tailwind CSS.

## 🎮 Features

### Game Types
- **Matching Game** - Drag and drop to match German words with English translations
- **Memory Game** - Flip cards and find matching pairs
- **Quiz** - Multiple choice questions to test your knowledge
- **Typing Challenge** - Type German words for English translations
- **Pronunciation** - Speak German words and get pronunciation feedback

### Learning Features
- 540+ German A1 vocabulary words across 15 categories
- XP and Level system (Duolingo-inspired)
- Achievement system with 6+ achievements
- Daily challenges with streak tracking
- Leaderboard with local progress tracking
- Smart review for weak words
- Dark/Light mode toggle
- Spaced repetition algorithm

### Categories
- Greetings (30)
- Family (30)
- Food (50)
- Animals (30)
- Colors (20)
- Numbers (23)
- Home (30)
- School (30)
- Time & Dates (30)
- Weather (20)
- Travel (30)
- Work (30)
- Shopping (30)
- Transportation (20)
- Health (30)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm installed

### Installation

1. **Clone or navigate to the project directory:**
```bash
cd "c:\Users\SARAN J THILAK\New projects\German app"
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The application will open automatically in your browser at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

The optimized production build will be in the `dist` folder.

## 📊 Statistics & Progression

### XP System
- Matching Game: 10-50 XP per match
- Memory Game: 60 XP on completion
- Quiz: 50 XP + 20 bonus for 80%+ accuracy
- Typing: 50 XP + 5 XP per streak
- Pronunciation: 60 XP on completion
- Daily Challenge Bonus: 100 XP

### Levels
- **Level 1**: Beginner (0-100 XP)
- **Level 2**: Explorer (100-200 XP)
- **Level 3**: Learner (200-300 XP)
- **Level 4**: Speaker (300-400 XP)
- **Level 5+**: Master

### Achievements
- 🏆 First 100 XP
- 🏆 First Game
- 🏆 Learn 50 Words
- 🏆 7-Day Streak
- 🏆 Perfect Quiz
- 🏆 Level 5 Master

## 💾 Data Storage

All progress is saved locally in the browser using localStorage:
- Player name and statistics
- Game sessions and history
- Weak words for review
- Daily challenges and streaks
- Achievements
- Theme preference (dark/light mode)

### Export/Import Progress
Export your progress as JSON from Settings → Export Progress

### Reset Data
You can reset all data from Settings. **This action cannot be undone!**

## 🎯 How to Play

### Matching Game
1. Choose difficulty (10, 15, or 20 words)
2. Select a German word and an English translation
3. Click "Match Pair" to check if they match
4. Green = correct, Red = incorrect
5. Complete all matches to finish

### Memory Game
1. Choose difficulty
2. Flip cards to reveal German or English words
3. Find matching pairs
4. Fewer moves = higher score

### Quiz
1. Read the German word
2. Select the correct English translation from 4 options
3. Get instant feedback
4. Complete all questions

### Typing Challenge
1. Read the English word
2. Type the German equivalent
3. Press Enter or click "Check Answer"
4. Maintain streaks for bonus points!

### Pronunciation
1. Listen to the native German pronunciation
2. Click "Click to Speak" and say the word into your microphone
3. Get accuracy feedback (80%+ = success)
4. Continue to next word

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS 3
- **Build Tool**: Vite
- **Storage**: Browser LocalStorage
- **Speech**: Web Speech API (SpeechSynthesis & SpeechRecognition)
- **Dev Server**: Vite (hot reload)

## 📁 Project Structure

```
src/
├── components/
│   ├── games/
│   │   ├── MatchingGame.tsx
│   │   ├── MemoryGame.tsx
│   │   ├── QuizGame.tsx
│   │   ├── TypingGame.tsx
│   │   └── PronunciationGame.tsx
│   ├── Dashboard.tsx
│   ├── GameMenu.tsx
│   ├── AchievementsPanel.tsx
│   ├── Leaderboard.tsx
│   ├── DailyChallenge.tsx
│   ├── Settings.tsx
│   └── ThemeToggle.tsx
├── data/
│   └── vocabulary.ts (540+ words)
├── types/
│   └── index.ts
├── utils/
│   ├── storage.ts (LocalStorage management)
│   └── speech.ts (Speech API & utilities)
├── App.tsx
├── main.tsx
└── index.css
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Note**: Speech Recognition & Synthesis APIs work best in Chrome/Edge.

## 🎨 Customization

### Theme Colors
Edit `tailwind.config.ts` to change:
- Primary green: `#22c55e`
- Primary dark: `#16a34a`
- Accent blue: `#3b82f6`

### Difficulty Levels
Modify game components to add more difficulty options (currently 10, 15, 20 words).

### Add More Words
Edit `src/data/vocabulary.ts` to add more German vocabulary.

## 📈 Future Enhancements

- [ ] Backend integration with multiplayer leaderboard
- [ ] Spaced repetition algorithm refinement
- [ ] More game types (Flashcards, Crossword)
- [ ] Offline mode with service workers
- [ ] Mobile app (React Native)
- [ ] Audio pronunciation recording
- [ ] Community word database
- [ ] Progress analytics dashboard
- [ ] Grammar lessons
- [ ] Conversation mode with AI

## 🐛 Known Issues & Limitations

- Speech Recognition works best in Chrome/Edge
- LocalStorage has 5-10MB limit per domain
- No cloud sync (local storage only)
- Single player mode (local leaderboard)

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Feel free to fork, improve, and submit pull requests!

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Happy Learning! 🎓**

Made with ❤️ for German language learners
