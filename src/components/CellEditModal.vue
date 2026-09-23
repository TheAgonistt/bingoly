<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { BingoCell, CellUpdate } from '@/types/bingo';
import { X, Lock, Unlock, Image as ImageIcon, Trash2 } from '@lucide/vue';

const props = defineProps<{
  cell: BingoCell | null;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: { id: string; updates: CellUpdate }): void;
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

const localText = ref<string>('');
const localImageUrl = ref<string | null>(null);
const localImageFit = ref<'contain' | 'cover'>('contain');
const localLocked = ref<boolean>(false);
const localFontSize = ref<number | null>(null);

// Sync local state when cell or open changes
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.cell) {
      localText.value = props.cell.text;
      localImageUrl.value = props.cell.imageUrl;
      localImageFit.value = props.cell.imageFit;
      localLocked.value = props.cell.isLocked;
      localFontSize.value = props.cell.fontSize;
    }
    dialogRef.value?.showModal();
  } else {
    dialogRef.value?.close();
  }
});

// Close when pressing Esc (native behavior, just need to emit close to update parent)
const onDialogClose = () => {
  emit('close');
};

const handleBackdropClick = (e: MouseEvent) => {
  if (!dialogRef.value) return;
  const rect = dialogRef.value.getBoundingClientRect();
  const isInDialog = (
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  );
  if (!isInDialog) {
    emit('close');
  }
};

const handleImageUpload = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    if (ev.target?.result) {
      localImageUrl.value = ev.target.result as string;
    }
  };
  reader.readAsDataURL(file);
  // Reset input value so the same file can be selected again if removed
  input.value = '';
};

const removeImage = () => {
  localImageUrl.value = null;
};

const toggleImageFit = (fit: 'contain' | 'cover') => {
  localImageFit.value = fit;
};

