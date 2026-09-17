<script setup lang="ts">
import { ref, computed } from 'vue'
import { Menu, X } from '@lucide/vue'
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
const sidebarOpen = ref<boolean>(true) // for mobile toggle

// Computed
const unlockedCount = computed(() => {
  return cells.value.filter(c => !c.isLocked && !c.isFreeSpace).length
})

// Event Handlers
async function handleExportImage(format: 'png' | 'jpeg') {
  if (boardComponent.value?.boardRef) {
    await exportAsImage(boardComponent.value.boardRef, format, config.value.title || 'bingo-card')
  }
}

async function handleExportPdf() {
  if (boardComponent.value?.boardRef) {
    await exportAsPdf(boardComponent.value.boardRef, config.value.title || 'bingo-card')
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
    </header>
    
    <!-- Sidebar -->
    <aside class="sidebar no-print" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <h2>Bingo Card Generator</h2>
      </div>
      <ControlPanel 
        :config="config" 
        :mode="mode" 
        :unlocked-count="unlockedCount"
        @update-config="handleConfigUpdate"
        @update-theme="handleThemeUpdate"
        @set-grid-size="setGridSize"
        @shuffle="shuffleGrid"
        @clear="clearAll"
        @toggle-mode="toggleMode"
        @show-bulk-import="showBulkImport = true"
        @export-image="handleExportImage"
        @export-pdf="handleExportPdf"
      />
    </aside>
    
    <!-- Mobile overlay -->
    <div class="sidebar-overlay no-print" v-if="sidebarOpen" @click="sidebarOpen = false"></div>
    
    <!-- Main content -->
    <main class="main-content">
      <BingoBoard 
        ref="boardComponent" 
        :cells="cells" 
        :config="config" 
        :mode="mode" 
        @edit-cell="handleEditCell"
        @toggle-lock="toggleLock"
        @toggle-mark="toggleMark"
        @reorder="handleReorder"
      />
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
  </div>
</template>

<style scoped>
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
  padding-bottom: 2rem;
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary-color, #6c5ce7);
  margin: 0;
}

.sidebar-overlay {
  display: none;
}

.main-content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  min-height: 100dvh;
  background: #f0f2f5;
  overflow-x: hidden;
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
    padding: 1rem;
    padding-top: calc(56px + 1rem);
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
</style>
