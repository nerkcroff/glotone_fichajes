<template>
  <div class="pinpad">
    <div class="pinpad-display">
      <div class="pinpad-dots">
        <span
          v-for="i in 4"
          :key="i"
          class="pinpad-dot"
          :class="{ filled: i <= pin.length }"
        ></span>
      </div>
    </div>

    <div class="pinpad-grid">
      <button
        v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
        :key="num"
        class="pinpad-button"
        @click="addDigit(num.toString())"
      >
        {{ num }}
      </button>
      <button class="pinpad-button" @click="clear">C</button>
      <button class="pinpad-button" @click="addDigit('0')">0</button>
      <button class="pinpad-button pinpad-button-enter" @click="submit">
        ✓
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  submit: [pin: string]
}>()

const pin = ref('')

function addDigit(digit: string) {
  if (pin.value.length < 4) {
    pin.value += digit
  }
}

function clear() {
  pin.value = ''
}

function submit() {
  if (pin.value.length === 4) {
    emit('submit', pin.value)
    pin.value = ''
  }
}
</script>

<style scoped>
.pinpad {
  width: 100%;
  max-width: 320px;
}

.pinpad-display {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.pinpad-dots {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.pinpad-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--text);
  background: transparent;
  transition: all 0.2s;
}

.pinpad-dot.filled {
  background: var(--primary);
  border-color: var(--primary);
}

.pinpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.pinpad-button {
  aspect-ratio: 1;
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pinpad-button:hover {
  background: var(--surface-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.pinpad-button:active {
  transform: translateY(0);
}

.pinpad-button-enter {
  background: var(--primary);
  color: white;
}

.pinpad-button-enter:hover {
  background: var(--primary-hover);
}
</style>