const handleSave = () => {
  if (!props.cell) return;
  emit('save', {
    id: props.cell.id,
    updates: {
      text: localText.value,
      imageUrl: localImageUrl.value,
      imageFit: localImageFit.value,
      isLocked: localLocked.value,
      fontSize: localFontSize.value,
    }
  });
};

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <dialog 
    ref="dialogRef" 
    class="edit-dialog"
    @close="onDialogClose"
    @click="handleBackdropClick"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 class="dialog-title">Edit Cell</h2>
        <button class="icon-btn close-btn" @click="handleClose" aria-label="Close">
          <X :size="20" />
        </button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label for="cell-text">Text</label>
          <input 
            id="cell-text" 
            type="text" 
            v-model="localText" 
            placeholder="Enter cell text..."
            class="text-input"
          />
        </div>

        <div class="form-group">
          <label>Image</label>
          <div v-if="localImageUrl" class="image-preview-container">
            <img 
              :src="localImageUrl" 
              alt="Cell preview" 
              class="image-preview" 
              :style="{ objectFit: localImageFit }"
            />
            <button class="icon-btn remove-image-btn" @click="removeImage" aria-label="Remove image">
              <Trash2 :size="16" />
            </button>
          </div>
          <div v-else class="image-upload">
            <label class="upload-btn">
              <ImageIcon :size="18" />
              <span>Choose Image</span>
              <input 
                type="file" 
                accept="image/*" 
                @change="handleImageUpload" 
                class="sr-only"
              />
            </label>
          </div>
        </div>

        <div class="form-group" v-if="localImageUrl">
          <label>Image Fit</label>
          <div class="toggle-group">
            <button 
              type="button"
              class="toggle-btn"
              :class="{ active: localImageFit === 'contain' }"
              @click="toggleImageFit('contain')"
            >
              Contain
            </button>
            <button 
              type="button"
              class="toggle-btn"
              :class="{ active: localImageFit === 'cover' }"
              @click="toggleImageFit('cover')"
            >
              Cover
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Font Size</label>
          <div class="font-size-control">
            <label class="auto-toggle">
              <input
                type="checkbox"
                :checked="localFontSize === null"
                @change="localFontSize = ($event.target as HTMLInputElement).checked ? null : 14"
              />
              <span>Auto-fit</span>
            </label>
            <div v-if="localFontSize !== null" class="slider-row">
              <input
                type="range"
                min="7"
                max="28"
                step="1"
                :value="localFontSize"
                @input="localFontSize = Number(($event.target as HTMLInputElement).value)"
                class="font-slider"
              />
              <span class="font-size-value">{{ localFontSize }}px</span>
            </div>
            <p v-else class="auto-hint">Text size adjusts automatically based on content length.</p>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="localLocked" 
              class="sr-only-checkbox"
            />
            <div class="lock-toggle" :class="{ locked: localLocked }">
              <Lock v-if="localLocked" :size="18" />
              <Unlock v-else :size="18" />
              <span>{{ localLocked ? 'Locked (won\'t shuffle)' : 'Unlocked (can be shuffled)' }}</span>
            </div>
          </label>
        </div>
      </div>

      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" @click="handleClose">Cancel</button>
        <button type="button" class="btn btn-primary" @click="handleSave">Save</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.edit-dialog {
  padding: 0;
  border: none;
  border-radius: 12px;
  background-color: var(--card-bg, #ffffff);
  color: var(--text-color, #333333);
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.dialog-content {
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #eaeaea);
}

.dialog-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  color: inherit;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.close-btn {
  width: 32px;
  height: 32px;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dialog-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--label-color, #555555);
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--input-border, #cccccc);
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  background-color: var(--input-bg, #ffffff);
  color: inherit;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
}

.image-preview-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: var(--preview-bg, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--input-border, #cccccc);
  overflow: hidden;
}

.image-preview {
  max-height: 150px;
  width: 100%;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  background-color: rgba(255, 255, 255, 0.9);
  color: #ef4444;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.remove-image-btn:hover {
  background-color: #ef4444;
  color: #ffffff;
}

.image-upload {
  display: flex;
  align-items: center;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--btn-bg, #f3f4f6);
  border: 1px solid var(--input-border, #cccccc);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: 500;
}

.upload-btn:hover {
  background-color: var(--btn-hover, #e5e7eb);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.sr-only-checkbox {
  opacity: 0;
  position: absolute;
}

.toggle-group {
  display: flex;
  border: 1px solid var(--input-border, #cccccc);
  border-radius: 6px;
  overflow: hidden;
}

.toggle-btn {
  flex: 1;
  padding: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color, #333);
  transition: all 0.2s ease;
}

.toggle-btn:not(:last-child) {
  border-right: 1px solid var(--input-border, #cccccc);
}

.toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.toggle-btn.active {
  background-color: var(--primary-color, #3b82f6);
  color: #ffffff;
}

.checkbox-label {
  cursor: pointer;
  display: inline-block;
  margin-top: 0.5rem;
}

.lock-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--input-border, #cccccc);
  border-radius: 6px;
  background-color: var(--input-bg, #ffffff);
  transition: all 0.2s ease;
  user-select: none;
}

.lock-toggle:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.lock-toggle.locked {
  border-color: var(--primary-color, #3b82f6);
  background-color: rgba(59, 130, 246, 0.05);
  color: var(--primary-color, #3b82f6);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color, #eaeaea);
}

.btn {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--input-border, #cccccc);
  color: inherit;
}

.btn-outline:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background-color: var(--primary-color, #3b82f6);
  border: 1px solid var(--primary-color, #3b82f6);
  color: #ffffff;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.font-size-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auto-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color, #333);
}

.auto-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color, #3b82f6);
  cursor: pointer;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.font-slider {
  flex: 1;
  height: 6px;
  accent-color: var(--primary-color, #3b82f6);
  cursor: pointer;
}

.font-size-value {
  min-width: 40px;
  text-align: right;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-color, #3b82f6);
  font-variant-numeric: tabular-nums;
}

.auto-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--label-color, #888);
  font-style: italic;
}
</style>
