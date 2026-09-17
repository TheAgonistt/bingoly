<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X as XIcon } from '@lucide/vue';

const props = defineProps<{
  open: boolean;
  availableSlots: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'import', items: string[]): void;
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);
const rawText = ref('');

const parsedItems = computed(() => {
  return rawText.value
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
});

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    rawText.value = '';
    dialogRef.value?.showModal();
  } else {
    dialogRef.value?.close();
  }
});

function handleClose() {
  emit('close');
}

function handleImport() {
  if (parsedItems.value.length === 0) return;
  emit('import', parsedItems.value);
  emit('close');
}

// Handle native escape key
function onCancel(e: Event) {
  e.preventDefault();
  handleClose();
}
</script>

<template>
  <dialog 
    ref="dialogRef" 
    class="bulk-import-modal"
    @cancel="onCancel"
  >
    <div class="modal-header">
      <h2>Bulk Import Items</h2>
      <button class="close-btn" @click="handleClose" aria-label="Close">
        <XIcon :size="24" />
      </button>
    </div>

    <div class="modal-body">
      <p class="instructions">
        Paste items separated by commas or new lines. Items will be randomly assigned to unlocked cells.
      </p>

      <textarea
        v-model="rawText"
        rows="8"
        placeholder="e.g. Apple, Banana, Orange&#10;or one item per line"
        class="import-textarea"
      ></textarea>

      <div class="stats-bar">
        <span 
          class="stats-indicator" 
          :class="{ 
            'enough-items': parsedItems.length >= availableSlots,
            'not-enough': parsedItems.length > 0 && parsedItems.length < availableSlots
          }"
        >
          {{ parsedItems.length }} items parsed &bull; {{ availableSlots }} slots available
        </span>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" @click="handleClose">Cancel</button>
      <button 
        class="btn-submit" 
        :disabled="parsedItems.length === 0"
        @click="handleImport"
      >
        Auto-Populate
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.bulk-import-modal {
  padding: 1.5rem;
  border: none;
  border-radius: 0.75rem;
  background-color: var(--card-bg, #ffffff);
  color: var(--text-color, #1a1a1a);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 520px;
}

.bulk-import-modal::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted, #666);
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background-color 0.2s, color 0.2s;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--text-color, #1a1a1a);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.instructions {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted, #555);
  line-height: 1.4;
}

.import-textarea {
  width: 100%;
  min-height: 200px;
  resize: vertical;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.2s;
}

.import-textarea:focus {
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.stats-bar {
  display: flex;
  justify-content: flex-start;
  font-size: 0.875rem;
  font-weight: 500;
}

.stats-indicator {
  color: var(--text-muted, #666);
}

.stats-indicator.enough-items {
  color: #10b981;
}

.stats-indicator.not-enough {
  color: #f59e0b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

button {
  font-family: inherit;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color, #ccc);
  background-color: transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-color, #333);
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-submit {
  padding: 0.5rem 1.25rem;
  border: none;
  background-color: var(--primary-color, #3b82f6);
  color: white;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
