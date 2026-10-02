<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { BingoCell, BingoConfig, CallerMode } from '@/types/bingo';
import {
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  RotateCcw,
  Repeat2,
  Hash,
  LayoutGrid,
  ListFilter,
  Infinity as InfinityIcon
} from '@lucide/vue';

const props = defineProps<{
  cells: BingoCell[];
  config: BingoConfig;
}>();

const emit = defineEmits<{
  (e: 'exit'): void;
  (e: 'update:config', payload: Partial<BingoConfig>): void;
}>();

/* ---- Active Caller Mode & Settings ---- */
const currentMode = computed<CallerMode>(() => props.config.callerMode ?? 'classic');

const allowDuplicates = computed<boolean>(() => {
  return currentMode.value === 'custom' && !!props.config.callerAllowDuplicates;
});

function selectMode(newMode: CallerMode) {
  if (newMode === currentMode.value) return;
  if (calledHistory.value.length > 0) {
    if (!confirm('Switching modes will reset the current caller round. Continue?')) {
      return;
    }
  }
  emit('update:config', { callerMode: newMode });
  reset();
}

function toggleAllowDuplicates(checked: boolean) {
  emit('update:config', { callerAllowDuplicates: checked });
}

/* ---- TTS ---- */
const ttsAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
const ttsEnabled = ref(true);
const isSpeaking = ref(false);

function speak(text: string) {
  if (!ttsAvailable || !ttsEnabled.value) return;
  window.speechSynthesis.cancel();
  // Convert "B-8" to "B 8" so TTS does not pronounce "B minus 8"
  const speechText = text.replace('-', ' ');
  const u = new SpeechSynthesisUtterance(speechText);
  u.rate = 0.85;
  u.onstart = () => { isSpeaking.value = true; };
  u.onend = u.onerror = () => { isSpeaking.value = false; };
  window.speechSynthesis.speak(u);
}

function toggleTTS() {
  ttsEnabled.value = !ttsEnabled.value;
  if (!ttsEnabled.value) {
    window.speechSynthesis?.cancel();
    isSpeaking.value = false;
  }
}

function replayTTS() {
  if (currentItem.value) speak(currentItem.value);
}

/* ---- Caller state ---- */
interface CallHistoryEntry {
  id: number;
  text: string;
}

let callCounter = 0;
const calledHistory = ref<CallHistoryEntry[]>([]);
const currentItem = ref<string | null>(null);

/* ---- Pool Generation based on mode ---- */
const pool = computed((): string[] => {
  const mode = currentMode.value;

  if (mode === 'classic') {
    const letters = (props.config.headerLetters ?? []).slice(0, props.config.gridSize);
    const nPerCol = props.config.callerNumbersPerCol ?? 15;
    const items: string[] = [];

    letters.forEach((letter, colIdx) => {
      const colLetter = letter?.trim() || `C${colIdx + 1}`;
      const start = colIdx * nPerCol + 1;
      const end = (colIdx + 1) * nPerCol;
      for (let n = start; n <= end; n++) {
        items.push(`${colLetter}-${n}`);
      }
    });

    return items;
  }

  if (mode === 'custom') {
    const rawList = props.config.callerCustomList ?? [];
    if (allowDuplicates.value) {
      // In allow-duplicates mode, keep all non-empty items
      return rawList.map(w => w.trim()).filter(Boolean);
    }
    // Without duplicates, deduplicate
    const seen = new Set<string>();
    const items: string[] = [];
    for (const w of rawList) {
      const trimmed = w.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        items.push(trimmed);
      }
    }
    return items;
  }

  // 'board' mode: deduplicated non-free-space cells with text
  const seen = new Set<string>();
  const items: string[] = [];
  for (const cell of props.cells) {
    const text = cell.text.trim();
    if (!cell.isFreeSpace && text && !seen.has(text)) {
      seen.add(text);
      items.push(text);
    }
  }
  return items;
});

const calledSet = computed(() => new Set(calledHistory.value.map(e => e.text)));

const remaining = computed(() => {
  if (allowDuplicates.value) {
    return pool.value;
  }
  return pool.value.filter(item => !calledSet.value.has(item));
});

const progressPct = computed(() => {
  if (allowDuplicates.value) return 100;
  return pool.value.length > 0 ? (calledHistory.value.length / pool.value.length) * 100 : 0;
});

