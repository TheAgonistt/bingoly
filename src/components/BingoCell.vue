<template>
  <div
    class="bingo-cell"
    :class="{
      'locked': cell.isLocked,
      'free-space': cell.isFreeSpace,
      'marked': cell.marked,
      'play-mode': mode === 'play'
    }"
    :style="cellStyles"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @touchend.passive="handleTouchEnd"
  >
    <!-- Background Icon for Free Space -->
    <div v-if="cell.isFreeSpace" class="free-space-bg">
      <Star class="star-icon" />
    </div>

    <!-- Image -->
    <img
      v-if="cell.imageUrl"
      :src="cell.imageUrl"
      class="cell-image"
      :style="{ objectFit: cell.imageFit }"
      alt=""
    />

    <!-- Text content or Input -->
    <div v-if="isEditing && mode === 'design'" class="edit-overlay">
      <textarea
        ref="editInput"
        v-model="editText"
        @blur="commitEdit"
        @keydown.enter.prevent="commitEdit"
        @keydown.esc="cancelEdit"
        class="inline-input"
      ></textarea>
    </div>
    <div
      v-else
      class="cell-text"
      :class="{ 'large-star': cell.isFreeSpace && cell.text === '★' }"
    >
      {{ cell.text }}
    </div>

    <!-- Design mode controls — always visible on mobile -->
    <template v-if="mode === 'design'">
      <!-- Lock badge -->
      <button
        class="cell-action lock-badge"
        title="Toggle lock position"
        @click.stop="emit('toggle-lock', cell.id)"
        @touchend.stop.prevent="emit('toggle-lock', cell.id)"
      >
        <Lock v-if="cell.isLocked" :size="14" />
        <Unlock v-else :size="14" />
      </button>

      <!-- Edit button -->
      <button
        class="cell-action edit-btn"
        title="Edit cell details"
        @click.stop="emit('edit-cell', cell.id)"
        @touchend.stop.prevent="emit('edit-cell', cell.id)"
      >
        <Pencil :size="14" />
      </button>
    </template>

    <!-- Play mode dauber mark -->
    <div v-if="mode === 'play' && cell.marked" class="dauber-mark"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { Lock, Unlock, Pencil, Star } from '@lucide/vue';
import type { BingoCell, AppMode, GridDimension, CellUpdate } from '@/types/bingo';

const props = defineProps<{
  cell: BingoCell;
  mode: AppMode;
  gridSize: GridDimension;
}>();

const emit = defineEmits<{
  (e: 'update:cell', payload: { id: string; updates: CellUpdate }): void;
  (e: 'toggle-lock', id: string): void;
  (e: 'toggle-mark', id: string): void;
  (e: 'edit-cell', id: string): void;
}>();

const isEditing = ref(false);
const editText = ref('');
const editInput = ref<HTMLTextAreaElement | null>(null);

/**
 * Auto-fit font size: computes an ideal px size based on text length and grid dimensions.
 * Short text → large font. Long text → progressively smaller.
 */
const autoFontSize = computed((): number => {
  const text = props.cell.text;
  const len = text.length;
  const grid = props.gridSize;

  // Base size scales inversely with grid size (more cells = smaller base)
  const baseSize = 22 - grid * 1.6;

  if (len === 0) return baseSize;
  if (len <= 5) return baseSize;
  if (len <= 10) return baseSize * 0.9;
  if (len <= 20) return baseSize * 0.78;
  if (len <= 35) return baseSize * 0.65;
  if (len <= 55) return baseSize * 0.55;
  if (len <= 80) return baseSize * 0.48;
  return baseSize * 0.4;
});

const effectiveFontSize = computed((): number => {
  return props.cell.fontSize ?? autoFontSize.value;
});

const cellStyles = computed(() => ({
  '--grid-size': props.gridSize,
  '--cell-font-size': `${Math.max(7, effectiveFontSize.value)}px`,
}));

