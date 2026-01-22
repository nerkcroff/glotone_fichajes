import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<Theme>(
    (localStorage.getItem('theme') as Theme) || 'light'
  )

  function setTheme(theme: Theme) {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'light' ? 'dark' : 'light')
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme.value)
  }

  // Aplicar tema al cargar
  applyTheme()

  // Watch para aplicar cambios
  watch(currentTheme, applyTheme)

  return {
    currentTheme,
    setTheme,
    toggleTheme
  }
})
