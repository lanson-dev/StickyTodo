<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useTodoStore } from '@/stores/todo'
import TodoItem from '@/components/TodoItem.vue'

const store = useTodoStore()
type Tab = 'todo' | 'done'
const tab = ref<Tab>('todo')
const showSettings = ref(false)
const autoStart = ref(false)

async function loadAutoStart() {
  try { autoStart.value = await invoke<boolean>('get_autostart') } catch {}
}
async function toggleAutoStart() {
  autoStart.value = !autoStart.value
  try { await invoke('set_autostart', { enabled: autoStart.value }) } catch {}
}

const todoCount = computed(() => store.todoItems.length)
const todayDoneCount = computed(() => store.todayDoneCount)

// Dynamic background & text style based on opacity settings
const appStyle = computed(() => {
  const cfg = store.config
  const bgPct = cfg.locked ? cfg.lockedBgOpacity : cfg.bgOpacity
  const bgAlpha = (bgPct / 100).toFixed(2)
  const txtPct = cfg.textOpacity
  const textAlpha = (txtPct / 100).toFixed(2)
  const textAlpha2 = (txtPct / 100 * 0.55).toFixed(2)
  const textAlpha3 = (txtPct / 100 * 0.35).toFixed(2)

  const bg = cfg.theme === 'dark'
    ? `rgba(30,30,32,${bgAlpha})`
    : `rgba(255,255,255,${bgAlpha})`
  const text = cfg.theme === 'dark'
    ? `rgba(240,240,240,${textAlpha})`
    : `rgba(26,26,26,${textAlpha})`
  const text2 = cfg.theme === 'dark'
    ? `rgba(255,255,255,${textAlpha2})`
    : `rgba(0,0,0,${textAlpha2})`
  const text3 = cfg.theme === 'dark'
    ? `rgba(255,255,255,${textAlpha3})`
    : `rgba(0,0,0,${textAlpha3})`

  return {
    '--dyn-bg': bg,
    '--dyn-text': text,
    '--dyn-text-2': text2,
    '--dyn-text-3': text3,
  } as Record<string, string>
})

// Group done items by completion date
const groupedDone = computed(() => {
  const groups: { label: string; items: typeof store.doneItems }[] = []
  const now = new Date()
  const todayStr = fmtDayKey(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = fmtDayKey(yesterday)

  const map = new Map<string, typeof store.doneItems>()
  for (const item of store.doneItems) {
    const key = item.completedAt ? fmtDayKey(new Date(item.completedAt)) : 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  for (const [key, items] of map) {
    let label = key
    if (key === todayStr) label = 'Today'
    else if (key === yesterdayStr) label = 'Yesterday'
    groups.push({ label, items })
  }
  return groups
})

function fmtDayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

let unlisten: (() => void) | null = null
let unlistenStick: (() => void) | null = null
onMounted(async () => {
  await store.init()
  await loadAutoStart()
  window.addEventListener('keydown', onKey)
  unlisten = await listen('toggle-lock', () => {
    store.setLocked(!store.config.locked)
  })
  unlistenStick = await listen('toggle-stick', () => {
    store.setAlwaysOnTop(!store.config.alwaysOnTop)
  })
  // Show window after everything is loaded (it starts hidden to avoid flash / webview errors on boot)
  try {
    const win = getCurrentWebviewWindow()
    await win.show()
    await win.setFocus()
  } catch {}
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  unlisten?.()
  unlistenStick?.()
})

function onKey(e: KeyboardEvent) {
  if (e.ctrlKey && e.key.toLowerCase() === 'b') {
    if (document.activeElement?.tagName === 'INPUT') return
    e.preventDefault()
    if (store.selectedId) store.toggleBold(store.selectedId)
  }
  if (e.key === 'Escape') {
    if (addingNew.value) { addingNew.value = false; return }
    if (showSettings.value) { showSettings.value = false }
  }
}

// Opacity change handlers (debounced persist)
let opacityTimer: ReturnType<typeof setTimeout> | null = null
function onBgOpacityChange(e: Event) {
  store.config.bgOpacity = Number((e.target as HTMLInputElement).value)
  debouncePersistConfig()
}
function onLockedBgOpacityChange(e: Event) {
  store.config.lockedBgOpacity = Number((e.target as HTMLInputElement).value)
  debouncePersistConfig()
}
function onTextOpacityChange(e: Event) {
  store.config.textOpacity = Number((e.target as HTMLInputElement).value)
  debouncePersistConfig()
}
function openGitHub() {
  invoke('open_url', { url: 'https://github.com/lanson-dev/StickyTodo' })
}
function debouncePersistConfig() {
  if (opacityTimer) clearTimeout(opacityTimer)
  opacityTimer = setTimeout(() => {
    invoke('save_config', { data: JSON.stringify(store.config) })
  }, 400)
}

// ── Inline add ────────────────────────────────────────────
const addingNew = ref(false)
const newText = ref('')
const newInputEl = ref<HTMLInputElement | null>(null)
const listCtx = ref(false)
const listCtxX = ref(0)
const listCtxY = ref(0)

function onListDblClick(e: MouseEvent) {
  if (store.config.locked) return
  if ((e.target as HTMLElement).closest('.item')) return
  startAdding()
}
function onListContextMenu(e: MouseEvent) {
  if (store.config.locked) return
  if ((e.target as HTMLElement).closest('.item')) return
  closeListCtx()
  listCtxX.value = e.clientX
  listCtxY.value = e.clientY
  listCtx.value = true
  setTimeout(() => {
    window.addEventListener('mousedown', closeListCtx)
    window.addEventListener('blur', closeListCtx)
  }, 0)
}
function closeListCtx() {
  listCtx.value = false
  window.removeEventListener('mousedown', closeListCtx)
  window.removeEventListener('blur', closeListCtx)
}
function startAdding() {
  addingNew.value = true
  newText.value = ''
  nextTick(() => newInputEl.value?.focus())
}
function commitAdd() {
  if (!addingNew.value) return
  addingNew.value = false
  if (newText.value.trim()) store.addTodo(newText.value)
}
function onAddKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); commitAdd() }
  if (e.key === 'Escape') { addingNew.value = false }
}
function ctxAddItem() { listCtx.value = false; startAdding() }

