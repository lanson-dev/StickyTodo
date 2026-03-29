import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

interface Config {
  x?: number
  y?: number
  width: number
  height: number
  alwaysOnTop: boolean
  locked: boolean
}

const DEFAULT_CONFIG: Config = {
  width: 360,
  height: 600,
  alwaysOnTop: false,
  locked: false,
}

function getUserDataPath() {
  return app.getPath('userData')
}

function getTodosPath() {
  return join(getUserDataPath(), 'todos.json')
}

function getConfigPath() {
  return join(getUserDataPath(), 'config.json')
}

function readConfig(): Config {
  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) return { ...DEFAULT_CONFIG }
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      width: typeof parsed.width === 'number' ? parsed.width : DEFAULT_CONFIG.width,
      height: typeof parsed.height === 'number' ? parsed.height : DEFAULT_CONFIG.height,
      alwaysOnTop:
        typeof parsed.alwaysOnTop === 'boolean'
          ? parsed.alwaysOnTop
          : DEFAULT_CONFIG.alwaysOnTop,
      locked: typeof parsed.locked === 'boolean' ? parsed.locked : DEFAULT_CONFIG.locked,
      x: typeof parsed.x === 'number' ? parsed.x : undefined,
      y: typeof parsed.y === 'number' ? parsed.y : undefined,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function writeConfig(data: string) {
  try {
    const dir = getUserDataPath()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(getConfigPath(), data, 'utf-8')
  } catch (err) {
    console.error('[main] Failed to write config:', err)
  }
}

function writeTodos(data: string) {
  try {
    const dir = getUserDataPath()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(getTodosPath(), data, 'utf-8')
  } catch (err) {
    console.error('[main] Failed to write todos:', err)
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const config = readConfig()

  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    x: config.x,
    y: config.y,
    minWidth: 280,
    minHeight: 400,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: false,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Persist window bounds on move/resize
  let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleSaveBounds() {
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
    saveBoundsTimer = setTimeout(() => {
      if (!mainWindow) return
      const bounds = mainWindow.getBounds()
      const current = readConfig()
      writeConfig(
        JSON.stringify({
          ...current,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }),
      )
    }, 300)
  }

  mainWindow.on('moved', scheduleSaveBounds)
  mainWindow.on('resized', scheduleSaveBounds)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers

ipcMain.handle('load-todos', () => {
  try {
    const todosPath = getTodosPath()
    if (!existsSync(todosPath)) return '[]'
    return readFileSync(todosPath, 'utf-8')
  } catch {
    return '[]'
  }
})

ipcMain.handle('save-todos', (_event, data: string) => {
  writeTodos(data)
})

ipcMain.handle('load-config', () => {
  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) return JSON.stringify(DEFAULT_CONFIG)
    return readFileSync(configPath, 'utf-8')
  } catch {
    return JSON.stringify(DEFAULT_CONFIG)
  }
})

ipcMain.handle('save-config', (_event, data: string) => {
  writeConfig(data)
})

ipcMain.handle('set-always-on-top', (_event, flag: boolean) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(flag)
})

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close()
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
