import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

export type ItemStatus = 'todo' | 'doing' | 'review'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  bold: boolean
  status: ItemStatus
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
  bgOpacity: number       // 0–100, unlocked background opacity
  lockedBgOpacity: number // 0–100, locked background opacity
  textOpacity: number     // 0–100, text opacity
  shadowOpacity: number   // 0–100, text shadow opacity
}

const DEFAULT_CONFIG: AppConfig = {
  width: 360,
  height: 600,
  alwaysOnTop: false,
  locked: false,
  theme: 'dark',
  bgOpacity: 58,
  lockedBgOpacity: 32,
  textOpacity: 85,
  shadowOpacity: 35,
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

  const todoItems = computed(() => {
    const todos = items.value.filter((i) => !i.done)
    // Sort: doing first, then todo, then review
    const order: Record<ItemStatus, number> = { doing: 0, todo: 1, review: 2 }
    return [...todos].sort((a, b) => order[a.status] - order[b.status])
  })
  const doneItems = computed(() =>
    items.value
      .filter((i) => i.done)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
  )

  // Count of items completed today only (for badge)
  const todayDoneCount = computed(() => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return items.value.filter((i) => i.done && (i.completedAt ?? 0) >= startOfDay).length
  })

  async function init() {
    if (initialized.value) return
    try {
      const todosJson = await invoke<string>('load_todos')
      const parsed = JSON.parse(todosJson) as Partial<TodoItem>[]
      items.value = parsed.map((i: any) => ({
        id: i.id ?? genId(),
        text: i.text ?? '',
        done: i.done ?? false,
        bold: i.bold ?? false,
        status: (['todo','doing','review'].includes(i.status) ? i.status : 'todo') as ItemStatus,
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
        locked: false,  // Always start unlocked
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        bgOpacity: parsed.bgOpacity ?? DEFAULT_CONFIG.bgOpacity,
        lockedBgOpacity: parsed.lockedBgOpacity ?? DEFAULT_CONFIG.lockedBgOpacity,
        textOpacity: parsed.textOpacity ?? DEFAULT_CONFIG.textOpacity,
        shadowOpacity: parsed.shadowOpacity ?? DEFAULT_CONFIG.shadowOpacity,
        x: parsed.x,
        y: parsed.y,
      }
    } catch {
      config.value = { ...DEFAULT_CONFIG }
    }
    // Apply alwaysOnTop to the window if saved config has it enabled
    if (config.value.alwaysOnTop) {
      invoke('set_always_on_top', { flag: true }).catch(() => {})
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
    // Find the last todo item's position, insert after it (before any done items)
    const lastTodoIdx = findLastTodoIndex()
    const newItem: TodoItem = {
      id: genId(),
      text: trimmed,
      done: false,
      bold: false,
      status: 'todo',
      createdAt: Date.now(),
    }
    items.value.splice(lastTodoIdx + 1, 0, newItem)
    persistTodos()
  }

  /** Returns the index of the last non-done item, or -1 if none */
  function findLastTodoIndex(): number {
    for (let i = items.value.length - 1; i >= 0; i--) {
      if (!items.value[i]!.done) return i
    }
    return -1
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

  function unDoneItem(id: string) {
    const item = items.value.find((i) => i.id === id)
    if (item && item.done) {
      item.done = false
      item.completedAt = undefined
      persistTodos()
    }
  }

  function insertAfter(afterId: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const idx = items.value.findIndex((i) => i.id === afterId)
    if (idx === -1) return
    const newItem: TodoItem = {
      id: genId(),
      text: trimmed,
      done: false,
      bold: false,
      status: 'todo',
      createdAt: Date.now(),
    }
    items.value.splice(idx + 1, 0, newItem)
    persistTodos()
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
    if (fromId === toId) return
    const arr = [...items.value]
    const fromIndex = arr.findIndex((i) => i.id === fromId)
    const toIndex = arr.findIndex((i) => i.id === toId)
    if (fromIndex === -1 || toIndex === -1) return
    if (arr[fromIndex]!.done !== arr[toIndex]!.done) return

    // Remove dragged item
    const [moved] = arr.splice(fromIndex, 1)!
    if (!moved) return
    // Find target again after removal
    const newToIndex = arr.findIndex((i) => i.id === toId)
    const insertAt = position === 'before' ? newToIndex : newToIndex + 1
    arr.splice(insertAt, 0, moved)
    // Replace the entire array to guarantee reactivity
    items.value = arr
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

  async function setLocked(flag: boolean) {
    config.value.locked = flag
    try { await invoke('set_ignore_cursor_events', { ignore: flag }) } catch {}
    try { await invoke('set_resizable', { resizable: !flag }) } catch {}
    persistConfig()
  }

  function setItemStatus(id: string, status: ItemStatus) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.status = status
      // doing items are always bold, review items never bold
      if (status === 'doing') item.bold = true
      else item.bold = false
      persistTodos()
    }
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
    todayDoneCount,
    init,
    addTodo,
    toggleItem,
    unDoneItem,
    insertAfter,
    deleteItem,
    clearDone,
    selectItem,
    toggleBold,
    reorderItem,
    updateItemText,
    setItemStatus,
    setAlwaysOnTop,
    setLocked,
    setTheme,
  }
})