/* ---- Touch double-tap detection ---- */
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 350; // ms

const handleTouchEnd = () => {
  const now = Date.now();
  const timeSince = now - lastTapTime;
  lastTapTime = now;

  if (timeSince < DOUBLE_TAP_DELAY && timeSince > 0) {
    // Double-tap detected
    if (props.mode === 'design') {
      startEditing();
    }
  }
};

/* ---- Click / double-click (desktop) ---- */

const handleClick = () => {
  if (props.mode === 'play') {
    emit('toggle-mark', props.cell.id);
  }
};

const handleDoubleClick = () => {
  if (props.mode !== 'design') return;
  startEditing();
};

/* ---- Editing ---- */

const startEditing = async () => {
  editText.value = props.cell.text;
  isEditing.value = true;
  await nextTick();
  editInput.value?.focus();
  const length = editInput.value?.value.length || 0;
  editInput.value?.setSelectionRange(length, length);
};

const commitEdit = () => {
  if (!isEditing.value) return;
  if (editText.value !== props.cell.text) {
    emit('update:cell', {
      id: props.cell.id,
      updates: { text: editText.value }
    });
  }
  isEditing.value = false;
};

const cancelEdit = () => {
  isEditing.value = false;
};
</script>

<style scoped>
.bingo-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  background-color: var(--cell-bg, #ffffff);
  border: 1px solid var(--cell-border, #ccc);
  border-radius: var(--border-radius, 8px);
  color: var(--text-color, inherit);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  cursor: default;
  padding: clamp(2px, 1vw, 4px);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  min-width: 0;
  min-height: 0;
}

.bingo-cell.play-mode {
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .bingo-cell:not(.play-mode):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 2;
  }
}

.cell-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.cell-text {
  position: relative;
  z-index: 2;
  text-align: center;
  width: 100%;
  font-size: var(--cell-font-size, 14px);
  line-height: 1.2;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  overflow: hidden;
  padding: 2px;
}

.large-star {
  font-size: 2.5em !important;
  line-height: 1;
}

.free-space-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
  opacity: 0.05;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.star-icon {
  width: 60%;
  height: 60%;
  color: var(--text-color, currentColor);
}

.edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--cell-bg, #ffffff);
}

.inline-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-color, inherit);
  text-align: center;
  font-size: var(--cell-font-size, 14px);
  font-family: inherit;
  outline: 2px solid var(--primary-color, #3b82f6);
  outline-offset: -2px;
  padding: 4px;
  resize: none;
  line-height: 1.2;
}

/* ---- Action buttons (lock + edit) ---- */
.cell-action {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  z-index: 5;
  padding: 0;
  color: #555;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Desktop: small buttons, edit hidden until hover */
.lock-badge {
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
}

.edit-btn {
  bottom: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  opacity: 0;
}

@media (hover: hover) and (pointer: fine) {
  .bingo-cell:not(.play-mode):hover .edit-btn {
    opacity: 1;
  }

  .cell-action:hover {
    background: #fff;
    color: #000;
    transform: scale(1.1);
  }
}

/* Mobile: larger touch targets, always visible */
@media (pointer: coarse) {
  .lock-badge {
    width: 28px;
    height: 28px;
    top: 2px;
    right: 2px;
  }

  .edit-btn {
    width: 28px;
    height: 28px;
    bottom: 2px;
    right: 2px;
    opacity: 1; /* Always visible on touch devices */
  }
}

/* ---- Dauber mark ---- */
.dauber-mark {
  position: absolute;
  top: 15%;
  left: 15%;
  right: 15%;
  bottom: 15%;
  border-radius: 50%;
  background-color: var(--primary-color, rgba(239, 68, 68, 0.6));
  opacity: 0.6;
  z-index: 10;
  pointer-events: none;
  transform: scale(0);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bingo-cell.marked .dauber-mark {
  transform: scale(1);
}
</style>
