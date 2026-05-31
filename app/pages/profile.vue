<script setup lang="ts">
import { navigateTo } from '#app'
import { usePlayStorage } from '~/composables/usePlayStorage'

/** 旧版 `/game` 制度档案页；当前档案在 `/play` 内 RunArchiveView / 结案屏展示。 */
const playStorage = usePlayStorage()
const target = playStorage.getActiveRun() ? '/play' : '/'
await navigateTo(target, { replace: true })
</script>

<template>
  <div class="LegacyRouteRedirect" aria-busy="true">
    <p>正在返回修行界面…</p>
  </div>
</template>

<style scoped>
.LegacyRouteRedirect {
  flex: 1;
  width: 100%;
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
