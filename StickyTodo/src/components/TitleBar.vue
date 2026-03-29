<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { useTodoStore } from '@/stores/todo'

const store = useTodoStore()

function togglePin() {
  store.setAlwaysOnTop(!store.config.alwaysOnTop)
}

function toggleLock() {
  store.setLocked(!store.config.locked)
}

function minimize() {
  invoke('minimize_window')
}

function close() {
  invoke('close_window')
}
</script>

<template>
  <div class="title-bar">
    <div class="drag-region" data-tauri-drag-region>
      <span class="app-title">StickyTodo</span>
    </div>
    <div class="actions">
      <button
        class="icon-btn"
        :class="{ active: store.config.alwaysOnTop }"
        :title="store.config.alwaysOnTop ? '取消置顶' : '置顶'"
        @click="togglePin"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
      </button>
      <button
        class="icon-btn lock-btn"
        :title="store.config.locked ? '解锁' : '锁定'"
        @click="toggleLock"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <template v-if="store.config.locked">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </template>
          <template v-else>
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-9-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" opacity="0.4" />
            <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" opacity="0.4" />
          </template>
        </svg>
      </button>
      <button class="icon-btn" title="最小化" @click="minimize">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      </button>
      <button class="icon-btn close-btn" title="关闭" @click="close">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 36px;
  background: var(--color-bg-titlebar);
  border-bottom: 1px solid var(--color-border);
  user-select: none;
  flex-shrink: 0;
  border-radius: 10px 10px 0 0;
}

.drag-region {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 100%;
  cursor: default;
}

.app-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: none;
}

.actions {
  display: flex;
  align-items: center;
  padding-right: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.icon-btn.active {
  color: var(--color-accent);
}

.close-btn:hover {
  background: #e74c3c;
  color: #fff;
}
</style>
