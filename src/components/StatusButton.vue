<script setup lang="ts">
import { ref } from 'vue';

const isConnected = ref(false);

function updateConnectionStatus(status: boolean) {
  isConnected.value = status;
}
// Expose the function so it can be called from outside
defineExpose({ updateConnectionStatus });
</script>

<template>
  <button :style="{ backgroundColor: isConnected ? 'green' : 'red' }">
    {{ isConnected ? 'Connected' : 'Disconnected' }}
  </button>
</template>

<style scoped>
button {
  padding: 10px;
  color: white;
  border: none;
  cursor: pointer;
}
</style>