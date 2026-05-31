<script setup lang="ts">
import { computed } from 'vue'
import type { Act1PermanentModifiers, Act1State } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import { buildRunArchive } from '~/logic/play/buildRunArchive'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import RunArchiveView from '~/components/play/RunArchiveView.vue'

const props = defineProps<{
  startConfig: StartConfig
  act1: Act1State
  debtTotal: number
  metaUnlocks: string[]
  permanentModifiers: Act1PermanentModifiers
  runId?: string
  runMode?: 'endless'
}>()

defineEmits<{
  finish: []
}>()

const archive = computed(() => {
  const stub = createPlayRunFromStartConfig(props.startConfig, 'slot1')
  return buildRunArchive({
    run: {
      ...stub,
      runId: props.runId ?? stub.runId,
      runMode: props.runMode ?? stub.runMode
    },
    act1: props.act1,
    startConfig: props.startConfig,
    metaUnlocks: props.metaUnlocks,
    permanentModifiers: props.permanentModifiers
  })
})
</script>

<template>
  <RunArchiveView :archive="archive" confirm-label="确认并进入昆墟高中" @confirm="$emit('finish')" />
</template>
