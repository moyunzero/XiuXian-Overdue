<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo } from '#app'

onMounted(async () => {
  await navigateTo('/play', { replace: true })
})
</script>

<template>
  <div class="Act1Redirect">
    <p>正在进入灵信桌面…</p>
  </div>
</template>

<style scoped>
.Act1Redirect {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-family: var(--mono);
}
</style>
