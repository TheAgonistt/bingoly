<script setup lang="ts">
import { ref, computed, onMounted, watchEffect, nextTick } from 'vue'
import { Menu, X, Moon, Sun } from '@lucide/vue'
import BingoBoard from './BingoBoard.vue'
import ControlPanel from './ControlPanel.vue'
import BulkImportModal from './BulkImportModal.vue'
import CellEditModal from './CellEditModal.vue'
import { useBingoGrid } from '@/composables/useBingoGrid'
import { useExport } from '@/composables/useExport'
import type { BingoCell, BingoConfig, CardTheme, CellUpdate } from '@/types/bingo'

const {
  config,
  cells,
  mode,
  setGridSize,
  updateCell,
  toggleLock,
  toggleMark,
  shuffleGrid,
  autoPopulate,
  updateFreeSpace,
  toggleMode,
  clearAll
} = useBingoGrid()

const { exportAsImage, exportAsPdf } = useExport()

// Template refs
const boardComponent = ref<InstanceType<typeof BingoBoard> & { boardRef?: HTMLElement } | null>(null)

// Local State
const showBulkImport = ref<boolean>(false)
const editingCell = ref<BingoCell | null>(null)
const showCellEdit = ref<boolean>(false)
const sidebarOpen = ref<boolean>(typeof window !== 'undefined' && window.innerWidth >= 1024)
const isDark = ref<boolean>(true)
const exportProgress = ref<{ current: number; total: number } | null>(null)
const zoomLevel = ref<number>(100)

// Sync dark mode class on <html>
watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
})

// Computed
const unlockedCount = computed(() => {
  return cells.value.filter(c => !c.isLocked && !c.isFreeSpace).length
})

// Event Handlers
async function handleExportImage(payload: { format: 'png' | 'jpeg'; count: number }) {
  if (boardComponent.value?.boardRef) {
    const originalCells = [...cells.value]
    const originalMode = mode.value
    
    // Switch to play mode for clean export
    mode.value = 'play'
    await nextTick()
    await new Promise(r => setTimeout(r, 50))
    
    const progressCb = async (current: number, total: number) => {
      exportProgress.value = { current, total }
      if (current > 1) {
        shuffleGrid()
        await nextTick()
        await new Promise(r => setTimeout(r, 100))
      } else {
        await nextTick()
        await new Promise(r => setTimeout(r, 50))
      }
    }
    
    try {
      await exportAsImage(
        boardComponent.value.boardRef, 
        payload.format, 
        config.value.title || 'bingo-card', 
        payload.count, 
        progressCb
      )
    } finally {
      exportProgress.value = null
      mode.value = originalMode
      if (payload.count > 1) {
        cells.value = originalCells
      }
      await nextTick()
    }
  }
}

async function handleExportPdf(payload: { count: number }) {
  if (boardComponent.value?.boardRef) {
    const originalCells = [...cells.value]
    const originalMode = mode.value
    
    // Switch to play mode for clean export
    mode.value = 'play'
    await nextTick()
    await new Promise(r => setTimeout(r, 50))
    
    const progressCb = async (current: number, total: number) => {
      exportProgress.value = { current, total }
      if (current > 1) {
        shuffleGrid()
        await nextTick()
        await new Promise(r => setTimeout(r, 100))
      } else {
        await nextTick()
        await new Promise(r => setTimeout(r, 50))
      }
    }
    
    try {
      await exportAsPdf(
        boardComponent.value.boardRef, 
        config.value.title || 'bingo-card', 
        payload.count, 
        progressCb
      )
    } finally {
      exportProgress.value = null
      mode.value = originalMode
      if (payload.count > 1) {
        cells.value = originalCells
      }
      await nextTick()
    }
  }
}

function handleBulkImport(items: string[]) {
  autoPopulate(items)
  showBulkImport.value = false
}

function handleEditCell(id: string) {
  const cell = cells.value.find((c) => c.id === id)
  if (cell) {
    editingCell.value = cell
    showCellEdit.value = true
  }
}

