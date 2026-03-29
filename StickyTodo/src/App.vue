<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useTodoStore } from '@/stores/todo'
import TodoItem from '@/components/TodoItem.vue'
import TodoInput from '@/components/TodoInput.vue'

const store = useTodoStore()
type Tab = 'todo' | 'done'
const tab = ref<Tab>('todo')
const showSettings = ref(false)

const todoCount = computed(() => store.todoItems.length)
const doneCount = computed(() => store.doneItems.length)

onMounted(async () => {
  await store.init()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function onKey(e: KeyboardEvent) {
  if (e.ctrlKey && e.key.toLowerCase() === 'b') {
    if (document.activeElement?.tagName === 'INPUT') return
    e.preventDefault()
    if (store.selectedId) store.toggleBold(store.selectedId)
  }
  if (e.key === 'Escape' && showSettings.value) showSettings.value = false
}
</script>

<template>
  <div class="app" :class="[`theme-${store.config.theme}`, { locked: store.config.locked }]">

    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="header" data-tauri-drag-region>

      <!-- Tabs: left -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: tab === 'todo' && !showSettings }"
          @click="tab = 'todo'; showSettings = false"
        >
          Todo
          <span v-if="todoCount" class="badge">{{ todoCount }}</span>
        </button>
        <span class="tab-divider" />
        <button
          class="tab"
          :class="{ active: tab === 'done' && !showSettings }"
          @click="tab = 'done'; showSettings = false"
        >
          Done
          <span v-if="doneCount" class="badge done-badge">{{ doneCount }}</span>
        </button>
      </div>

      <!-- Controls: right -->
      <div class="controls">
        <!-- Settings -->
        <button
          class="ctrl-btn"
          :class="{ active: showSettings }"
          title="Settings"
          @click="showSettings = !showSettings"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.3.07-.62.07-.95s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.99l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
          </svg>
        </button>

        <!-- Lock -->
        <button
          class="ctrl-btn lock-btn"
          :class="{ active: store.config.locked }"
          :title="store.config.locked ? 'Unlock' : 'Lock'"
          @click="store.setLocked(!store.config.locked)"
        >
          <svg v-if="store.config.locked" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M12 1C9.24 1 7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" opacity=".45"/>
          </svg>
        </button>

        <!-- Pin / Always on top -->
        <button
          class="ctrl-btn"
          :class="{ active: store.config.alwaysOnTop }"
          :title="store.config.alwaysOnTop ? 'Unpin' : 'Pin on top'"
          @click="store.setAlwaysOnTop(!store.config.alwaysOnTop)"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </button>

        <!-- Minimize -->
        <button class="ctrl-btn minimize-btn" title="Minimize" @click="invoke('minimize_window')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>

        <!-- Close -->
        <button class="ctrl-btn close-btn" title="Close" @click="invoke('close_window')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- ── Settings panel ─────────────────────────────────── -->
    <Transition name="panel">
      <div v-if="showSettings" class="settings-panel">
        <div class="settings-row">
          <div class="segment">
            <button
              :class="{ on: store.config.theme === 'dark' }"
              @click="store.setTheme('dark')"
            >Dark</button>
            <button
              :class="{ on: store.config.theme === 'light' }"
              @click="store.setTheme('light')"
            >Light</button>
          </div>
        </div>
        <div class="settings-hints">
          <span><kbd>dblclick</kbd> edit</span>
          <span><kbd>Ctrl B</kbd> bold</span>
          <span>drag to sort</span>
        </div>
      </div>
    </Transition>

    <!-- ── Content ────────────────────────────────────────── -->
    <div class="content" @click.self="store.selectedId = null">

      <!-- TODO tab -->
      <template v-if="tab === 'todo'">
        <TodoInput />
        <div class="list" @click.self="store.selectedId = null">
          <TodoItem v-for="item in store.todoItems" :key="item.id" :item="item" />
          <div v-if="!store.todoItems.length" class="empty">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2H7v-2h4v2zm6-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            <p>No tasks</p>
          </div>
        </div>
      </template>

      <!-- Done tab -->
      <template v-else>
        <div class="list-header" v-if="store.doneItems.length">
          <button
            class="clear-btn"
            :disabled="store.config.locked"
            @click="store.clearDone()"
          >Clear</button>
        </div>
        <div class="list" @click.self="store.selectedId = null">
          <TodoItem v-for="item in store.doneItems" :key="item.id" :item="item" />
          <div v-if="!store.doneItems.length" class="empty">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <p>All done</p>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<style>
/* ── Variables ─────────────────────────────────────────── */
.theme-light {
  --bg:         rgba(251, 251, 253, 0.82);
  --bg-locked:  rgba(251, 251, 253, 0.52);
  --surface:    rgba(255, 255, 255, 0.55);
  --header-bg:  rgba(246, 246, 248, 0.75);
  --text:       #111111;
  --text-2:     rgba(0, 0, 0, 0.38);
  --text-3:     rgba(0, 0, 0, 0.22);
  --fg:         #111111;
  --sep:        rgba(0, 0, 0, 0.08);
  --hover:      rgba(0, 0, 0, 0.05);
  --sel:        rgba(0, 0, 0, 0.07);
  --sel-border: rgba(0, 0, 0, 0.18);
  --input-bg:   rgba(0, 0, 0, 0.06);
}

.theme-dark {
  --bg:         rgba(28, 28, 30, 0.82);
  --bg-locked:  rgba(28, 28, 30, 0.48);
  --surface:    rgba(44, 44, 46, 0.55);
  --header-bg:  rgba(36, 36, 38, 0.75);
  --text:       #eeeeee;
  --text-2:     rgba(255, 255, 255, 0.38);
  --text-3:     rgba(255, 255, 255, 0.22);
  --fg:         #eeeeee;
  --sep:        rgba(255, 255, 255, 0.10);
  --hover:      rgba(255, 255, 255, 0.06);
  --sel:        rgba(255, 255, 255, 0.10);
  --sel-border: rgba(255, 255, 255, 0.22);
  --input-bg:   rgba(255, 255, 255, 0.10);
}

/* ── Reset ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: transparent;
}
#app { width: 100%; height: 100vh; background: transparent; }
</style>

<style scoped>
/* ── App shell ─────────────────────────────────────────── */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  overflow: hidden;
  transition: background 0.25s;
}
.app.locked { background: var(--bg-locked); }

