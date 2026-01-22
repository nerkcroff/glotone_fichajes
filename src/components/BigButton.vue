<template>
  <button
    class="big-button"
    :class="{
      'big-button-primary': variant === 'primary',
      'big-button-secondary': variant === 'secondary',
      'big-button-danger': variant === 'danger'
    }"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.big-button {
  width: 100%;
  padding: 1.5rem 2rem;
  font-size: 1.25rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.big-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.big-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.big-button:not(:disabled):active {
  transform: translateY(0);
}

.big-button-primary {
  background: var(--primary);
  color: white;
}

.big-button-primary:not(:disabled):hover {
  background: var(--primary-hover);
}

.big-button-secondary {
  background: var(--surface);
  color: var(--text);
}

.big-button-secondary:not(:disabled):hover {
  background: var(--surface-hover);
}

.big-button-danger {
  background: var(--danger);
  color: white;
}

.big-button-danger:not(:disabled):hover {
  background: var(--danger-hover);
}
</style>
