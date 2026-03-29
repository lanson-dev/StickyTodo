<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { TodoItem } from '@/stores/todo'
import { useTodoStore } from '@/stores/todo'

const props = defineProps<{ item: TodoItem }>()
const store = useTodoStore()

// ── Date ────────────────────────────────────────────────
const dateLabel = computed(() => {
  const ts = props.item.done && props.item.completedAt
    ? props.item.completedAt
    : props.item.createdAt
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
})

// ── Edit ────────────────────────────────────────────────
const isEditing = ref(false)
const editText = ref('')
const editEl = ref<HTMLInputElement | null>(null)

function startEdit() {
  if (store.config.locked) return
  isEditing.value = true
  editText.value = props.item.text
  nextTick(() => { editEl.value?.focus(); editEl.value?.select() })
}
function commitEdit() {
  if (!isEditing.value) return
  isEditing.value = false
  store.updateItemText(props.item.id, editText.value)
}
function onEditKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
  if (e.key === 'Escape') { isEditing.value = false }
}

// ── Click / select ───────────────────────────────────────
function onRowClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button,input')) return
  if (store.config.locked) return
  store.selectItem(props.item.id)
}

// ── Drag ────────────────────────────────────────────────
const dropPos = ref<'before' | 'after' | null>(null)

function onDragStart(e: DragEvent) {
  if (store.config.locked || isEditing.value) return
  store.dragSourceId = props.item.id
  e.dataTransfer!.effectAllowed = 'move'
}
function onDragOver(e: DragEvent) {
  const src = store.dragSourceId
  if (!src || src === props.item.id) return
  const srcItem = store.items.find(i => i.id === src)
  if (!srcItem || srcItem.done !== props.item.done) return
  e.preventDefault()
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dropPos.value = e.clientY < r.top + r.height / 2 ? 'before' : 'after'
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  const src = store.dragSourceId
  if (src && src !== props.item.id) store.reorderItem(src, props.item.id, dropPos.value ?? 'after')
  dropPos.value = null
}
function onDragLeave() { dropPos.value = null }
function onDragEnd() { store.dragSourceId = null; dropPos.value = null }
</script>

<template>
  <div
    class="item"
    :class="{
      done: item.done,
      selected: store.selectedId === item.id,
      dragging: store.dragSourceId === item.id,
      'drop-before': dropPos === 'before',
      'drop-after': dropPos === 'after',
    }"
    :draggable="!store.config.locked && !isEditing"
    @click="onRowClick"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <!-- Checkbox -->
    <button class="check" :disabled="store.config.locked" @click.stop="store.toggleItem(item.id)">
      <svg v-if="item.done" viewBox="0 0 24 24" width="20" height="20">
        <circle cx="12" cy="12" r="10" fill="var(--text-2)"/>
        <path d="M9 12.5l2 2 4-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none">
        <circle cx="12" cy="12" r="9.25" stroke="var(--text-3)" stroke-width="1.5"/>
      </svg>
    </button>

    <!-- Text / edit -->
    <input
      v-if="isEditing"
      ref="editEl"
      v-model="editText"
      class="edit-input"
      @keydown="onEditKey"
      @blur="commitEdit"
      @click.stop
    />
    <span
      v-else
      class="text"
      :class="{ bold: item.bold }"
      @dblclick.stop="startEdit"
    >{{ item.text }}</span>

    <!-- Date (hover) -->
    <span class="date">{{ dateLabel }}</span>

    <!-- Delete -->
    <button
      class="del"
      :disabled="store.config.locked"
      @click.stop="store.deleteItem(item.id)"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 9px;
  cursor: default;
  position: relative;
  border: 1px solid transparent;
  transition: background 0.1s;
  min-height: 40px;
}

.item:hover { background: var(--hover); }
.item:hover .del { opacity: 0.45; }
.item:hover .date { opacity: 1; }

.item.selected {
  background: var(--sel);
  border-color: var(--sel-border);
}
.item.selected .del { opacity: 0.5; }

.item.dragging { opacity: 0.3; }

/* Drop indicator */
.item.drop-before::before,
.item.drop-after::after {
  content: '';
  position: absolute;
  left: 10px; right: 10px;
  height: 2px;
  background: var(--text-2);
  border-radius: 1px;
}
.item.drop-before::before { top: 0; }
.item.drop-after::after { bottom: 0; }

/* Checkbox */
.check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border: none; background: transparent;
  cursor: pointer; flex-shrink: 0; padding: 4px;
  border-radius: 50%;
  transition: background 0.1s;
}
.check:hover:not(:disabled) { background: var(--hover); }
.check:disabled { cursor: not-allowed; }

/* Text */
.text {
  flex: 1; min-width: 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.4;
  word-break: break-word;
  user-select: none;
}
.text.bold { font-weight: 700; }
.item.done .text {
  text-decoration: line-through;
  color: var(--text-2);
}

/* Inline edit */
.edit-input {
  flex: 1; min-width: 0;
  height: 28px; padding: 0 8px;
  border: 1.5px solid var(--sep);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 14px; font-family: inherit;
  outline: none;
}

/* Date badge */
.date {
  font-size: 11px;
  color: var(--text-3);
  opacity: 0;
  transition: opacity 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
  pointer-events: none;
}

/* Delete */
.del {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  border: none; background: transparent;
  color: var(--text-2);
  cursor: pointer; border-radius: 6px;
  opacity: 0; flex-shrink: 0;
  transition: opacity 0.1s, background 0.1s, color 0.1s;
}
.del:hover:not(:disabled) {
  background: var(--hover);
  color: var(--text);
  opacity: 1 !important;
}
.del:disabled { cursor: not-allowed; }
</style>
