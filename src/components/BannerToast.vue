<template>
  <Transition name="slide-down">
    <div v-if="visible" class="banner-toast" :class="`banner-toast-${type}`">
      <div class="banner-toast-content">
        <span class="banner-toast-icon">{{ icon }}</span>
        <p class="banner-toast-message">{{ message }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    message: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
    show?: boolean
  }>(),
  {
    type: 'info',
    duration: 3000,
    show: false
  }
)

const visible = ref(props.show)

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'warning':
      return '⚠'
    default:
      return 'ℹ'
  }
})

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal
    if (newVal && props.duration > 0) {
      setTimeout(() => {
        visible.value = false
      }, props.duration)
    }
  }
)
</script>

<style scoped>
.banner-toast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.banner-toast-content {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.banner-toast-icon {
  font-size: 1.5rem;
  font-weight: bold;
}

.banner-toast-message {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

.banner-toast-success {
  background: #10b981;
  color: white;
}

.banner-toast-error {
  background: #ef4444;
  color: white;
}

.banner-toast-warning {
  background: #f59e0b;
  color: white;
}

.banner-toast-info {
  background: var(--primary);
  color: white;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
