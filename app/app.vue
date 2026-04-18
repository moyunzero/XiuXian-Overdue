<template>
  <div class="AppShell">
    <ClientOnly>
      <div v-if="storageError" class="AppBanner AppBanner--error" role="alert">
        <span>{{ storageError }}</span>
        <button type="button" class="AppBanner__dismiss" @click="clearStorageError">关闭</button>
      </div>
      <div v-if="storageCorrupt" class="AppBanner AppBanner--warn" role="alert">
        <span>{{ storageCorrupt }}</span>
        <button type="button" class="AppBanner__dismiss" @click="clearStorageCorrupt">知道了</button>
      </div>
    </ClientOnly>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useGameStorage } from '~/composables/useGameStorage'

const { storageError, storageCorrupt, clearStorageError, clearStorageCorrupt } = useGameStorage()
</script>

<style scoped>
.AppBanner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  font-size: var(--font-meta, 12px);
  line-height: 1.45;
}

.AppBanner--error {
  background: rgba(255, 59, 59, 0.12);
  border-color: rgba(255, 59, 59, 0.35);
}

.AppBanner--warn {
  background: rgba(255, 210, 74, 0.1);
}

.AppBanner__dismiss {
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text, #e8ecf6);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: var(--font-meta, 12px);
}
</style>


