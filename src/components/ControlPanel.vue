<script setup lang="ts">
import { ref } from 'vue';
import type { BingoConfig, CardTheme, AppMode, GridDimension } from '@/types/bingo';
import {
  Shuffle as ShuffleIcon,
  List as ListIcon,
  Trash2 as TrashIcon,
  Pencil as PencilIcon,
  Play as PlayIcon,
  Image as ImageIcon,
  FileText as FileTextIcon
} from '@lucide/vue';

const props = defineProps<{
  config: BingoConfig;
  mode: AppMode;
  unlockedCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:config', payload: Partial<BingoConfig>): void;
  (e: 'update:theme', payload: Partial<CardTheme>): void;
  (e: 'shuffle'): void;
  (e: 'clear-all'): void;
  (e: 'toggle-mode'): void;
  (e: 'open-bulk-import'): void;
  (e: 'export-image', payload: { format: 'png' | 'jpeg'; count: number }): void;
  (e: 'export-pdf', payload: { count: number }): void;
  (e: 'set-grid-size', payload: GridDimension): void;
}>();

const gridSizes: GridDimension[] = [3, 4, 5, 6, 7];
const fontOptions = [
  '"system-ui", "-apple-system", sans-serif',
  '"Comic Sans MS", "Chalkboard SE", sans-serif',
  'Georgia, serif',
  '"Courier New", monospace',
  'Impact, sans-serif'
];

const exportCount = ref(1);

const updateConfig = (key: keyof BingoConfig, value: any) => {
  emit('update:config', { [key]: value });
};

const updateTheme = (key: keyof CardTheme, value: any) => {
  emit('update:theme', { [key]: value });
};

const updateHeaderLetter = (index: number, letter: string) => {
  const newLetters = [...props.config.headerLetters];
  newLetters[index] = letter;
  emit('update:config', { headerLetters: newLetters });
};

const handleClearAll = () => {
  if (confirm('Are you sure you want to clear all text and images? This cannot be undone.')) {
    emit('clear-all');
  }
};

const getBorderRadiusValue = (): number => {
  return parseInt(props.config.theme.borderRadius) || 0;
};

const setBorderRadiusValue = (val: string) => {
  updateTheme('borderRadius', `${val}px`);
};
</script>