/* ---- Parse classic item (Letter & Number) ---- */
const parsedClassic = computed(() => {
  if (!currentItem.value) return null;
  const match = currentItem.value.match(/^([^\s-]+)-(\d+)$/);
  if (!match) return null;
  return {
    letter: match[1],
    number: match[2]
  };
});

/** Auto-scale font based on item length */
const itemFontSize = computed(() => {
  const len = currentItem.value?.length ?? 0;
  if (len <= 8)  return 'clamp(2.5rem, 7vw, 5rem)';
  if (len <= 16) return 'clamp(2rem, 5vw, 3.5rem)';
  if (len <= 32) return 'clamp(1.4rem, 3.5vw, 2.5rem)';
  return 'clamp(1rem, 2.5vw, 1.75rem)';
});

function callNext() {
  const rem = remaining.value;
  if (rem.length === 0) return;
  const item = rem[Math.floor(Math.random() * rem.length)]!;
  currentItem.value = item;
  calledHistory.value.push({ id: ++callCounter, text: item });
  speak(item);
}

function reset() {
  window.speechSynthesis?.cancel();
  calledHistory.value = [];
  currentItem.value = null;
  isSpeaking.value = false;
}

watch(() => props.config.callerNumbersPerCol, () => {
  if (currentMode.value === 'classic') reset();
});

onUnmounted(() => {
  window.speechSynthesis?.cancel();
});
</script>