// ── Drag reorder ──────────────────────────────────────────
const dragId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropPosition = ref<'before' | 'after'>('after')
const listEl = ref<HTMLElement | null>(null)

function onItemDragStart(id: string) { dragId.value = id; store.dragSourceId = id }
function onItemDragMove(y: number) {
  if (!dragId.value || !listEl.value) return
  const wrappers = listEl.value.querySelectorAll<HTMLElement>('.item-wrapper[data-id]')
  let closestId: string | null = null
  let closestPos = 'after' as 'before' | 'after'
  let closestDist = Infinity
  wrappers.forEach((el) => {
    const elId = el.dataset.id
    if (!elId || elId === dragId.value) return
    const rect = el.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    const dist = Math.abs(y - mid)
    if (dist < closestDist) { closestId = elId; closestPos = y < mid ? 'before' : 'after'; closestDist = dist }
  })
  if (closestId) {
    dropTargetId.value = closestId; dropPosition.value = closestPos
    const cid = closestId; const cpos = closestPos
    wrappers.forEach((el) => {
      el.classList.remove('drop-before', 'drop-after')
      if (el.dataset.id === cid) el.classList.add(cpos === 'before' ? 'drop-before' : 'drop-after')
    })
  }
}
function onItemDragEnd() {
  if (dragId.value && dropTargetId.value) store.reorderItem(dragId.value, dropTargetId.value, dropPosition.value)
  if (listEl.value) listEl.value.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'))
  dragId.value = null; dropTargetId.value = null; store.dragSourceId = null
}
</script>

