import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  bold: boolean
  createdAt: number
  completedAt?: number
}

export interface AppConfig {
  x?: number
  y?: number
  width: number
  height: number
  alwaysOnTop: boolean
  locked: boolean
  theme: 'dark' | 'light'
}

const DEFAULT_CONFIG: AppConfig = {
  width: 360,
  height: 600,
  alwaysOnTop: false,
  locked: false,
  theme: 'dark',
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const useTodoStore = defineStore('todo', () => {
  const items = ref<TodoItem[]>([])
  const config = ref<AppConfig>({ ...DEFAULT_CONFIG })
  const initialized = ref(false)
  const selectedId = ref<string | null>(null)
  const dragSourceId = ref<string | null>(null)

  const todoItems = computed(() => items.value.filter((i) => !i.done))
  const doneItems = computed(() => items.value.filter((i) => i.done))

  async function init() {
    if (initialized.value) return
    try {
      const todosJson = await invoke<string>('load_todos')
      const parsed = JSON.parse(todosJson) as Partial<TodoItem>[]
      items.value = parsed.map((i) => ({
        id: i.id ?? genId(),
        text: i.text ?? '',
        done: i.done ?? false,
        bold: i.bold ?? false,
        createdAt: i.createdAt ?? Date.now(),
        completedAt: i.completedAt,
      }))
    } catch {
      items.value = []
    }
    try {
      const configJson = await invoke<string>('load_config')
      const parsed = JSON.parse(configJson) as Partial<AppConfig>
      config.value = {
        width: parsed.width ?? DEFAULT_CONFIG.width,
        height: parsed.height ?? DEFAULT_CONFIG.height,
        alwaysOnTop: parsed.alwaysOnTop ?? DEFAULT_CONFIG.alwaysOnTop,
        locked: parsed.locked ?? DEFAULT_CONFIG.locked,
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        x: parsed.x,
        y: parsed.y,
      }
    } catch {
      config.value = { ...DEFAULT_CONFIG }
    }
    initialized.value = true
  }

  async function persistTodos() {
    try {
      await invoke('save_todos', { data: JSON.stringify(items.value) })
    } catch (err) {
      console.error('[store] Failed to save todos:', err)
    }
  }

  async function persistConfig() {
    try {
      await invoke('save_config', { data: JSON.stringify(config.value) })
    } catch (err) {
      console.error('[store] Failed to save config:', err)
    }
  }

  function addTodo(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    items.value.unshift({
      id: genId(),
      text: trimmed,
      done: false,
      bold: false,
      createdAt: Date.now(),
    })
    persistTodos()
  }

  function toggleItem(id: string) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.done = !item.done
      item.completedAt = item.done ? Date.now() : undefined
      if (selectedId.value === id) selectedId.value = null
      persistTodos()
    }
  }

  function deleteItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
    if (selectedId.value === id) selectedId.value = null
    persistTodos()
  }

  function clearDone() {
    const doneIds = new Set(items.value.filter((i) => i.done).map((i) => i.id))
    items.value = items.value.filter((i) => !i.done)
    if (selectedId.value && doneIds.has(selectedId.value)) selectedId.value = null
    persistTodos()
  }

  function selectItem(id: string) {
    selectedId.value = selectedId.value === id ? null : id
  }

  function toggleBold(id: string) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.bold = !item.bold
      persistTodos()
    }
  }

  function reorderItem(fromId: string, toId: string, position: 'before' | 'after') {
    const from = items.value.find((i) => i.id === fromId)
    const to = items.value.find((i) => i.id === toId)
    if (!from || !to || from.done !== to.done || fromId === toId) return

    const fromIndex = items.value.findIndex((i) => i.id === fromId)
    items.value.splice(fromIndex, 1)
    const toIndex = items.value.findIndex((i) => i.id === toId)
    const insertAt = position === 'before' ? toIndex : toIndex + 1
    items.value.splice(insertAt, 0, from)
    persistTodos()
  }

  function updateItemText(id: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.text = trimmed
      persistTodos()
    }
  }

  async function setAlwaysOnTop(flag: boolean) {
    config.value.alwaysOnTop = flag
    await invoke('set_always_on_top', { flag })
    persistConfig()
  }

  function setLocked(flag: boolean) {
    config.value.locked = flag
    persistConfig()
  }

  function setTheme(theme: 'dark' | 'light') {
    config.value.theme = theme
    persistConfig()
  }

  return {
    items,
    config,
    initialized,
    selectedId,
    dragSourceId,
    todoItems,
    doneItems,
    init,
    addTodo,
    toggleItem,
    deleteItem,
    clearDone,
    selectItem,
    toggleBold,
    reorderItem,
    updateItemText,
    setAlwaysOnTop,
    setLocked,
    setTheme,
  }
})