<template>
  <Transition name="caller-slide">
    <div class="caller-overlay">
      <div class="caller-panel">

        <!-- ── Header ── -->
        <header class="caller-header">
          <div class="caller-branding">
            <span class="caller-badge">CALLER</span>
            <span class="caller-brand-name">Bingo Caller</span>
          </div>
          <div class="caller-header-actions">
            <button
              v-if="ttsAvailable && currentItem"
              @click="replayTTS"
              class="c-btn c-btn-icon"
              title="Replay item aloud"
              :class="{ 'is-speaking': isSpeaking }"
            >
              <Repeat2 :size="18" />
            </button>
            <button
              v-if="ttsAvailable"
              @click="toggleTTS"
              class="c-btn c-btn-icon"
              :title="ttsEnabled ? 'Mute text-to-speech' : 'Enable text-to-speech'"
            >
              <Volume2 v-if="ttsEnabled" :size="20" />
              <VolumeX v-else :size="20" />
            </button>
            <button @click="emit('exit')" class="c-btn c-btn-icon c-btn-exit" title="Exit Caller">
              <X :size="20" />
            </button>
          </div>
        </header>

        <!-- ── Mode Selector Tabs ── -->
        <nav class="caller-mode-nav">
          <button
            class="mode-pill"
            :class="{ active: currentMode === 'classic' }"
            @click="selectMode('classic')"
            title="Classic coordinates (e.g. B-8, G-30)"
          >
            <Hash :size="14" />
            <span>Classic</span>
          </button>
          <button
            class="mode-pill"
            :class="{ active: currentMode === 'board' }"
            @click="selectMode('board')"
            title="Random values from the board cells"
          >
            <LayoutGrid :size="14" />
            <span>Board Cells</span>
          </button>
          <button
            class="mode-pill"
            :class="{ active: currentMode === 'custom' }"
            @click="selectMode('custom')"
            title="Custom caller words list"
          >
            <ListFilter :size="14" />
            <span>Custom List</span>
          </button>
        </nav>

        <!-- ── In-Caller Custom List Quick Settings ── -->
        <div v-if="currentMode === 'custom'" class="caller-custom-bar">
          <label class="custom-toggle-label">
            <input
              type="checkbox"
              :checked="allowDuplicates"
              @change="toggleAllowDuplicates(($event.target as HTMLInputElement).checked)"
            />
            <span>Allow Duplicates &amp; Unlimited Calls</span>
          </label>
          <span v-if="allowDuplicates" class="unlimited-pill">
            <InfinityIcon :size="12" /> Unlimited
          </span>
        </div>

        <!-- ── Stage ── -->
        <section class="caller-stage">
          <Transition name="call-anim" mode="out-in">
            <div v-if="currentItem" :key="currentItem + (allowDuplicates ? '-' + calledHistory.length : '')" class="caller-item-card">
              <!-- Classic Bingo Ball Presentation -->
              <div v-if="parsedClassic" class="classic-ball-display">
                <div class="classic-ball-badge">
                  {{ parsedClassic.letter }}
                </div>
                <div class="classic-ball-number">
                  {{ parsedClassic.number }}
                </div>
              </div>
              <!-- Text Presentation (Board / Custom) -->
              <p v-else class="caller-item-text" :style="{ fontSize: itemFontSize }">
                {{ currentItem }}
              </p>
            </div>

            <div v-else class="caller-idle" key="idle">
              <template v-if="pool.length === 0">
                <template v-if="currentMode === 'custom'">
                  <p class="caller-idle-main">Custom list is empty</p>
                  <p class="caller-idle-sub">Add words in the sidebar under Caller &gt; Custom Words.</p>
                </template>
                <template v-else-if="currentMode === 'board'">
                  <p class="caller-idle-main">No items on the board</p>
                  <p class="caller-idle-sub">Add text to your cells, or switch to Classic mode!</p>
                </template>
                <template v-else>
                  <p class="caller-idle-main">No coordinates available</p>
                  <p class="caller-idle-sub">Check your grid header settings.</p>
                </template>
              </template>
              <template v-else-if="!allowDuplicates && calledHistory.length >= pool.length">
                <p class="caller-idle-main">🎉 All {{ pool.length }} items called!</p>
                <p class="caller-idle-sub">Press Reset to start a new round.</p>
              </template>
              <template v-else>
                <p class="caller-idle-main">
                  {{ allowDuplicates ? 'Unlimited mode ready' : `${pool.length} items ready` }}
                </p>
                <p class="caller-idle-sub">
                  Mode:
                  <strong v-if="currentMode === 'classic'">Classic Coordinates ({{ pool.length }} calls)</strong>
                  <strong v-else-if="currentMode === 'board'">Board Cells</strong>
                  <strong v-else>
                    Custom List
                    <template v-if="allowDuplicates"> (Duplicates &amp; Unlimited)</template>
                  </strong>
                  — Press "Call Next" to begin
                </p>
              </template>
            </div>
          </Transition>
        </section>

        <!-- ── Progress ── -->
        <div class="caller-progress-section">
          <div class="caller-progress-labels">
            <span v-if="allowDuplicates">
              {{ calledHistory.length }} call{{ calledHistory.length === 1 ? '' : 's' }} made
            </span>
            <span v-else>
              {{ calledHistory.length }} / {{ pool.length }} called
            </span>

            <span v-if="allowDuplicates" class="caller-remaining-label">
              ∞ Unlimited ({{ pool.length }} items in pool)
            </span>
            <span v-else-if="remaining.length > 0" class="caller-remaining-label">
              {{ remaining.length }} remaining
            </span>
          </div>
          <div class="caller-progress-track" role="progressbar" :aria-valuenow="Math.round(progressPct)" aria-valuemin="0" aria-valuemax="100">
            <div
              class="caller-progress-fill"
              :class="{ 'is-unlimited': allowDuplicates }"
              :style="{ width: progressPct + '%' }"
            />
          </div>
        </div>

        <!-- ── Controls ── -->
        <div class="caller-controls">
          <button
            class="c-btn c-btn-call"
            @click="callNext"
            :disabled="pool.length === 0 || (!allowDuplicates && remaining.length === 0)"
          >
            <ChevronRight :size="26" />
            <template v-if="pool.length === 0">
              No items in pool
            </template>
            <template v-else-if="!allowDuplicates && remaining.length === 0">
              All Done!
            </template>
            <template v-else>
              Call Next
            </template>
          </button>
          <button
            class="c-btn c-btn-reset"
            @click="reset"
            :disabled="calledHistory.length === 0"
            title="Reset caller"
          >
            <RotateCcw :size="18" />
          </button>
        </div>

        <!-- ── History ── -->
        <div v-if="calledHistory.length > 0" class="caller-history">
          <p class="caller-history-label">
            History
            <span class="caller-history-count">{{ calledHistory.length }}</span>
          </p>
          <div class="caller-chips">
            <span
              v-for="(entry, idx) in [...calledHistory].reverse()"
              :key="entry.id"
              class="caller-chip"
              :class="{ 'caller-chip--current': idx === 0 }"
            >
              {{ entry.text }}
            </span>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Overlay & Panel ── */
.caller-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.caller-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 680px;
  height: 100dvh;
  background: #0d0f1a;
  color: #e2e8f0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Header ── */
.caller-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.caller-branding {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.caller-badge {
  background: #6c5ce7;
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 0.25em 0.6em;
  border-radius: 4px;
}

.caller-brand-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: #cbd5e1;
}

