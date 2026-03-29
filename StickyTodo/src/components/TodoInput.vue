<script setup lang="ts">
import { ref } from 'vue'
import { useTodoStore } from '@/stores/todo'

const store = useTodoStore()
const text = ref('')

function submit() {
  const t = text.value.trim()
  if (!t) return
  store.addTodo(t)
  text.value = ''
}
</script>

<template>
  <div class="input-wrap">
    <div class="input-row" :class="{ disabled: store.config.locked }">
      <input
        v-model="text"
        class="input"
        type="text"
        placeholder="New task…"
        :disabled="store.config.locked"
        @keydown.enter="submit"
      />
      <button class="add" :disabled="store.config.locked" @click="submit" tabindex="-1">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-wrap {
  padding: 10px 12px 6px;
  flex-shrink: 0;
}

.input-row {
  display: flex;
  align-items: center;
  background: var(--input-bg);
  border-radius: 10px;
  padding: 0 4px 0 12px;
  transition: box-shadow 0.15s;
}
.input-row:focus-within {
  box-shadow: 0 0 0 2px var(--sep);
}
.input-row.disabled { opacity: 0.4; }

.input {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  outline: none;
  font-family: inherit;
}
.input::placeholder { color: var(--text-3); }

.add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  background: var(--fg);
  color: var(--bg, #fff);
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.add:hover:not(:disabled) { opacity: 0.82; }
.add:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
