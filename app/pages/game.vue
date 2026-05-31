<script setup lang="ts">
import { navigateTo } from '#app'
import { usePlayStorage } from '~/composables/usePlayStorage'

/** 旧版 /game 主循环已下线；保留路由以免书签失效。3D 等组件仍在 `app/components/game/` 供后续接入。 */
const playStorage = usePlayStorage()
const target = playStorage.getActiveRun() ? '/play' : '/'
await navigateTo(target, { replace: true })
</script>

<template>
  <div class="LegacyRouteRedirect" aria-busy="true">
    <p>正在进入修行界面…</p>
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
