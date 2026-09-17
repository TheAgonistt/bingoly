<template>
  <div
    class="bingo-cell"
    :class="{
      'locked': cell.isLocked,
      'free-space': cell.isFreeSpace,
      'marked': cell.marked,
      'play-mode': mode === 'play'
    }"
    :style="{ '--grid-size': gridSize }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
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

    <!-- Design mode controls -->
    <template v-if="mode === 'design'">
      <!-- Lock badge -->
      <button
        class="lock-badge"
        title="Toggle lock position"
        @click.stop="emit('toggle-lock', cell.id)"
      >
        <Lock v-if="cell.isLocked" :size="12" />
        <Unlock v-else :size="12" />
      </button>

      <!-- Edit button -->
      <button
        class="edit-btn"
        title="Edit cell details"
        @click.stop="emit('edit-cell', cell.id)"
      >
        <Pencil :size="12" />
      </button>
    </template>

    <!-- Play mode dauber mark -->
    <div v-if="mode === 'play' && cell.marked" class="dauber-mark"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
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

const handleClick = () => {
  if (props.mode === 'play') {
    emit('toggle-mark', props.cell.id);
  }
};

const handleDoubleClick = async () => {
  if (props.mode !== 'design') return;
  editText.value = props.cell.text;
  isEditing.value = true;
  await nextTick();
  editInput.value?.focus();
  // Set cursor to end
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
  background-color: var(--cell-bg, var(--cellBackground, #ffffff));
  border: 1px solid var(--cell-border, var(--cellBorderColor, #ccc));
  border-radius: var(--border-radius, 8px);
  color: var(--textColor, inherit);
  font-size: clamp(0.65rem, calc(1.2rem - var(--grid-size) * 0.06rem), 1.1rem);
  overflow: hidden;
  word-break: break-word;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  cursor: default;
}

.bingo-cell.play-mode {
  cursor: pointer;
}

.bingo-cell:not(.play-mode):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 2;
}

.bingo-cell:not(.play-mode):hover .edit-btn {
  opacity: 1;
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
  padding: 8px;
  width: 100%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 4;
  -webkit-line-clamp: 4;
}

.large-star {
  font-size: 2.5em;
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
  color: var(--textColor, currentColor);
}

.edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--cellBackground, #ffffff);
}

.inline-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--textColor, inherit);
  text-align: center;
  font-size: inherit;
  font-family: inherit;
  outline: 2px solid var(--primaryColor, #3b82f6);
  outline-offset: -2px;
  padding: 8px;
  resize: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  z-index: 5;
  padding: 0;
  color: #555;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.lock-badge:hover {
  background: #fff;
  color: #000;
  transform: scale(1.1);
}

.edit-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  z-index: 5;
  padding: 0;
  color: #555;
  opacity: 0;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.edit-btn:hover {
  background: #fff;
  color: #000;
  transform: scale(1.1);
}

.dauber-mark {
  position: absolute;
  top: 15%;
  left: 15%;
  right: 15%;
  bottom: 15%;
  border-radius: 50%;
  background-color: var(--primaryColor, rgba(239, 68, 68, 0.6));
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
