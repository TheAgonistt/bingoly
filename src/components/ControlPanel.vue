<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { BingoConfig, CardTheme, AppMode, GridDimension } from '@/types/bingo';
import {
  Shuffle    as ShuffleIcon,
  List       as ListIcon,
  Trash2     as TrashIcon,
  Pencil     as PencilIcon,
  Play       as PlayIcon,
  Image      as ImageIcon,
  FileText   as FileTextIcon,
  Megaphone  as MegaphoneIcon,
  Download   as DownloadIcon,
  LayoutGrid as LayoutGridIcon,
  Palette    as PaletteIcon,
  Type       as TypeIcon,
  Wrench     as WrenchIcon,
  RefreshCw  as RefreshCwIcon,
  BookOpen   as BookOpenIcon,
  Hash       as HashIcon,
  ListFilter as ListFilterIcon,
} from '@lucide/vue';

const props = defineProps<{
  config: BingoConfig;
  mode: AppMode;
  unlockedCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:config', payload: Partial<BingoConfig>): void;
  (e: 'update:theme',  payload: Partial<CardTheme>):  void;
  (e: 'shuffle'): void;
  (e: 'clear-all'): void;
  (e: 'reset-all'): void;
  (e: 'toggle-mode'): void;
  (e: 'open-bulk-import'): void;
  (e: 'export-image', payload: { format: 'png' | 'jpeg'; count: number; useWordBank: boolean }): void;
  (e: 'export-pdf',   payload: { count: number; useWordBank: boolean }): void;
  (e: 'set-grid-size', payload: GridDimension): void;
  (e: 'start-caller'): void;
  (e: 'fill-animals'): void;
}>();

const isDev = import.meta.env.DEV;

const gridSizes: GridDimension[] = [3, 4, 5, 6, 7];
const fontOptions = [
  'system-ui, -apple-system, sans-serif',
  '"Comic Sans MS", "Chalkboard SE", sans-serif',
  'Georgia, serif',
  '"Courier New", monospace',
  'Impact, sans-serif',
];

const exportCount = ref(1);
const useWordBank = ref(false);
const wordBankInput = ref('');
const callerCustomInput = ref('');

onMounted(() => {
  wordBankInput.value = (props.config.wordBank ?? []).join('\n');
  callerCustomInput.value = (props.config.callerCustomList ?? []).join('\n');
});

watch(
  () => props.config.wordBank,
  (bank) => {
    const joined = (bank ?? []).join('\n');
    if (joined !== wordBankInput.value) wordBankInput.value = joined;
  },
);

watch(
  () => props.config.callerCustomList,
  (list) => {
    const joined = (list ?? []).join('\n');
    if (joined !== callerCustomInput.value) callerCustomInput.value = joined;
  },
);