/* Lock mode: only the lock button is interactive */
.app.locked .tabs { pointer-events: none; }
.app.locked .content { pointer-events: none; }
.app.locked .ctrl-btn { pointer-events: none; }
.app.locked .ctrl-btn.lock-btn { pointer-events: auto; }

/* ── Header ────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 6px 0 14px;
  background: var(--header-bg);
  flex-shrink: 0;
  gap: 8px;
}

/* Tabs */
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--text); font-weight: 600; }

.tab-divider {
  width: 1px;
  height: 12px;
  background: var(--sep);
  margin: 0 2px;
}

.badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--text-3);
  color: var(--text);
  line-height: 1.5;
}
.done-badge { background: var(--text-3); }

/* Controls */
.controls {
  display: flex;
  align-items: center;
  gap: 1px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  border-radius: 7px;
  transition: background 0.12s, color 0.12s;
}
.ctrl-btn:hover { background: var(--hover); color: var(--text); }
.ctrl-btn.active { color: var(--text); }
.close-btn:hover { background: var(--hover); }
.minimize-btn:hover { background: var(--hover); }

/* ── Settings panel ─────────────────────────────────────── */
.settings-panel {
  padding: 12px 16px;
  border-bottom: 1px solid var(--sep);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: var(--header-bg);
  gap: 16px;
}

.segment {
  display: flex;
  background: var(--input-bg);
  border-radius: 7px;
  padding: 2px;
  gap: 2px;
}
.segment button {
  padding: 3px 12px;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.segment button.on {
  background: var(--fg);
  color: var(--bg-on-fg, #fff);
}
.theme-light .segment button.on { color: #fff; }
.theme-dark .segment button.on { color: #111; }

.settings-hints {
  display: flex;
  gap: 10px;
  margin-left: auto;
}
.settings-hints span {
  font-size: 11px;
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 4px;
}
kbd {
  font-size: 10px;
  padding: 1px 5px;
  background: var(--hover);
  border: 1px solid var(--sep);
  border-radius: 4px;
  color: var(--text-2);
  font-family: inherit;
}

/* Transition */
.panel-enter-active, .panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.panel-enter-from, .panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Content ────────────────────────────────────────────── */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px 0;
  flex-shrink: 0;
}

.clear-btn {
  font-size: 12px;
  color: var(--text-2);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 5px;
  transition: color 0.15s, background 0.15s;
}
.clear-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--hover);
}
.clear-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 12px;
}
.list::-webkit-scrollbar { width: 3px; }
.list::-webkit-scrollbar-track { background: transparent; }
.list::-webkit-scrollbar-thumb { background: var(--sep); border-radius: 2px; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  color: var(--text-3);
  font-size: 13px;
}
</style>