.caller-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ── Mode selector tabs ── */
.caller-mode-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.mode-pill {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.mode-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.mode-pill.active {
  background: #6c5ce7;
  color: #ffffff;
  border-color: #6c5ce7;
  box-shadow: 0 2px 8px rgba(108, 92, 231, 0.35);
}

/* ── In-Caller Custom Bar ── */
.caller-custom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  background: rgba(108, 92, 231, 0.08);
  border-bottom: 1px solid rgba(108, 92, 231, 0.15);
  font-size: 0.8rem;
  flex-shrink: 0;
}

.custom-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  color: #c7d2fe;
  user-select: none;
}
.custom-toggle-label input[type="checkbox"] {
  accent-color: #6c5ce7;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.unlimited-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(108, 92, 231, 0.25);
  color: #a5b4fc;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(108, 92, 231, 0.35);
}

/* ── Base button ── */
.c-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  transition: background 0.15s, opacity 0.15s, transform 0.1s, filter 0.15s;
}

.c-btn:active:not(:disabled) { transform: scale(0.96); }
.c-btn:disabled { opacity: 0.38; cursor: not-allowed; }

.c-btn-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.07);
  color: #94a3b8;
}

@media (hover: hover) and (pointer: fine) {
  .c-btn-icon:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); color: #e2e8f0; }
}

.c-btn-icon.is-speaking { color: #6c5ce7; }
.c-btn-exit { color: #f87171; }

/* ── Stage ── */
.caller-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1.25rem;
  min-height: 200px;
}

.caller-item-card {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 560px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2.2rem 2rem;
  min-height: 160px;
}

/* Classic Ball Display */
.classic-ball-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}

.classic-ball-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(64px, 12vw, 96px);
  height: clamp(64px, 12vw, 96px);
  border-radius: 50%;
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%);
  color: #ffffff;
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 800;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45);
  letter-spacing: -0.02em;
}

.classic-ball-number {
  font-size: clamp(3.5rem, 12vw, 6.5rem);
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -0.03em;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.caller-item-text {
  text-align: center;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  margin: 0;
  word-break: break-word;
}

.caller-idle {
  text-align: center;
  padding: 1rem;
}

.caller-idle-main {
  font-size: 1.5rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0 0 0.5rem;
}

.caller-idle-sub {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

/* ── Progress ── */
.caller-progress-section {
  padding: 0 1.25rem 0.9rem;
  flex-shrink: 0;
}

.caller-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.45rem;
}

.caller-remaining-label { color: #818cf8; font-weight: 600; }

.caller-progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.caller-progress-fill {
  height: 100%;
  background: #6c5ce7;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.caller-progress-fill.is-unlimited {
  background: linear-gradient(90deg, #6c5ce7 0%, #a855f7 50%, #6366f1 100%);
  box-shadow: 0 0 8px rgba(108, 92, 231, 0.5);
}

/* ── Controls ── */
.caller-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem 1.25rem;
  flex-shrink: 0;
}

.c-btn-call {
  flex: 1;
  height: 56px;
  font-size: 1.1rem;
  background: #6c5ce7;
  color: white;
  border-radius: 12px;
}

@media (hover: hover) and (pointer: fine) {
  .c-btn-call:hover:not(:disabled) { filter: brightness(1.12); }
}

.c-btn-reset {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.07);
  color: #64748b;
  flex-shrink: 0;
  border-radius: 12px;
}

@media (hover: hover) and (pointer: fine) {
  .c-btn-reset:hover:not(:disabled) { background: rgba(239, 68, 68, 0.18); color: #f87171; }
}

/* ── History ── */
.caller-history {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding: 1rem 1.25rem 2rem;
  flex-shrink: 0;
}

.caller-history-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.caller-history-count {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 0.1em 0.5em;
  border-radius: 20px;
  font-size: 0.85em;
}

.caller-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.caller-chip {
  padding: 0.3em 0.75em;
  border-radius: 20px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  transition: background 0.2s, color 0.2s;
}

.caller-chip--current {
  background: #6c5ce7;
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(108, 92, 231, 0.35);
}

/* ── Caller slide-in transition ── */
.caller-slide-enter-active { animation: panel-in 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.caller-slide-leave-active { animation: panel-out 0.25s ease-in; }

@keyframes panel-in {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes panel-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(40px); }
}

/* ── Called-item animation ── */
.call-anim-enter-active { animation: call-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.call-anim-leave-active { animation: call-pop-out 0.18s ease-in; }

@keyframes call-pop-in {
  from { opacity: 0; transform: scale(0.7) translateY(24px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes call-pop-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.88) translateY(-12px); }
}
</style>