<template>
  <div
    class="app"
    :class="[`theme-${store.config.theme}`, { locked: store.config.locked }]"
    :style="appStyle"
    @contextmenu.prevent
  >
    <header class="header" data-tauri-drag-region>
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'todo' && !showSettings }" @click="tab = 'todo'; showSettings = false">
          Todo <span v-if="todoCount" class="badge">{{ todoCount }}</span>
        </button>
        <span class="tab-divider" />
        <button class="tab" :class="{ active: tab === 'done' && !showSettings }" @click="tab = 'done'; showSettings = false">
          Done <span v-if="todayDoneCount" class="badge done-badge">{{ todayDoneCount }}</span>
        </button>
      </div>
      <div class="controls">
        <button class="ctrl-btn" :class="{ active: showSettings }" title="Settings" @click="showSettings = !showSettings">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.3.07-.62.07-.95s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.99l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/></svg>
        </button>
        <button class="ctrl-btn lock-btn" :class="{ active: store.config.locked }" :title="store.config.locked ? 'Ctrl+Shift+Alt+L to unlock' : 'Lock (Ctrl+Shift+Alt+L)'" @click="store.setLocked(!store.config.locked)">
          <svg v-if="store.config.locked" viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 1C9.24 1 7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" opacity=".45"/></svg>
        </button>
        <button class="ctrl-btn" :class="{ active: store.config.alwaysOnTop }" :title="store.config.alwaysOnTop ? 'Unpin' : 'Pin on top'" @click="store.setAlwaysOnTop(!store.config.alwaysOnTop)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
        </button>
        <button class="ctrl-btn" title="Minimize" @click="invoke('minimize_window')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
        </button>
        <button class="ctrl-btn close-btn" title="Close" @click="invoke('close_window')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
    </header>

    <!-- Settings -->
    <Transition name="panel">
      <div v-if="showSettings" class="settings-panel">
        <!-- Row 1: Theme + Auto Start -->
        <div class="settings-row">
          <div class="segment">
            <button :class="{ on: store.config.theme === 'dark' }" @click="store.setTheme('dark')">Dark</button>
            <button :class="{ on: store.config.theme === 'light' }" @click="store.setTheme('light')">Light</button>
          </div>
          <label class="toggle-row" @click.prevent="toggleAutoStart">
            <span class="toggle-label">Auto Start</span>
            <span class="toggle-switch" :class="{ on: autoStart }"><span class="toggle-knob" /></span>
          </label>
        </div>
        <!-- Row 2: Opacity sliders -->
        <div class="settings-row opacity-row">
          <div class="slider-group">
            <span class="slider-label">BG</span>
            <input type="range" min="10" max="100" :value="store.config.bgOpacity" @input="onBgOpacityChange" class="slider" />
            <span class="slider-val">{{ store.config.bgOpacity }}%</span>
          </div>
          <div class="slider-group">
            <span class="slider-label">BG Lock</span>
            <input type="range" min="5" max="100" :value="store.config.lockedBgOpacity" @input="onLockedBgOpacityChange" class="slider" />
            <span class="slider-val">{{ store.config.lockedBgOpacity }}%</span>
          </div>
          <div class="slider-group">
            <span class="slider-label">Text</span>
            <input type="range" min="15" max="100" :value="store.config.textOpacity" @input="onTextOpacityChange" class="slider" />
            <span class="slider-val">{{ store.config.textOpacity }}%</span>
          </div>
        </div>
        <!-- Row 3: Hints + Link -->
        <div class="settings-footer">
          <div class="settings-hints">
            <span><kbd>dblclick</kbd> add / edit</span>
            <span><kbd>Ctrl+Shift+Alt+L</kbd> lock</span>
            <span>drag to sort</span>
          </div>
          <a class="github-link" href="https://github.com/lanson-dev/StickyTodo" @click.prevent="openGitHub" title="GitHub">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          </a>
        </div>
      </div>
    </Transition>

    <!-- Content -->
    <div class="content">
      <template v-if="tab === 'todo'">
        <div ref="listEl" class="list" @dblclick="onListDblClick" @contextmenu="onListContextMenu">
          <TodoItem v-for="(item, idx) in store.todoItems" :key="item.id" :item="item" :index="idx"
            @drag-start="onItemDragStart" @drag-move="onItemDragMove" @drag-end="onItemDragEnd" />
          <div v-if="addingNew" class="add-row">
            <input ref="newInputEl" v-model="newText" class="add-input" placeholder="New task…" @keydown="onAddKey" @blur="commitAdd" />
          </div>
          <div v-if="!store.todoItems.length && !addingNew" class="empty">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2H7v-2h4v2zm6-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            <p>Double-click to add a task</p>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="list">
          <template v-for="group in groupedDone" :key="group.label">
            <div class="date-group">{{ group.label }}</div>
            <TodoItem v-for="item in group.items" :key="item.id" :item="item" />
          </template>
          <div v-if="!store.doneItems.length" class="empty">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <p>All done</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Resize grip -->
    <div class="resize-grip">
      <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" opacity="0.25">
        <circle cx="9" cy="9" r="1.2"/><circle cx="5" cy="9" r="1.2"/><circle cx="9" cy="5" r="1.2"/>
        <circle cx="1" cy="9" r="1.2"/><circle cx="5" cy="5" r="1.2"/><circle cx="9" cy="1" r="1.2"/>
      </svg>
    </div>

    <!-- List context menu -->
    <Teleport to="body">
      <div v-if="listCtx" class="ctx-menu" :class="`theme-${store.config.theme}`" :style="{ left: listCtxX + 'px', top: listCtxY + 'px' }" @mousedown.stop>
        <button class="ctx-item" @click="ctxAddItem">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Add task
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased;background:transparent}
#app{width:100%;height:100vh;background:transparent}
</style>