<template>
  <aside class="control-panel">
    <div class="mode-toggle">
      <button 
        class="btn-large btn-mode" 
        :class="{ 'is-play': mode === 'play' }"
        @click="emit('toggle-mode')"
      >
        <PencilIcon v-if="mode === 'design'" :size="18" />
        <PlayIcon v-else :size="18" />
        <span>{{ mode === 'design' ? 'Design Mode' : 'Play Mode' }}</span>
      </button>
    </div>

    <!-- 1. Grid Size -->
    <details class="panel-section" name="panel-accordion">
      <summary>Grid Size</summary>
      <div class="section-content">
        <div class="grid-size-buttons">
          <button
            v-for="size in gridSizes"
            :key="size"
            class="btn-grid-size"
            :class="{ active: config.gridSize === size }"
            @click="emit('set-grid-size', size)"
            :disabled="mode === 'play'"
          >
            {{ size }}×{{ size }}
          </button>
        </div>
      </div>
    </details>

    <!-- 2. Card Details -->
    <details class="panel-section" name="panel-accordion" open>
      <summary>Card Details</summary>
      <div class="section-content">
        <div class="form-group">
          <label for="titleInput">Title</label>
          <input 
            id="titleInput"
            type="text" 
            :value="config.title" 
            @input="updateConfig('title', ($event.target as HTMLInputElement).value)"
            :disabled="mode === 'play'"
          />
        </div>
        
        <div class="form-group">
          <label for="subtitleInput">Subtitle</label>
          <input 
            id="subtitleInput"
            type="text" 
            :value="config.subtitle" 
            @input="updateConfig('subtitle', ($event.target as HTMLInputElement).value)"
            :disabled="mode === 'play'"
          />
        </div>

        <div class="form-group-inline">
          <label for="hasHeaderCheck">Show Header</label>
          <input 
            id="hasHeaderCheck"
            type="checkbox" 
            :checked="config.hasHeader"
            @change="updateConfig('hasHeader', ($event.target as HTMLInputElement).checked)"
            :disabled="mode === 'play'"
          />
        </div>
        
        <div v-if="config.hasHeader" class="header-letters">
          <input
            v-for="(letter, i) in config.headerLetters.slice(0, config.gridSize)"
            :key="i"
            type="text"
            class="header-letter-input"
            maxlength="1"
            :value="letter"
            @input="updateHeaderLetter(i, ($event.target as HTMLInputElement).value)"
            :disabled="mode === 'play'"
          />
        </div>

        <div class="form-group-inline">
          <label for="showFreeSpaceCheck">Free Space</label>
          <input 
            id="showFreeSpaceCheck"
            type="checkbox" 
            :checked="config.showFreeSpace"
            @change="updateConfig('showFreeSpace', ($event.target as HTMLInputElement).checked)"
            :disabled="mode === 'play' || config.gridSize % 2 === 0"
          />
        </div>

        <div v-if="config.showFreeSpace" class="form-group">
          <label for="freeSpaceTextInput">Free Space Text</label>
          <input 
            id="freeSpaceTextInput"
            type="text" 
            :value="config.freeSpaceText" 
            @input="updateConfig('freeSpaceText', ($event.target as HTMLInputElement).value)"
            :disabled="mode === 'play'"
          />
        </div>
      </div>
    </details>

    <!-- 3. Theme -->
    <details class="panel-section" name="panel-accordion">
      <summary>Theme & Styles</summary>
      <div class="section-content">
        <div class="color-grid">
          <div class="color-group">
            <label>Primary</label>
            <input 
              type="color" 
              :value="config.theme.primaryColor"
              @input="updateTheme('primaryColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-group">
            <label>Background</label>
            <input 
              type="color" 
              :value="config.theme.cardBackground"
              @input="updateTheme('cardBackground', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-group">
            <label>Cell Bg</label>
            <input 
              type="color" 
              :value="config.theme.cellBackground"
              @input="updateTheme('cellBackground', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-group">
            <label>Border</label>
            <input 
              type="color" 
              :value="config.theme.cellBorderColor"
              @input="updateTheme('cellBorderColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-group">
            <label>Text</label>
            <input 
              type="color" 
              :value="config.theme.textColor"
              @input="updateTheme('textColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="fontSelect">Font Family</label>
          <select 
            id="fontSelect" 
            :value="config.theme.fontFamily"
            @change="updateTheme('fontFamily', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="font in fontOptions" :key="font" :value="font">{{ font.replace(/"/g, '') }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Border Radius: {{ getBorderRadiusValue() }}px</label>
          <input 
            type="range" 
            min="0" 
            max="20" 
            :value="getBorderRadiusValue()"
            @input="setBorderRadiusValue(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </details>

    <!-- 4. Actions -->
    <details class="panel-section" name="panel-accordion">
      <summary>Actions</summary>
      <div class="section-content actions-grid">
        <button 
          class="btn-action" 
          @click="emit('shuffle')"
          :disabled="mode === 'play'"
        >
          <ShuffleIcon :size="16" />
          Shuffle ({{ unlockedCount }})
        </button>
        <button 
          class="btn-action" 
          @click="emit('open-bulk-import')"
          :disabled="mode === 'play'"
        >
          <ListIcon :size="16" />
          Bulk Import
        </button>
        <button 
          class="btn-action btn-danger" 
          @click="handleClearAll"
          :disabled="mode === 'play'"
        >
          <TrashIcon :size="16" />
          Clear All
        </button>
      </div>
    </details>

    <!-- 6. Export -->
    <details class="panel-section" name="panel-accordion">
      <summary>Export</summary>
      <div class="section-content">
        <div class="form-group">
          <label for="exportCount">Quantity (Randomized)</label>
          <input 
            type="number" 
            id="exportCount" 
            v-model.number="exportCount" 
            min="1" 
            max="100" 
            class="text-input" 
          />
          <p class="auto-hint">Exports {{ exportCount }} unique randomized card{{ exportCount > 1 ? 's' : '' }}.</p>
        </div>
        <div class="actions-grid">
          <button class="btn-action btn-export" @click="emit('export-image', { format: 'png', count: exportCount })">
            <ImageIcon :size="16" />
            PNG
          </button>
          <button class="btn-action btn-export" @click="emit('export-image', { format: 'jpeg', count: exportCount })">
            <ImageIcon :size="16" />
            JPEG
          </button>
          <button class="btn-action btn-export" @click="emit('export-pdf', { count: exportCount })">
            <FileTextIcon :size="16" />
            PDF
          </button>
        </div>
      </div>
    </details>
  </aside>
</template>

<style scoped>
.control-panel {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mode-toggle {
  margin-bottom: 0.5rem;
}

.btn-mode {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
  color: #3b82f6;
  border-color: #3b82f6;
}

.btn-mode.is-play {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
}

.panel-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.panel-section summary {
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #f1f5f9;
  cursor: pointer;
  user-select: none;
  list-style: none; /* Hide default marker in standard browsers */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-section summary::-webkit-details-marker {
  display: none; /* Hide in WebKit */
}

.panel-section summary::after {
  content: "▼";
  font-size: 0.7rem;
  color: #64748b;
  transition: transform 0.2s;
}

.panel-section[open] summary::after {
  transform: rotate(180deg);
}

.section-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  /*gap: 1rem;*/
}

.section-content .form-group:first-child {
  margin-block-start: 0;
}

.grid-size-buttons {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

.btn-grid-size {
  padding: 0.5rem 0;
  font-size: 0.8rem;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-grid-size:hover:not(:disabled) {
  background: #f1f5f9;
}

.btn-grid-size.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-grid-size:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-block-start: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
}

.form-group-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-group-inline label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
}

input[type="text"], select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

input[type="text"]:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
}

input[type="text"]:disabled, select:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.header-letters {
  display: flex;
  gap: 0.25rem;
  justify-content: space-between;
}

.header-letter-input {
  width: 2rem;
  text-align: center;
  text-transform: uppercase;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 0.5rem;
}

.color-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.color-group label {
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
  line-height: 1.1;
}

input[type="color"] {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

input[type="range"] {
  width: 100%;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-action:hover:not(:disabled) {
  background: #f1f5f9;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  color: #ef4444;
  border-color: #fca5a5;
}

.btn-danger:hover:not(:disabled) {
  background: #fef2f2;
}

.btn-export {
  background: #f8fafc;
}
</style>
