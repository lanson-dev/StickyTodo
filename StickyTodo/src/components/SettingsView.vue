<script setup lang="ts">
import { useTodoStore } from '@/stores/todo'

const store = useTodoStore()
</script>

<template>
  <div class="settings-view">
    <section class="section">
      <div class="section-title">外观</div>

      <div class="setting-row">
        <span class="setting-label">主题</span>
        <div class="theme-toggle">
          <button
            class="theme-btn"
            :class="{ active: store.config.theme === 'dark' }"
            @click="store.setTheme('dark')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
            深色
          </button>
          <button
            class="theme-btn"
            :class="{ active: store.config.theme === 'light' }"
            @click="store.setTheme('light')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0zM7.05 18.36l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0z"/>
            </svg>
            浅色
          </button>
        </div>
      </div>

      <div class="setting-hint">
        半透明效果会自动应用，锁定时透明度更高
      </div>
    </section>

    <section class="section">
      <div class="section-title">操作提示</div>
      <ul class="tips">
        <li><kbd>Enter</kbd> 新增待办</li>
        <li><kbd>双击</kbd> 编辑条目文字</li>
        <li><kbd>Ctrl+B</kbd> 对选中条目加粗</li>
        <li>拖拽左侧把手调整顺序</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.setting-label {
  font-size: 13px;
  color: var(--color-text);
}

.theme-toggle {
  display: flex;
  gap: 4px;
  background: var(--color-hover);
  border-radius: 8px;
  padding: 3px;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.theme-btn.active {
  background: var(--color-accent);
  color: #fff;
}

.theme-btn:not(.active):hover {
  background: var(--color-border);
  color: var(--color-text);
}

.setting-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.5;
  opacity: 0.7;
}

.tips {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tips li {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

kbd {
  font-family: inherit;
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-hover);
  color: var(--color-text);
  white-space: nowrap;
}
</style>