<style scoped>
/* App uses --dyn-bg (set via inline style) for unified background */
.app{display:flex;flex-direction:column;height:100vh;background:var(--dyn-bg, rgba(30,30,32,0.58));backdrop-filter:blur(32px) saturate(180%);-webkit-backdrop-filter:blur(32px) saturate(180%);overflow:hidden;transition:background .25s;border-radius:14px;
  --surface:rgba(50,50,54,0.40);--text:var(--dyn-text,#f0f0f0);--text-2:var(--dyn-text-2,rgba(255,255,255,0.40));--text-3:var(--dyn-text-3,rgba(255,255,255,0.20));
  --fg:#f0f0f0;--sep:rgba(255,255,255,0.08);--hover:rgba(255,255,255,0.05);--input-bg:rgba(255,255,255,0.08);--accent:#0a84ff;
  --text-shadow:0 1px 3px rgba(0,0,0,0.35)}
.app.theme-light{background:var(--dyn-bg, rgba(255,255,255,0.55));
  --surface:rgba(255,255,255,0.40);--text:var(--dyn-text,#1a1a1a);--text-2:var(--dyn-text-2,rgba(0,0,0,0.35));--text-3:var(--dyn-text-3,rgba(0,0,0,0.18));
  --fg:#1a1a1a;--sep:rgba(0,0,0,0.06);--hover:rgba(0,0,0,0.04);--input-bg:rgba(0,0,0,0.05);--accent:#007aff;
  --text-shadow:0 1px 3px rgba(255,255,255,0.4)}
.app.locked .tabs{pointer-events:none;opacity:.5}
.app.locked .content{pointer-events:none}
.app.locked .ctrl-btn{pointer-events:none;opacity:.4}
.app.locked .ctrl-btn.lock-btn{pointer-events:auto;opacity:1}
.app.locked .settings-panel{pointer-events:none;opacity:.5}

/* Header: transparent bg so it shares the .app background */
.header{display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 6px 0 14px;background:transparent;flex-shrink:0;gap:8px;border-radius:14px 14px 0 0}
.tabs{display:flex;align-items:center;gap:2px}
.tab{display:flex;align-items:center;gap:5px;padding:4px 8px;border:none;background:transparent;font-size:15px;font-weight:500;color:var(--text-2);cursor:pointer;border-radius:6px;transition:color .15s,background .15s;white-space:nowrap;text-shadow:var(--text-shadow)}
.tab:hover{color:var(--text)}
.tab.active{color:var(--text);font-weight:600}
.tab-divider{width:1px;height:12px;background:var(--sep);margin:0 2px}
.badge{font-size:10px;font-weight:600;padding:1px 5px;border-radius:8px;background:var(--text-3);color:var(--text);line-height:1.5}
.done-badge{background:var(--text-3)}
.controls{display:flex;align-items:center;gap:1px}
.ctrl-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:none;background:transparent;color:var(--text-2);cursor:pointer;border-radius:7px;transition:background .12s,color .12s,opacity .15s}
.ctrl-btn:hover{background:var(--hover);color:var(--text)}
.ctrl-btn.active{color:var(--text)}
.close-btn:hover{background:rgba(255,59,48,0.15);color:#ff3b30}

/* Settings panel: also transparent bg */
.settings-panel{padding:10px 16px;border-top:1px solid var(--sep);border-bottom:1px solid var(--sep);display:flex;flex-direction:column;flex-shrink:0;background:transparent;gap:10px;transition:opacity .15s}
.settings-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.segment{display:flex;background:var(--input-bg);border-radius:7px;padding:2px;gap:2px}
.segment button{padding:3px 12px;border:none;background:transparent;border-radius:5px;font-size:12px;font-weight:500;color:var(--text-2);cursor:pointer;transition:background .15s,color .15s}
.segment button.on{background:var(--accent);color:#fff}
.toggle-row{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none}
.toggle-label{font-size:12px;color:var(--text-2);font-weight:500}
.toggle-switch{position:relative;width:32px;height:18px;border-radius:9px;background:var(--input-bg);transition:background .2s;flex-shrink:0}
.toggle-switch.on{background:var(--accent)}
.toggle-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}
.toggle-switch.on .toggle-knob{transform:translateX(14px)}

/* Opacity sliders */
.opacity-row{gap:16px}
.slider-group{display:flex;align-items:center;gap:6px}
.slider-label{font-size:11px;color:var(--text-3);min-width:42px;font-weight:500}
.slider{-webkit-appearance:none;appearance:none;width:80px;height:4px;border-radius:2px;background:var(--input-bg);outline:none;cursor:pointer}
.slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.slider-val{font-size:10px;color:var(--text-3);min-width:28px;text-align:right;font-variant-numeric:tabular-nums}

.settings-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}
.github-link{display:flex;align-items:center;justify-content:center;width:24px;height:24px;color:var(--text-3);border-radius:6px;transition:color .15s,background .15s;flex-shrink:0;cursor:pointer;text-decoration:none}
.github-link:hover{color:var(--text);background:var(--hover)}
.settings-hints{display:flex;gap:10px}
.settings-hints span{font-size:11px;color:var(--text-3);display:flex;align-items:center;gap:4px}
kbd{font-size:10px;padding:1px 5px;background:var(--hover);border:1px solid var(--sep);border-radius:4px;color:var(--text-2);font-family:inherit}
.panel-enter-active,.panel-leave-active{transition:opacity .18s ease,transform .18s ease}
.panel-enter-from,.panel-leave-to{opacity:0;transform:translateY(-6px)}

/* Content */
.content{flex:1;display:flex;flex-direction:column;overflow:hidden;transition:opacity .15s}
.list{flex:1;overflow-y:auto;padding:4px 8px 12px}
.list::-webkit-scrollbar{width:3px}
.list::-webkit-scrollbar-track{background:transparent}
.list::-webkit-scrollbar-thumb{background:var(--sep);border-radius:2px}
.add-row{padding:4px 8px}
.add-input{width:100%;height:34px;padding:0 10px;border:1.5px solid var(--sep);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color .15s}
.add-input:focus{border-color:var(--text-2)}
.add-input::placeholder{color:var(--text-3)}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px 24px;color:var(--text-3);font-size:13px}
.date-group{padding:8px 10px 2px;font-size:11px;font-weight:600;color:var(--text-3);letter-spacing:.3px;user-select:none}
.resize-grip{position:fixed;bottom:2px;right:2px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-3);pointer-events:none;z-index:10}

