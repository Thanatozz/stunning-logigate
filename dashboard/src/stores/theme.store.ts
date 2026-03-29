import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'logigate_theme'

function getPreferredTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.setAttribute('data-theme', mode)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light')
  const initialized = ref(false)

  const isDark = computed(() => mode.value === 'dark')
  const label = computed(() => (isDark.value ? 'Modo oscuro' : 'Modo claro'))

  function initialize() {
    mode.value = getPreferredTheme()
    applyTheme(mode.value)
    initialized.value = true
  }

  function setMode(nextMode: ThemeMode) {
    mode.value = nextMode
    localStorage.setItem(STORAGE_KEY, nextMode)
    applyTheme(nextMode)
  }

  function toggleMode() {
    setMode(mode.value === 'dark' ? 'light' : 'dark')
  }

  return {
    mode,
    initialized,
    isDark,
    label,
    initialize,
    setMode,
    toggleMode,
  }
})
