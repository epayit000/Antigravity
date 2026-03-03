# SlideKiosk — Continuous Presentation Display

A beautiful, static kiosk website that displays PowerPoint slides continuously. Upload your PPTX, PDF, or image files and the slideshow plays on loop — perfect for digital signage, lobby displays, and information kiosks.

![SlideKiosk](https://img.shields.io/badge/SlideKiosk-v1.0-6c63ff?style=for-the-badge)

## ✨ Features

- **PPTX Parsing** — Upload `.pptx` files directly; slides are parsed client-side using JSZip
- **PDF Support** — Upload PDF files; each page becomes a slide rendered via PDF.js
- **Image Support** — Upload PNG/JPG images as slides
- **Continuous Playback** — Slides loop automatically with configurable duration
- **Smooth Transitions** — Fade, Slide, Zoom, or no transition effects
- **Fullscreen Mode** — One-click fullscreen for kiosk displays
- **Persistent Storage** — Slides are saved in IndexedDB and survive page reloads
- **Replace on Upload** — Simply upload a new file to replace the current presentation
- **Keyboard Shortcuts** — Arrow keys, Space, P (pause), F (fullscreen), Esc (back)
- **Beautiful Dark UI** — Premium design with glassmorphism and micro-animations
- **100% Static** — No server needed; runs entirely in the browser

## 🚀 Quick Start

### Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/slidekiosk.git
cd slidekiosk

# Serve with any static server
python3 -m http.server 8080
# or
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080)

### Deploy to GitHub Pages

1. **Create a new GitHub repository** (e.g., `slidekiosk`)

2. **Push the code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SlideKiosk"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/slidekiosk.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repo → **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Select **main** branch and **/ (root)** folder
   - Click **Save**

4. Your site will be live at `https://YOUR_USERNAME.github.io/slidekiosk/`

## 🎮 Usage

1. **Upload** — Drag & drop a PPTX, PDF, or images onto the upload zone (or click to browse)
2. **Watch** — The slideshow starts automatically in a continuous loop
3. **Control** — Move the mouse to reveal controls (pause, next, prev, fullscreen, settings)
4. **Replace** — Go back to home and upload a new file to replace the current slides
5. **Settings** — Adjust slide duration, transition type/speed, background color, and fit mode

### Keyboard Shortcuts (during slideshow)

| Key | Action |
|-----|--------|
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `P` | Pause / Resume |
| `F` | Toggle fullscreen |
| `Esc` | Close settings / Exit fullscreen / Go back |

## 📁 Project Structure

```
slidekiosk/
├── index.html      # Main HTML structure
├── styles.css      # Design system & all styles
├── app.js          # Application logic (parsing, slideshow, storage)
└── README.md       # This file
```

## 🔧 Configuration

All settings are adjustable from the in-app settings panel:

| Setting | Default | Range |
|---------|---------|-------|
| Slide Duration | 5 seconds | 2–30 seconds |
| Transition | Fade | Fade, Slide Left, Slide Up, Zoom, None |
| Transition Speed | 0.8 seconds | 0.2–2.0 seconds |
| Background | Dark (#0a0a0f) | Dark, White, Navy, GitHub Dark, Deep Blue |
| Slide Fit | Contain | Contain, Cover, Actual Size |

Settings are persisted in `localStorage`.

## 🛠 Technical Details

- **PPTX Parsing**: Uses [JSZip](https://stuk.github.io/jszip/) to decompress PPTX files (which are ZIP archives), then parses slide XML to extract text, titles, and images
- **PDF Rendering**: Uses [PDF.js](https://mozilla.github.io/pdf.js/) to render each page as a canvas, then converts to data URLs
- **Storage**: IndexedDB for slide data (survives page reloads), localStorage for settings
- **No Build Step**: Pure HTML/CSS/JS — no bundler, no framework, no dependencies to install

## 📄 License

MIT License — use freely for personal or commercial kiosk displays.
