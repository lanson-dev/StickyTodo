<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import type { TodoItem } from '@/stores/todo'
import { useTodoStore } from '@/stores/todo'

const props = defineProps<{ item: TodoItem; index?: number }>()
const emit = defineEmits<{
  (e: 'drag-start', id: string, y: number): void
  (e: 'drag-move', y: number): void
  (e: 'drag-end'): void
}>()
const store = useTodoStore()

// ── Date helpers ────────────────────────────────────────
function fmtDay(ts: number) {
  const d = new Date(ts)
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  return `${M}/${D}`
}

const createdLabel = computed(() => fmtDay(props.item.createdAt))
const completedLabel = computed(() =>
  props.item.completedAt ? fmtDay(props.item.completedAt) : '',
)

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

// ── Context menu ─────────────────────────────────────────
const ctxMenu = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const insertMode = ref(false)
const insertText = ref('')
const insertEl = ref<HTMLInputElement | null>(null)

function onContextMenu(e: MouseEvent) {
  if (store.config.locked || props.item.done) return
  e.preventDefault()
  e.stopPropagation()
  closeCtx()
  ctxX.value = e.clientX
  ctxY.value = e.clientY
  ctxMenu.value = true
  setTimeout(() => {
    window.addEventListener('mousedown', closeCtx)
    window.addEventListener('blur', closeCtx)
  }, 0)
}
function closeCtx() {
  ctxMenu.value = false
  window.removeEventListener('mousedown', closeCtx)
  window.removeEventListener('blur', closeCtx)
}
function ctxInsert() {
  ctxMenu.value = false
  insertMode.value = true
  insertText.value = ''
  nextTick(() => insertEl.value?.focus())
}
function ctxDelete() {
  ctxMenu.value = false
  store.deleteItem(props.item.id)
}
function commitInsert() {
  if (!insertMode.value) return
  insertMode.value = false
  if (insertText.value.trim()) {
    store.insertAfter(props.item.id, insertText.value)
  }
}
function onInsertKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); commitInsert() }
  if (e.key === 'Escape') { insertMode.value = false }
}

// ── Mouse-based drag ─────────────────────────────────────
let dragStartY = 0
let isDragging = false

function onPointerDown(e: PointerEvent) {
  if (store.config.locked || isEditing.value || props.item.done) return
  if ((e.target as HTMLElement).closest('button, input')) return
  if (e.button !== 0) return  // left button only
  dragStartY = e.clientY
  isDragging = false
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging && Math.abs(e.clientY - dragStartY) > 4) {
    isDragging = true
    emit('drag-start', props.item.id, e.clientY)
  }
  if (isDragging) {
    emit('drag-move', e.clientY)
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  if (isDragging) {
    emit('drag-end')
    isDragging = false
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  closeCtx()
})
</script>

<template>
  <div class="item-wrapper" :data-id="item.id">
    <div
      class="item"
      :class="{
        done: item.done,
        dragging: store.dragSourceId === item.id,
      }"
      @dblclick.stop="startEdit"
      @contextmenu="onContextMenu"
      @pointerdown="onPointerDown"
    >
      <!-- Number index for TODO items -->
      <span v-if="!item.done && index != null" class="num">{{ index + 1 }}.</span>

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
      <span v-else class="text" :class="{ bold: item.bold }">{{ item.text }}</span>

      <!-- TODO items: hover shows created date -->
      <span v-if="!item.done && !store.config.locked" class="hover-date">{{ createdLabel }}</span>

      <!-- Done items: timestamps -->
      <span v-if="item.done" class="timestamps">
        <span class="ts-label">{{ createdLabel }}</span>
        <span class="ts-sep">→</span>
        <span class="ts-label">{{ completedLabel }}</span>
      </span>

      <!-- TODO: hover shows check button -->
      <button
        v-if="!item.done"
        class="action-btn check-btn"
        title="Complete"
        :disabled="store.config.locked"
        @click.stop="store.toggleItem(item.id)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </button>

      <!-- Done: hover shows undo button -->
      <button
        v-if="item.done"
        class="action-btn undo-btn"
        title="Undo"
        :disabled="store.config.locked"
        @click.stop="store.unDoneItem(item.id)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L2.5 7.5v9h9l-3.19-3.19c1.3-1.26 3.06-2.03 5.01-2.03 3.22 0 5.93 2.13 6.84 5.05l2.17-.72C21.1 11.69 17.15 8 12.5 8z"/>
        </svg>
      </button>

      <!-- Done: delete button -->
      <button
        v-if="item.done"
        class="del"
        :disabled="store.config.locked"
        @click.stop="store.deleteItem(item.id)"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <!-- Inline insert row -->
    <div v-if="insertMode" class="insert-row">
      <input
        ref="insertEl"
        v-model="insertText"
        class="insert-input"
        placeholder="New task…"
        @keydown="onInsertKey"
        @blur="commitInsert"
      />
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="ctxMenu"
        class="ctx-menu"
        :class="`theme-${store.config.theme}`"
        :style="{ left: ctxX + 'px', top: ctxY + 'px' }"
        @mousedown.stop
      >
        <button class="ctx-item" @click="ctxInsert">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Insert below
        </button>
        <button class="ctx-item ctx-danger" @click="ctxDelete">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          Delete
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.item-wrapper { position: relative; }
.item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 9px;
  cursor: default;
  position: relative;
  border: 1px solid transparent;
  transition: background 0.1s, opacity 0.15s;
  min-height: 36px;
  user-select: none;
}
.item:not(.done) { cursor: grab; }
.item:not(.done):active { cursor: grabbing; }
.item:hover { background: var(--hover); }
.item:hover .action-btn { opacity: 0.55; }
.item:hover .del { opacity: 0.45; }
.item:hover .hover-date { opacity: 1; }
.item.dragging { opacity: 0.35; }