function handleCellUpdate(payload: { id: string; updates: CellUpdate }) {
  updateCell(payload.id, payload.updates)
}

function handleSaveCell(payload: { id: string; updates: CellUpdate }) {
  updateCell(payload.id, payload.updates)
  showCellEdit.value = false
}

function handleConfigUpdate(partial: Partial<BingoConfig>) {
  const oldFreeSpaceText = config.value.freeSpaceText
  const oldShowFreeSpace = config.value.showFreeSpace

  config.value = { ...config.value, ...partial }

  if (
    (partial.freeSpaceText !== undefined && partial.freeSpaceText !== oldFreeSpaceText) ||
    (partial.showFreeSpace !== undefined && partial.showFreeSpace !== oldShowFreeSpace)
  ) {
    updateFreeSpace()
  }
}

function handleThemeUpdate(partial: Partial<CardTheme>) {
  config.value.theme = { ...config.value.theme, ...partial }
}

function handleReorder(newCells: BingoCell[]) {
  cells.value = newCells
}
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-open': sidebarOpen }">
    <!-- Mobile header -->
    <header class="mobile-header no-print">
      <button @click="sidebarOpen = !sidebarOpen" class="menu-toggle" aria-label="Toggle menu">
        <Menu v-if="!sidebarOpen" />
        <X v-else />
      </button>
      <h1>Bingo Card Generator</h1>
      <button class="dark-toggle" @click="isDark = !isDark" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
        <Sun v-if="isDark" :size="18" />
        <Moon v-else :size="18" />
      </button>
    </header>
    
    <!-- Sidebar -->
    <aside class="sidebar no-print" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <h2>Bingo Card Generator</h2>
        <button class="dark-toggle" @click="isDark = !isDark" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <Sun v-if="isDark" :size="18" />
          <Moon v-else :size="18" />
        </button>
      </div>
      <ControlPanel 
        :config="config" 
        :mode="mode" 
        :unlocked-count="unlockedCount"
        @update:config="handleConfigUpdate"
        @update:theme="handleThemeUpdate"
        @set-grid-size="setGridSize"
        @shuffle="shuffleGrid"
        @clear-all="clearAll"
        @toggle-mode="toggleMode"
        @open-bulk-import="showBulkImport = true"
        @export-image="handleExportImage"
        @export-pdf="handleExportPdf"
      />
    </aside>
    
    <!-- Mobile overlay -->
    <div class="sidebar-overlay no-print" v-if="sidebarOpen" @click="sidebarOpen = false"></div>
    
    <!-- Main content -->
    <main class="main-content">
      <div class="board-zoom-wrapper" :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }">
        <BingoBoard 
          ref="boardComponent" 
          :cells="cells" 
          :config="config" 
          :mode="mode" 
          @update:cell="handleCellUpdate"
          @edit-cell="handleEditCell"
          @toggle-lock="toggleLock"
          @toggle-mark="toggleMark"
          @reorder="handleReorder"
        />
      </div>

      <!-- Zoom toolbar (Word-style, pinned to bottom) -->
      <div class="zoom-toolbar no-print">
        <button class="zoom-btn" @click="zoomLevel = Math.max(50, zoomLevel - 10)" aria-label="Zoom out">−</button>
        <input
          type="range"
          class="zoom-slider"
          min="50"
          max="200"
          step="5"
          v-model.number="zoomLevel"
          aria-label="Zoom level"
        />
        <button class="zoom-btn" @click="zoomLevel = Math.min(200, zoomLevel + 10)" aria-label="Zoom in">+</button>
        <button class="zoom-reset" @click="zoomLevel = 100" :class="{ active: zoomLevel !== 100 }">{{ zoomLevel }}%</button>
      </div>
    </main>
    
    <!-- Modals -->
    <BulkImportModal 
      :open="showBulkImport" 
      :available-slots="unlockedCount" 
      @close="showBulkImport = false" 
      @import="handleBulkImport" 
    />
    <CellEditModal 
      :cell="editingCell" 
      :open="showCellEdit" 
      @close="showCellEdit = false" 
      @save="handleSaveCell" 
    />

    <!-- Export Progress Overlay -->
    <div class="export-overlay no-print" v-if="exportProgress">
      <div class="export-progress-card">
        <div class="spinner"></div>
        <h3>Generating Cards</h3>
        <p>Exporting {{ exportProgress.current }} / {{ exportProgress.total }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-progress-card {
  background: var(--card-bg, #ffffff);
  color: var(--text-color, #333);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 280px;
}

html.dark .export-progress-card {
  background: #1e2030;
  color: #e2e8f0;
}

.export-progress-card h3 {
  margin: 0;
  font-size: 1.25rem;
}

.export-progress-card p {
  margin: 0;
  color: var(--primary-color, #6c5ce7);
  font-weight: 600;
  font-size: 1.1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(108, 92, 231, 0.2);
  border-left-color: var(--primary-color, #6c5ce7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width, 340px) 1fr;
  min-height: 100dvh;
}

.mobile-header {
  display: none;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  background: white;
  border-right: 1px solid #e5e7eb;
  padding-bottom: 4rem;
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary-color, #6c5ce7);
  margin: 0;
}

.dark-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dark-toggle:hover {
  background: #e2e8f0;
  color: #1a1a2e;
}

.sidebar-overlay {
  display: none;
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem 2rem 80px; /* bottom pad for zoom bar */
  min-height: 100dvh;
  background: #f0f2f5;
  overflow-x: hidden;
  position: relative;
}

.board-zoom-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  /* transform is applied inline; transform-origin keeps it top-centered */
}

/* ---- Zoom Toolbar ---- */
.zoom-toolbar {
  position: fixed;
  bottom: 0;
  right: 0;
  left: var(--sidebar-width, 340px); /* align with main column */
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0 1.5rem;
  background: var(--zoom-bar-bg, #f0f2f5);
  border-top: 1px solid var(--zoom-bar-border, #e2e8f0);
  z-index: 50;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--zoom-bar-border, #cbd5e1);
  background: var(--zoom-btn-bg, white);
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

@media (hover: hover) and (pointer: fine) {
  .zoom-btn:hover {
    background: var(--zoom-btn-hover, #e2e8f0);
  }
}

.zoom-slider {
  width: 120px;
  cursor: pointer;
  accent-color: var(--primary-color, #6c5ce7);
}

.zoom-reset {
  min-width: 52px;
  height: 28px;
  padding: 0 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--zoom-bar-border, #cbd5e1);
  background: var(--zoom-btn-bg, white);
  color: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.zoom-reset.active {
  border-color: var(--primary-color, #6c5ce7);
  color: var(--primary-color, #6c5ce7);
}

@media (hover: hover) and (pointer: fine) {
  .zoom-reset:hover {
    background: var(--zoom-btn-hover, #e2e8f0);
  }
}

@media (max-width: 1023px) {
  .app-layout {
    display: block;
  }

  .mobile-header {
    display: flex;
    align-items: center;
    height: 56px;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    z-index: 100;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 0 1rem;
  }
  
  .mobile-header h1 {
    font-size: 1.2rem;
    margin-left: 1rem;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: 0;
    flex: 1;
  }

  .menu-toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    color: #1a1a2e;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100dvh;
    width: 320px;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 300ms ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 150;
  }

  .main-content {
    padding: 0.5rem;
    padding-top: calc(56px + 0.5rem);
    padding-bottom: 72px; /* space for zoom bar */
  }

  .zoom-toolbar {
    left: 0; /* full width on mobile, no sidebar */
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .app-layout {
    display: block;
  }
  .main-content {
    padding: 0;
    background: white;
  }
}

/* Dark mode zoom bar */
html.dark .zoom-toolbar {
  --zoom-bar-bg: #181a24;
  --zoom-bar-border: #2a2d3a;
  --zoom-btn-bg: #1e2030;
  --zoom-btn-hover: #2a2d3a;
}
</style>