:deep(.item-wrapper.drop-before::before),:deep(.item-wrapper.drop-after::after){content:'';position:absolute;left:10px;right:10px;height:2px;background:var(--text-2);border-radius:1px;z-index:5}
:deep(.item-wrapper.drop-before::before){top:0}
:deep(.item-wrapper.drop-after::after){bottom:0}

.ctx-menu{position:fixed;z-index:9999;backdrop-filter:blur(20px) saturate(180%);border-radius:8px;padding:4px;min-width:150px;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.ctx-menu.theme-dark{background:rgba(50,50,54,0.92);border:1px solid rgba(255,255,255,0.08)}
.ctx-menu.theme-light{background:rgba(255,255,255,0.92);border:1px solid rgba(0,0,0,0.06)}
.ctx-item{display:flex;align-items:center;gap:8px;width:100%;padding:6px 10px;border:none;background:transparent;font-size:13px;font-family:inherit;cursor:pointer;border-radius:5px;transition:background .1s}
.ctx-menu.theme-dark .ctx-item{color:#f0f0f0}
.ctx-menu.theme-light .ctx-item{color:#1a1a1a}
.ctx-menu.theme-dark .ctx-item:hover{background:rgba(255,255,255,0.06)}
.ctx-menu.theme-light .ctx-item:hover{background:rgba(0,0,0,0.05)}
</style>