.num {
  font-size: 12px; color: var(--text-3);
  min-width: 22px; text-align: right; flex-shrink: 0;
  font-variant-numeric: tabular-nums; user-select: none;
}
.text {
  flex: 1; min-width: 0; font-size: 14px; color: var(--text);
  line-height: 1.4; word-break: break-word; user-select: none;
}
.text.bold { font-weight: 700; }
.item.done .text { text-decoration: line-through; color: var(--text-2); }
.edit-input {
  flex: 1; min-width: 0; height: 28px; padding: 0 8px;
  border: 1.5px solid var(--sep); border-radius: 6px;
  background: var(--surface); color: var(--text);
  font-size: 14px; font-family: inherit; outline: none;
}
.timestamps {
  display: flex; align-items: center; gap: 3px;
  flex-shrink: 0; font-size: 10px; color: var(--text-3); white-space: nowrap;
}
.hover-date {
  flex-shrink: 0; font-size: 10px; color: var(--text-3);
  white-space: nowrap; opacity: 0; transition: opacity 0.15s; user-select: none;
}
.ts-sep { opacity: 0.5; }
.action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; background: transparent;
  color: var(--text-2); cursor: pointer; border-radius: 6px;
  opacity: 0; flex-shrink: 0;
  transition: opacity 0.12s, background 0.1s, color 0.1s;
}
.action-btn:hover:not(:disabled) { background: var(--hover); color: var(--text); opacity: 1 !important; }
.action-btn:disabled { cursor: not-allowed; }
.check-btn:hover:not(:disabled) { color: #4caf50; }
.undo-btn:hover:not(:disabled) { color: #ff9800; }
.del {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border: none; background: transparent;
  color: var(--text-2); cursor: pointer; border-radius: 6px;
  opacity: 0; flex-shrink: 0; transition: opacity 0.1s, background 0.1s, color 0.1s;
}
.del:hover:not(:disabled) { background: var(--hover); color: var(--text); opacity: 1 !important; }
.del:disabled { cursor: not-allowed; }
.insert-row { padding: 2px 8px 2px 30px; }
.insert-input {
  width: 100%; height: 30px; padding: 0 8px;
  border: 1.5px solid var(--sep); border-radius: 6px;
  background: var(--surface); color: var(--text);
  font-size: 13px; font-family: inherit; outline: none;
}
.ctx-menu {
  position: fixed; z-index: 9999;
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 8px;
  padding: 4px; min-width: 150px; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
}
.ctx-menu.theme-dark {
  background: rgba(50,50,54,0.92);
  border: 1px solid rgba(255,255,255,0.08);
}
.ctx-menu.theme-light {
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,0,0,0.06);
}
.ctx-item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 10px;
  border: none; background: transparent;
  font-size: 13px; font-family: inherit; cursor: pointer;
  border-radius: 5px; transition: background 0.1s;
}
.ctx-menu.theme-dark .ctx-item { color: #f0f0f0; }
.ctx-menu.theme-light .ctx-item { color: #1a1a1a; }
.ctx-menu.theme-dark .ctx-item:hover { background: rgba(255,255,255,0.06); }
.ctx-menu.theme-light .ctx-item:hover { background: rgba(0,0,0,0.05); }
.ctx-danger:hover { color: #ef5350 !important; }
</style>