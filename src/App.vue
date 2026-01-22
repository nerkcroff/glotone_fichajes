<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEmployeeStore } from '@/stores/employee.store.ts'

const employeeStore = useEmployeeStore()

onMounted(() => {
  // Intentar cargar empleado guardado
  employeeStore.loadEmployee()
})
</script>

<style>
/* Los estilos globales están en tokens.css */
</style>
