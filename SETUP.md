# 🚀 German Vocab Game - Setup Guide

## Prerequisites

### 1. Install Node.js
If you haven't already installed Node.js, download and install it from: **https://nodejs.org**

- Download the **LTS (Long Term Support)** version
- Run the installer
- Accept all default options
- **Restart your computer** after installation

Verify installation by opening PowerShell and running:
```powershell
node --version
npm --version
```

Both should show version numbers (e.g., v18.17.0, 9.6.7)

---

## Installation Steps

### Step 1: Open PowerShell in Project Directory

1. Open the project folder: `c:\Users\SARAN J THILAK\New projects\German app`
2. Right-click in the empty space
3. Select **"Open PowerShell window here"** (or open PowerShell and run):
```powershell
cd "c:\Users\SARAN J THILAK\New projects\German app"
```

### Step 2: Install Dependencies

Run this command to install all required packages:
```powershell
npm install
```

This will:
- Download React, TypeScript, Tailwind CSS, and Vite
- Create a `node_modules` folder
- Generate `package-lock.json`

**Wait time**: 2-5 minutes depending on internet speed

### Step 3: Start Development Server

Once installation completes, run:
```powershell
npm run dev
```

You should see output like:
```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

The app will automatically open in your default browser at **http://localhost:3000**

---

## 🎮 First Steps in the Game

1. **Set Your Name**: Click ⚙️ (Settings) in the top right → Enter your name
2. **Start a Game**: Choose from 5 game types on the home screen
3. **Complete Games**: Earn XP and unlock achievements
4. **Track Progress**: Check your stats on the dashboard

---

## 🛠️ Development Commands

### Run Development Server
```powershell
npm run dev
```
Starts hot-reload development server (automatically refreshes on code changes)

### Build for Production
```powershell
npm run build
```
Creates optimized production build in `dist/` folder

### Preview Production Build
```powershell
npm run preview
```
Tests the production build locally

### Lint Code
```powershell
npm run lint
```
Checks code for errors and style issues

---

## 📁 Project Structure

```
German app/
├── src/
│   ├── components/        # React components
│   │   ├── games/         # 5 game components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Settings.tsx    # Settings panel
│   │   └── ...
│   ├── data/
│   │   └── vocabulary.ts   # 540+ German words
│   ├── utils/
│   │   ├── storage.ts      # LocalStorage management
│   │   └── speech.ts       # Speech API integration
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind config
├── vite.config.ts          # Vite config
├── README.md               # Full documentation
└── .gitignore              # Git ignore rules
```

---

## ⚙️ Troubleshooting

### Problem: "npm not found"
**Solution**: 
- Node.js is not installed or not in PATH
- Restart your computer after installing Node.js
- Or reinstall Node.js

### Problem: Port 3000 already in use
**Solution**: 
- Run: `npm run dev -- --port 3001`
- Or close the application using port 3000

### Problem: Node modules not installing
**Solution**:
```powershell
# Delete node_modules and package-lock.json
rm -r node_modules
rm package-lock.json
# Reinstall
npm install
```

### Problem: Speech Recognition not working
**Solution**:
- Use Chrome, Edge, or Firefox (Firefox has limited support)
- Make sure microphone is enabled in browser
- Grant microphone permissions when prompted

### Problem: Changes not showing in browser
**Solution**:
- Clear browser cache (Ctrl + Shift + Delete)
- Hard refresh browser (Ctrl + Shift + R)
- Restart dev server (press Ctrl+C and run `npm run dev` again)

---

## 🌐 Browser Requirements

For best experience:
- **Chrome 90+** - Full support (recommended)
- **Edge 90+** - Full support
- **Firefox 88+** - Full support except speech recognition
- **Safari 14+** - Limited speech support

---

## 📱 Mobile Support

The app is **fully responsive** and works on:
- Tablets (iPad, Android)
- Mobile phones (iOS, Android)
- Desktops (Windows, Mac, Linux)

Open on mobile by finding your local IP:
```powershell
ipconfig
```
Look for IPv4 address (usually 192.168.x.x), then visit:
`http://192.168.x.x:3000` on your mobile device

---

## 💾 Data Storage

All progress is saved locally in your browser:
- **Chrome**: Settings → Privacy → Clear browsing data (won't delete localStorage unless selected)
- **Firefox**: Preferences → Privacy → History → Clear History (carefully select options)
- **Edge**: Settings → Privacy → Clear browsing data

**Export your progress**:
1. Click ⚙️ Settings
2. Click 📥 Export Progress
3. Your data is downloaded as JSON file

---

## 🎓 Next Steps

1. **Explore all 5 games** to find your favorite
2. **Complete daily challenges** for streak rewards
3. **Unlock achievements** by reaching milestones
4. **Reach Level 5** to become a German Master!
5. **Export progress** periodically as backup

---

## 📞 Getting Help

- Check **README.md** for detailed documentation
- Review code comments for implementation details
- Test in different browsers
- Check browser console (F12) for any errors

---

**Happy Learning! 🇩🇪 Viel Erfolg!**

Questions? Stuck? Don't worry - the game is designed to be intuitive and fun!
