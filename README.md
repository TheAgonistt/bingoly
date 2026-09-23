# Bingo Card Generator

A modern, responsive, and fully-featured Bingo Card Generator built with **Vue 3**, **Vite**, and **TypeScript**. This tool allows users to design, customize, and export printable or playable bingo cards with ease.

## ✨ Features

- **Dynamic Grids:** Choose from 3×3 up to 7×7 grid sizes.
- **Rich Cell Customization:** Edit cells inline, upload images (with cover/contain fitting), lock specific cells in place, or auto-fit text length.
- **Bulk Import:** Quickly paste a comma-separated or newline-separated list of words to auto-populate your grid.
- **Shuffle & Randomize:** Scramble unlocked cells while preserving your locked cells and the center Free Space.
- **Live Theme Editor:** Fully customize colors, fonts, and border radius in real-time.
- **Play Mode:** Switch from "Design" to "Play" mode to get a clean UI and mark off cells with animated dauber stamps.
- **Bulk Export:** Export your designs as **PNG**, **JPEG**, or **PDF**. Enter a quantity (e.g., 10) to automatically generate and download a `.zip` bundle or multi-page PDF of randomly shuffled, unique cards.
- **Dark Mode:** Built-in dark mode support.
- **Mobile Friendly:** Fully responsive UI with touch-optimized drag-and-drop and tap gestures.

## 🛠 Tech Stack

- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Build Tool:** Vite
- **Language:** TypeScript
- **Icons:** Lucide Vue (`@lucide/vue`)
- **Drag and Drop:** `vue-draggable-plus` (wrapper for SortableJS)
- **Exports:** `html-to-image`, `jspdf`, `jszip`
- **Testing:** Vitest, Vue Test Utils, jsdom

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

Start the local dev server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

Compile and minify for production:

```bash
npm run build
```

This will create a `dist/` folder containing the compiled assets ready to be deployed to any static host (Vercel, Netlify, GitHub Pages, etc.).

## 🧪 Testing

This project uses **Vitest** for unit testing. The core business logic (e.g., shuffling algorithms, grid resizing, state management) is fully tested.

To run the test suite:
```bash
npm run test
```

To run tests in watch mode (ideal during development):
```bash
npx vitest
```

## 📁 Project Structure

```text
src/
├── assets/
│   └── main.css               # Global styles, variables, and dark mode rules
├── components/
│   ├── BingoApp.vue           # Main application layout & state wiring
│   ├── BingoBoard.vue         # The grid container and drag-and-drop logic
│   ├── BingoCell.vue          # Individual cell rendering (text, images, lock)
│   ├── ControlPanel.vue       # Sidebar settings and export controls
│   ├── BulkImportModal.vue    # Modal for pasting word lists
│   └── CellEditModal.vue      # Advanced edit modal for cells
├── composables/
│   ├── useBingoGrid.ts        # Core state and logic (shuffling, grid math)
│   └── useExport.ts           # Logic for PDF/Image capture and ZIP bundling
├── types/
│   └── bingo.ts               # Shared TypeScript interfaces
├── App.vue                    # Root component
└── main.ts                    # Application entry point
```

## 💡 Technical Notes

- **CSS Grid & Aspect Ratio:** The bingo board utilizes CSS Grid with `min-width: 0; min-height: 0` constraints to ensure long unbroken words don't warp the grid tracks, paired with `aspect-ratio: 1 / 1` for perfect squares.
- **iOS Touch Quirks:** To ensure dialog inputs work flawlessly on Safari/iOS, `:hover` states are strictly wrapped in `@media (hover: hover)` queries. This prevents the browser from consuming tap events to "un-hover" hidden action buttons.
- **Exporting Offsets:** The `html-to-image` library can sometimes capture unwanted window margins. The `useExport` composable explicitly overrides the clone's inline style (`margin: 0`, `transform: none`) before snapshotting to ensure the exported PNGs and PDFs are perfectly cropped.
