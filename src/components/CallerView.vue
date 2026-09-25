<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import type { BingoCell } from '@/types/bingo';
import { X, Volume2, VolumeX, ChevronRight, RotateCcw, Repeat2 } from '@lucide/vue';

const props = defineProps<{
  cells: BingoCell[];
}>();

const emit = defineEmits<{
  (e: 'exit'): void;
}>();

/* ---- TTS ---- */
const ttsAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
const ttsEnabled = ref(true);
const isSpeaking = ref(false);

function speak(text: string) {
  if (!ttsAvailable || !ttsEnabled.value) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.onstart = () => { isSpeaking.value = true; };
  u.onend = u.onerror = () => { isSpeaking.value = false; };
  window.speechSynthesis.speak(u);
}

function toggleTTS() {
  ttsEnabled.value = !ttsEnabled.value;
  if (!ttsEnabled.value) { window.speechSynthesis?.cancel(); isSpeaking.value = false; }
}

function replayTTS() {
  if (currentItem.value) speak(currentItem.value);
}

/* ---- Caller state ---- */
const calledItems = ref<string[]>([]);
const currentItem = ref<string | null>(null);

/** Deduplicated pool of all non-free-space cells that have text. */
const pool = computed((): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cell of props.cells) {
    const text = cell.text.trim();
    if (!cell.isFreeSpace && text && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }
  return result;
});

const calledSet = computed(() => new Set(calledItems.value));

const remaining = computed(() =>
  pool.value.filter(item => !calledSet.value.has(item))
);

const progressPct = computed(() =>
  pool.value.length > 0 ? (calledItems.value.length / pool.value.length) * 100 : 0
);

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
  calledItems.value = [...calledItems.value, item];
  speak(item);
}

function reset() {
  window.speechSynthesis?.cancel();
  calledItems.value = [];
  currentItem.value = null;
  isSpeaking.value = false;
}

onUnmounted(() => { window.speechSynthesis?.cancel(); });
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

        <!-- ── Stage ── -->
        <section class="caller-stage">
          <Transition name="call-anim" mode="out-in">
            <div v-if="currentItem" :key="currentItem" class="caller-item-card">
              <p class="caller-item-text" :style="{ fontSize: itemFontSize }">
                {{ currentItem }}
              </p>
            </div>
            <div v-else class="caller-idle" key="idle">
              <template v-if="pool.length === 0">
                <p class="caller-idle-main">No items in the grid yet.</p>
                <p class="caller-idle-sub">Add text to your cells, then come back!</p>
              </template>
              <template v-else-if="calledItems.length >= pool.length">
                <p class="caller-idle-main">🎉 All {{ pool.length }} items called!</p>
                <p class="caller-idle-sub">Press Reset to start a new round.</p>
              </template>
              <template v-else>
                <p class="caller-idle-main">{{ pool.length }} items ready</p>
                <p class="caller-idle-sub">Press "Call Next" to begin</p>
              </template>
            </div>
          </Transition>
        </section>

        <!-- ── Progress ── -->
        <div class="caller-progress-section">
          <div class="caller-progress-labels">
            <span>{{ calledItems.length }} / {{ pool.length }} called</span>
            <span v-if="remaining.length > 0" class="caller-remaining-label">
              {{ remaining.length }} remaining
            </span>
          </div>
          <div class="caller-progress-track" role="progressbar" :aria-valuenow="Math.round(progressPct)" aria-valuemin="0" aria-valuemax="100">
            <div class="caller-progress-fill" :style="{ width: progressPct + '%' }" />
          </div>
        </div>

        <!-- ── Controls ── -->
        <div class="caller-controls">
          <button
            class="c-btn c-btn-call"
            @click="callNext"
            :disabled="remaining.length === 0"
          >
            <ChevronRight :size="26" />
            {{ remaining.length === 0 && pool.length > 0 ? 'All Done!' : 'Call Next' }}
          </button>
          <button
            class="c-btn c-btn-reset"
            @click="reset"
            :disabled="calledItems.length === 0"
            title="Reset caller"
          >
            <RotateCcw :size="18" />
          </button>
        </div>

        <!-- ── History ── -->
        <div v-if="calledItems.length > 0" class="caller-history">
          <p class="caller-history-label">
            Called
            <span class="caller-history-count">{{ calledItems.length }}</span>
          </p>
          <div class="caller-chips">
            <span
              v-for="item in [...calledItems].reverse()"
              :key="item"
              class="caller-chip"
              :class="{ 'caller-chip--current': item === currentItem }"
            >{{ item }}</span>
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
  /* semi-transparent so you can dimly see the board behind */
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
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
  padding: 1rem 1.5rem;
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
  padding: 2rem 1.5rem;
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
  padding: 2.5rem 2rem;
  min-height: 160px;
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
  color: #475569;
  margin: 0;
}

/* ── Progress ── */
.caller-progress-section {
  padding: 0 1.5rem 1rem;
  flex-shrink: 0;
}

.caller-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #475569;
  margin-bottom: 0.5rem;
}

.caller-remaining-label { color: #6c5ce7; }

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

/* ── Controls ── */
.caller-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem;
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
  padding: 1rem 1.5rem 2rem;
  flex-shrink: 0;
}

.caller-history-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
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
  color: #64748b;
  transition: background 0.2s, color 0.2s;
}

.caller-chip--current {
  background: #6c5ce7;
  color: white;
  font-weight: 600;
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
