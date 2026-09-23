<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { BingoCell, BingoConfig, AppMode, CellUpdate } from '@/types/bingo'
import BingoCellComponent from './BingoCell.vue'

const props = defineProps<{
  cells: BingoCell[]
  config: BingoConfig
  mode: AppMode
}>()

const emit = defineEmits<{
  (e: 'update:cell', payload: { id: string; updates: CellUpdate }): void
  (e: 'toggle-lock', id: string): void
  (e: 'toggle-mark', id: string): void
  (e: 'edit-cell', id: string): void
  (e: 'reorder', cells: BingoCell[]): void
}>()

const boardRef = ref<HTMLElement | null>(null)

defineExpose({ boardRef })

const localCells = ref<BingoCell[]>([...props.cells])

watch(() => props.cells, (newCells) => {
  const currentIds = localCells.value.map(c => c.id).join(',')
  const newIds = newCells.map(c => c.id).join(',')
  
  if (currentIds !== newIds) {
    localCells.value = [...newCells]
  } else {
    // Sync deeply if content changes but not order
    localCells.value = [...newCells]
  }
}, { deep: true, immediate: true })

watch(localCells, (newLocal) => {
  const currentIds = props.cells.map(c => c.id).join(',')
  const newIds = newLocal.map(c => c.id).join(',')
  
  if (currentIds !== newIds) {
    emit('reorder', [...newLocal])
  }
}, { deep: true })

const themeStyles = computed(() => ({
  '--primary-color': props.config.theme.primaryColor,
  '--card-bg': props.config.theme.cardBackground,
  '--cell-bg': props.config.theme.cellBackground,
  '--cell-border': props.config.theme.cellBorderColor,
  '--text-color': props.config.theme.textColor,
  '--font-family': props.config.theme.fontFamily,
  '--border-radius': props.config.theme.borderRadius,
  '--grid-size': props.config.gridSize,
}))
</script>

<template>
  <div ref="boardRef" class="bingo-card" :style="themeStyles">
    <!-- Title -->
    <h1 v-if="config.title" class="card-title">{{ config.title }}</h1>
    <p v-if="config.subtitle" class="card-subtitle">{{ config.subtitle }}</p>
    
    <!-- Header row -->
    <div v-if="config.hasHeader" class="header-row" :style="{ '--grid-size': config.gridSize }">
      <div v-for="(letter, index) in config.headerLetters.slice(0, config.gridSize)" :key="`header-${index}`" class="header-cell">
        {{ letter }}
      </div>
    </div>
    
    <!-- Grid with drag-and-drop -->
    <VueDraggable 
      v-model="localCells" 
      :animation="200" 
      ghostClass="ghost" 
      :disabled="mode === 'play'" 
      filter=".locked"
      :delay="200"
      :delayOnTouchOnly="true"
      :touchStartThreshold="5"
      class="bingo-grid"
      :style="{ '--grid-size': config.gridSize }"
    >
      <BingoCellComponent 
        v-for="cell in localCells" 
        :key="cell.id" 
        :cell="cell" 
        :mode="mode" 
        :grid-size="config.gridSize" 
        @update:cell="(payload: { id: string; updates: CellUpdate }) => emit('update:cell', payload)"
        @toggle-lock="(id: string) => emit('toggle-lock', id)"
        @toggle-mark="(id: string) => emit('toggle-mark', id)"
        @edit-cell="(id: string) => emit('edit-cell', id)"
      />
    </VueDraggable>
  </div>
</template>

<style scoped>
.bingo-card {
  max-width: 600px;
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  font-family: var(--font-family);
  color: var(--text-color);
}

.card-title {
  text-align: center;
  font-size: clamp(1.2rem, 3vw, 2rem);
  font-weight: 800;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.card-subtitle {
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.7;
  margin-bottom: 1rem;
}

.header-row {
  display: grid;
  grid-template-columns: repeat(var(--grid-size), minmax(0, 1fr));
  gap: 8px;
}

.header-cell {
  text-align: center;
  font-weight: 700;
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  color: var(--primary-color);
  padding: 0.25rem;
}

.bingo-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-size), minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.ghost {
  opacity: 0.4;
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

@media print {
  .bingo-card {
    max-width: none;
    width: 100%;
    box-shadow: none;
    margin: 0;
    padding: 0;
  }
}
</style>
