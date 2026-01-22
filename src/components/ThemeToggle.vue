<template>
  <button class="theme-toggle" @click="toggleTheme" :title="toggleTitle">
    <span class="theme-icon">{{ themeIcon }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme.store.ts'

const themeStore = useThemeStore()

const themeIcon = computed(() => {
  return themeStore.currentTheme === 'light' ? '☀️' : '🌙'
})

const toggleTitle = computed(() => {
  return themeStore.currentTheme === 'light'
    ? 'Cambiar a modo oscuro'
    : 'Cambiar a modo claro'
})

function toggleTheme() {
  themeStore.toggleTheme()
}
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 1000;
}

.theme-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-icon {
  font-size: 1.5rem;
}
</style>