function parseList(raw: string): string[] {
  return raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

function saveWordBank() {
  emit('update:config', { wordBank: parseList(wordBankInput.value) });
}

function saveCallerCustomList() {
  emit('update:config', { callerCustomList: parseList(callerCustomInput.value) });
}

const updateConfig = (key: keyof BingoConfig, value: unknown) => emit('update:config', { [key]: value });
const updateTheme  = (key: keyof CardTheme,  value: unknown) => emit('update:theme',  { [key]: value });

const updateHeaderLetter = (index: number, letter: string) => {
  const letters = [...props.config.headerLetters];
  letters[index] = letter;
  emit('update:config', { headerLetters: letters });
};

const getBorderRadius = (): number => parseInt(props.config.theme.borderRadius) || 0;
const setBorderRadius = (v: string) => updateTheme('borderRadius', `${v}px`);

function handleClearAll() {
  if (confirm('Clear all cell text and images? This cannot be undone.')) emit('clear-all');
}
function handleResetAll() {
  if (confirm('Reset EVERYTHING to factory defaults? All cells, settings, and word bank will be lost.')) emit('reset-all');
}
</script>

<template>
  <aside class="control-panel">
    <!-- Mode toggle -->
    <div class="mode-toggle">
      <button class="btn-mode" :class="{ 'is-play': mode === 'play' }" @click="emit('toggle-mode')">
        <PencilIcon v-if="mode === 'design'" :size="18" />
        <PlayIcon   v-else :size="18" />
        {{ mode === 'design' ? 'Design Mode' : 'Play Mode' }}
      </button>
    </div>

    <!-- 1. Board -->
    <details class="panel-section" name="panel-accordion" open>
      <summary><LayoutGridIcon :size="13" /> Board</summary>
      <div class="section-content">
        <div class="form-group">
          <label>Grid Size</label>
          <div class="grid-size-buttons">
            <button
              v-for="size in gridSizes" :key="size"
              class="btn-grid-size" :class="{ active: config.gridSize === size }"
              @click="emit('set-grid-size', size)" :disabled="mode === 'play'"
            >{{ size }}x{{ size }}</button>
          </div>
        </div>
        <div class="form-group-inline">
          <label for="hasHeaderCheck">Show Header Row</label>
          <input id="hasHeaderCheck" type="checkbox"
            :checked="config.hasHeader"
            @change="updateConfig('hasHeader', ($event.target as HTMLInputElement).checked)"
            :disabled="mode === 'play'" />
        </div>
        <div v-if="config.hasHeader" class="form-group">
          <label>Header Letters</label>
          <div class="header-letters">
            <input
              v-for="(letter, i) in config.headerLetters.slice(0, config.gridSize)" :key="i"
              type="text" class="header-letter-input" maxlength="1"
              :value="letter"
              @input="updateHeaderLetter(i, ($event.target as HTMLInputElement).value)"
              :disabled="mode === 'play'" />
          </div>
        </div>
        <div class="form-group-inline">
          <label for="showFreeSpaceCheck">
            Free Space
            <span v-if="config.gridSize % 2 === 0" class="hint-inline">(odd grid only)</span>
          </label>
          <input id="showFreeSpaceCheck" type="checkbox"
            :checked="config.showFreeSpace"
            @change="updateConfig('showFreeSpace', ($event.target as HTMLInputElement).checked)"
            :disabled="mode === 'play' || config.gridSize % 2 === 0" />
        </div>
        <div v-if="config.showFreeSpace" class="form-group">
          <label for="freeSpaceTextInput">Free Space Text</label>
          <input id="freeSpaceTextInput" type="text"
            :value="config.freeSpaceText"
            @input="updateConfig('freeSpaceText', ($event.target as HTMLInputElement).value)"
            :disabled="mode === 'play'" />
        </div>
      </div>
    </details>

    <!-- 2. Style -->
    <details class="panel-section" name="panel-accordion">
      <summary><PaletteIcon :size="13" /> Style</summary>
      <div class="section-content">
        <div class="form-group">
          <label>Colors</label>
          <div class="color-grid">
            <div class="color-group"><input type="color" :value="config.theme.primaryColor" @input="updateTheme('primaryColor', ($event.target as HTMLInputElement).value)" /><span>Primary</span></div>
            <div class="color-group"><input type="color" :value="config.theme.cardBackground" @input="updateTheme('cardBackground', ($event.target as HTMLInputElement).value)" /><span>Card</span></div>
            <div class="color-group"><input type="color" :value="config.theme.cellBackground" @input="updateTheme('cellBackground', ($event.target as HTMLInputElement).value)" /><span>Cell</span></div>
            <div class="color-group"><input type="color" :value="config.theme.cellBorderColor" @input="updateTheme('cellBorderColor', ($event.target as HTMLInputElement).value)" /><span>Border</span></div>
            <div class="color-group"><input type="color" :value="config.theme.textColor" @input="updateTheme('textColor', ($event.target as HTMLInputElement).value)" /><span>Text</span></div>
          </div>
        </div>
        <div class="form-group">
          <label for="fontSelect">Font</label>
          <select id="fontSelect"
            :value="config.theme.fontFamily"
            @change="updateTheme('fontFamily', ($event.target as HTMLSelectElement).value)">
            <option v-for="f in fontOptions" :key="f" :value="f">{{ f.replace(/"/g, '') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Border Radius: {{ getBorderRadius() }}px</label>
          <input type="range" min="0" max="20"
            :value="getBorderRadius()"
            @input="setBorderRadius(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="form-group-inline">
          <label for="wordBreakCheck">Word Break (cells)</label>
          <input id="wordBreakCheck" type="checkbox"
            :checked="config.wordBreak !== false"
            @change="updateConfig('wordBreak', ($event.target as HTMLInputElement).checked)"
            :disabled="mode === 'play'" />
        </div>
      </div>
    </details>

    <!-- 3. Content -->
    <details class="panel-section" name="panel-accordion">
      <summary><TypeIcon :size="13" /> Content</summary>
      <div class="section-content">
        <div class="form-group">
          <label for="titleInput">Title</label>
          <input id="titleInput" type="text"
            :value="config.title"
            @input="updateConfig('title', ($event.target as HTMLInputElement).value)"
            :disabled="mode === 'play'" />
        </div>
        <div class="form-group">
          <label for="subtitleInput">Subtitle</label>
          <textarea id="subtitleInput" rows="3" class="resizable-textarea"
            :value="config.subtitle"
            @input="updateConfig('subtitle', ($event.target as HTMLTextAreaElement).value)"
            :disabled="mode === 'play'"
            placeholder="Optional text below the title..."></textarea>
        </div>
        <template v-if="config.subtitle">
          <div class="form-group">
            <label>Subtitle Size: {{ config.subtitleFontSize }}px</label>
            <input type="range" min="10" max="32" step="1"
              :value="config.subtitleFontSize"
              @input="updateConfig('subtitleFontSize', Number(($event.target as HTMLInputElement).value))"
              :disabled="mode === 'play'" />
          </div>
          <div class="form-group-inline">
            <label>Subtitle Color</label>
            <input type="color"
              :value="config.subtitleColor"
              @input="updateConfig('subtitleColor', ($event.target as HTMLInputElement).value)"
              :disabled="mode === 'play'" />
          </div>
        </template>
        <!-- Word Bank -->
        <div class="form-group">
          <div class="field-header">
            <label for="wordBankInput" class="label-icon">
              <BookOpenIcon :size="13" /> Word Bank
            </label>
            <span v-if="config.wordBank.length > 0" class="badge">{{ config.wordBank.length }}</span>
          </div>
          <textarea id="wordBankInput" rows="6"
            class="resizable-textarea word-bank-textarea"
            v-model="wordBankInput"
            @blur="saveWordBank"
            :disabled="mode === 'play'"
            placeholder="Cat, Dog, Bird&#10;One item per line, or separate with commas."></textarea>
          <p class="hint">Enable &ldquo;Use Word Bank&rdquo; in Export to mix these into generated cards.</p>
        </div>
      </div>
    </details>

    <!-- 4. Caller -->
    <details class="panel-section" name="panel-accordion">
      <summary><MegaphoneIcon :size="13" /> Caller</summary>
      <div class="section-content">
        <p class="hint">Draw bingo items one by one with text-to-speech support.</p>

        <!-- Calling Mode selection -->
        <div class="form-group">
          <label>Calling Mode</label>
          <div class="caller-mode-selector">
            <button
              type="button"
              class="btn-caller-mode"
              :class="{ active: (config.callerMode || 'classic') === 'classic' }"
              @click="updateConfig('callerMode', 'classic')"
              title="Classic bingo coordinates (e.g. B-8, G-30)"
            >
              <HashIcon :size="14" />
              <span>Classic</span>
            </button>
            <button
              type="button"
              class="btn-caller-mode"
              :class="{ active: config.callerMode === 'board' }"
              @click="updateConfig('callerMode', 'board')"
              title="Draws from cells on current board"
            >
              <LayoutGridIcon :size="14" />
              <span>Board Cells</span>
            </button>
            <button
              type="button"
              class="btn-caller-mode"
              :class="{ active: config.callerMode === 'custom' }"
              @click="updateConfig('callerMode', 'custom')"
              title="Draws from a custom caller word list"
            >
              <ListFilterIcon :size="14" />
              <span>Custom List</span>
            </button>
          </div>
        </div>

        <!-- Classic Mode sub-settings -->
        <div v-if="(config.callerMode || 'classic') === 'classic'" class="form-group">
          <label for="callerNumbersPerCol">Numbers Per Column</label>
          <select
            id="callerNumbersPerCol"
            :value="config.callerNumbersPerCol || 15"
            @change="updateConfig('callerNumbersPerCol', Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="10">10 per col (1–{{ config.gridSize * 10 }})</option>
            <option :value="15">15 per col (1–{{ config.gridSize * 15 }} - Standard 75)</option>
            <option :value="20">20 per col (1–{{ config.gridSize * 20 }})</option>
            <option :value="25">25 per col (1–{{ config.gridSize * 25 }})</option>
          </select>
          <div class="caller-range-preview">
            <span
              v-for="(letter, i) in config.headerLetters.slice(0, config.gridSize)"
              :key="i"
              class="col-range-tag"
            >
              <strong>{{ letter || `C${i + 1}` }}</strong>: {{ i * (config.callerNumbersPerCol || 15) + 1 }}–{{ (i + 1) * (config.callerNumbersPerCol || 15) }}
            </span>
          </div>
          <p class="hint">Draws randomly from all {{ config.gridSize * (config.callerNumbersPerCol || 15) }} coordinates without repeating.</p>
        </div>

        <!-- Board Mode sub-settings -->
        <div v-else-if="config.callerMode === 'board'" class="form-group">
          <p class="hint">
            Draws randomly from cells currently on your card (excluding Free Space). Each item called once.
          </p>
        </div>

        <!-- Custom List Mode sub-settings -->
        <div v-else-if="config.callerMode === 'custom'" class="form-group">
          <div class="field-header">
            <label for="callerCustomInput" class="label-icon">
              <BookOpenIcon :size="13" /> Custom Words to Call
            </label>
            <span v-if="(config.callerCustomList ?? []).length > 0" class="badge">
              {{ config.callerCustomList!.length }}
            </span>
          </div>
          <textarea
            id="callerCustomInput"
            rows="5"
            class="resizable-textarea word-bank-textarea"
            v-model="callerCustomInput"
            @blur="saveCallerCustomList"
            placeholder="Word 1, Word 2, Word 3&#10;One item per line, or separate with commas."
          ></textarea>

          <div class="form-group-inline" style="margin-top: 0.35rem">
            <label for="callerAllowDuplicatesCheck">Allow Duplicates &amp; Unlimited Calls</label>
            <input
              id="callerAllowDuplicatesCheck"
              type="checkbox"
              :checked="config.callerAllowDuplicates ?? false"
              @change="updateConfig('callerAllowDuplicates', ($event.target as HTMLInputElement).checked)"
            />
          </div>
          <p class="hint">
            {{ config.callerAllowDuplicates ? 'Items can be called multiple times and calls run indefinitely.' : 'Draws randomly from this custom list without repeating.' }}
          </p>
        </div>

        <button class="btn-action btn-caller" @click="emit('start-caller')">
          <MegaphoneIcon :size="16" /> Start Caller
        </button>
      </div>
    </details>

    <!-- 5. Tools -->
    <details class="panel-section" name="panel-accordion">
      <summary><WrenchIcon :size="13" /> Tools</summary>
      <div class="section-content">
        <div class="actions-grid">
          <button class="btn-action" @click="emit('shuffle')" :disabled="mode === 'play'"><ShuffleIcon :size="16" /> Shuffle ({{ unlockedCount }})</button>
          <button class="btn-action" @click="emit('open-bulk-import')" :disabled="mode === 'play'"><ListIcon :size="16" /> Bulk Import</button>
          <button v-if="isDev" class="btn-action btn-dev" @click="emit('fill-animals')" title="Dev only">🐾 Fill Animals</button>
        </div>
        <div class="divider" />
        <div class="actions-grid">
          <button class="btn-action btn-danger" @click="handleClearAll" :disabled="mode === 'play'"><TrashIcon :size="16" /> Clear All Cells</button>
          <button class="btn-action btn-danger" @click="handleResetAll" :disabled="mode === 'play'"><RefreshCwIcon :size="16" /> Reset Everything</button>
        </div>
      </div>
    </details>

    <!-- 6. Export -->
    <details class="panel-section" name="panel-accordion">
      <summary><DownloadIcon :size="13" /> Export</summary>
      <div class="section-content">
        <div class="form-group">
          <label for="exportCount">Number of Cards</label>
          <input id="exportCount" type="number" v-model.number="exportCount" min="1" max="100" />
        </div>
        <div class="form-group-inline">
          <label for="useWordBankCheck">
            Use Word Bank
            <span v-if="config.wordBank.length === 0" class="hint-inline">(bank is empty)</span>
          </label>
          <input id="useWordBankCheck" type="checkbox"
            v-model="useWordBank" :disabled="config.wordBank.length === 0" />
        </div>
        <p v-if="useWordBank && config.wordBank.length > 0" class="hint">
          Each card randomly draws from {{ config.wordBank.length }} bank words mixed with current cells.
        </p>
        <div class="actions-grid">
          <button class="btn-action btn-export"
            @click="emit('export-image', { format: 'png', count: exportCount, useWordBank })">
            <ImageIcon :size="16" /> PNG
          </button>
          <button class="btn-action btn-export"
            @click="emit('export-image', { format: 'jpeg', count: exportCount, useWordBank })">
            <ImageIcon :size="16" /> JPEG
          </button>
          <button class="btn-action btn-export"
            @click="emit('export-pdf', { count: exportCount, useWordBank })">
            <FileTextIcon :size="16" /> PDF
          </button>
        </div>
      </div>
    </details>
  </aside>
</template>

<style scoped>
.control-panel { width: 100%; padding: 0.75rem; background-color: #f8fafc; display: flex; flex-direction: column; gap: 0.6rem; }

.mode-toggle { margin-bottom: 0.25rem; }
.btn-mode { width: 100%; padding: 0.85rem 1rem; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 8px; border: 1px solid #3b82f6; background: white; cursor: pointer; transition: background 0.15s, color 0.15s; color: #3b82f6; font-family: inherit; }
.btn-mode.is-play { background: #10b981; color: white; border-color: #10b981; }

.panel-section { background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.panel-section summary { padding: 0.6rem 0.85rem; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.07em; background: #f1f5f9; cursor: pointer; user-select: none; list-style: none; display: flex; align-items: center; gap: 0.35rem; color: #475569; }
.panel-section summary::-webkit-details-marker { display: none; }
.panel-section summary::after { content: "▼"; font-size: 0.6rem; color: #94a3b8; margin-left: auto; transition: transform 0.2s; }
.panel-section[open] summary::after { transform: rotate(180deg); }
.section-content { padding: 0.85rem; display: flex; flex-direction: column; gap: 0.9rem; }

.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
.form-group label { font-size: 0.82rem; font-weight: 500; color: #475569; }
.form-group-inline { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.form-group-inline label { font-size: 0.82rem; font-weight: 500; color: #475569; }

input[type="text"], input[type="number"], textarea, select { width: 100%; padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; font-family: inherit; transition: border-color 0.15s; box-sizing: border-box; }
input[type="text"]:focus, input[type="number"]:focus, textarea:focus, select:focus { outline: none; border-color: #6c5ce7; }
input[type="text"]:disabled, input[type="number"]:disabled, textarea:disabled, select:disabled { background: #f1f5f9; color: #94a3b8; }
input[type="range"] { width: 100%; accent-color: #6c5ce7; }
input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: #6c5ce7; cursor: pointer; flex-shrink: 0; }
input[type="color"] { width: 34px; height: 34px; padding: 0; border: none; border-radius: 6px; cursor: pointer; overflow: hidden; }
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: 1px solid #cbd5e1; border-radius: 6px; }

.grid-size-buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem; }
.btn-grid-size { padding: 0.4rem 0; font-size: 0.78rem; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; transition: all 0.12s; font-family: inherit; }
.btn-grid-size:hover:not(:disabled) { background: #f1f5f9; }
.btn-grid-size.active { background: #6c5ce7; color: white; border-color: #6c5ce7; }
.btn-grid-size:disabled { opacity: 0.45; cursor: not-allowed; }

.header-letters { display: flex; gap: 0.3rem; }
.header-letter-input { width: 2rem !important; text-align: center; text-transform: uppercase; padding: 0.4rem 0.2rem; }

.color-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.4rem; }
.color-group { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.color-group span { font-size: 0.68rem; color: #64748b; text-align: center; }

.field-header { display: flex; align-items: center; justify-content: space-between; }
.label-icon { display: flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; font-weight: 500; color: #475569; }
.badge { font-size: 0.7rem; font-weight: 600; background: #ede9fe; color: #6c5ce7; border-radius: 999px; padding: 0.1rem 0.5rem; }
.resizable-textarea { resize: vertical; min-height: 60px; line-height: 1.4; }
.word-bank-textarea { font-family: monospace; font-size: 0.82rem; min-height: 100px; }

/* Caller mode buttons & preview */
.caller-mode-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}
.btn-caller-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.45rem 0.2rem;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s;
  font-family: inherit;
}
.btn-caller-mode:hover {
  background: #f1f5f9;
  color: #1e293b;
}
.btn-caller-mode.active {
  background: #6c5ce7;
  color: white;
  border-color: #6c5ce7;
}

.caller-range-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.25rem;
}
.col-range-tag {
  font-size: 0.72rem;
  background: #f1f5f9;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  color: #475569;
}

.hint { font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin: 0; }
.hint-inline { font-size: 0.72rem; color: #94a3b8; font-weight: 400; }
.divider { height: 1px; background: #e2e8f0; margin: 0 -0.85rem; }

.actions-grid { display: flex; flex-direction: column; gap: 0.4rem; }
.btn-action { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-size: 0.88rem; font-family: inherit; transition: background 0.12s; }
.btn-action:hover:not(:disabled) { background: #f1f5f9; }
.btn-action:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-caller { color: #6c5ce7; border-color: #a5b4fc; font-weight: 600; }
.btn-caller:hover:not(:disabled) { background: #f5f3ff; }
.btn-export { background: #f8fafc; font-weight: 500; }
.btn-export:hover:not(:disabled) { background: #ede9fe; }
.btn-danger { color: #ef4444; border-color: #fca5a5; }
.btn-danger:hover:not(:disabled) { background: #fef2f2; }
.btn-dev { color: #b45309; border-color: #fcd34d; border-style: dashed; font-size: 0.82rem; opacity: 0.85; }
.btn-dev:hover:not(:disabled) { background: #fffbeb; opacity: 1; }
</style>
