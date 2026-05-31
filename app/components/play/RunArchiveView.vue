<script setup lang="ts">
import type { RunArchive } from '~/types/play'
import { formatRunModeForArchive } from '~/logic/play/archiveDisplay'

defineProps<{
  archive: RunArchive
  confirmLabel?: string
}>()

defineEmits<{
  confirm: []
}>()
</script>

<template>
  <article class="RunArchiveView">
    <header class="RunArchiveView__head">
      <span class="RunArchiveView__tag">制度档案 · {{ formatRunModeForArchive(archive.runMode) }}</span>
      <h2 class="RunArchiveView__title">终章摘要</h2>
      <p class="RunArchiveView__verdict">{{ archive.oneLineVerdict }}</p>
    </header>

    <section class="RunArchiveView__block" aria-labelledby="debt-summary-title">
      <h3 id="debt-summary-title" class="RunArchiveView__block-title">欠了什么</h3>
      <ul class="RunArchiveView__list">
        <li v-for="(line, i) in archive.debtOwedSummary" :key="i">{{ line }}</li>
      </ul>
    </section>

    <section v-if="archive.topTags.length" class="RunArchiveView__block">
      <h3 class="RunArchiveView__block-title">档案标签</h3>
      <p class="RunArchiveView__tags">{{ archive.topTags.join(' · ') }}</p>
    </section>

    <section v-if="archive.bodyLiens.length" class="RunArchiveView__block">
      <h3 class="RunArchiveView__block-title">身体留置</h3>
      <ul class="RunArchiveView__list RunArchiveView__list--mono">
        <li v-for="lien in archive.bodyLiens" :key="lien">{{ lien }}</li>
      </ul>
    </section>

    <section v-if="archive.epilogue.length" class="RunArchiveView__block RunArchiveView__epilogue">
      <h3 class="RunArchiveView__block-title">过场</h3>
      <p v-for="(line, i) in archive.epilogue" :key="i" class="RunArchiveView__epilogue-line">
        {{ line }}
      </p>
    </section>

    <p v-if="archive.nextStageTeaser" class="RunArchiveView__teaser">{{ archive.nextStageTeaser }}</p>

    <details v-if="archive.fullReportLines?.length" class="RunArchiveView__details">
      <summary>完整制度档案</summary>
      <pre class="RunArchiveView__report">{{ archive.fullReportLines.join('\n') }}</pre>
    </details>

    <button type="button" class="RunArchiveView__btn" @click="$emit('confirm')">
      {{ confirmLabel ?? '确认并继续' }}
    </button>
  </article>
</template>

<style scoped>
.RunArchiveView {
  max-width: min(720px, 100%);
  margin: 0 auto;
}
.RunArchiveView__head {
  margin-bottom: 20px;
}
.RunArchiveView__tag {
  display: block;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  color: var(--neon-cyan);
  margin-bottom: 8px;
}
.RunArchiveView__title {
  margin: 0 0 10px;
  font-size: var(--text-lg);
  color: var(--text-primary);
}
.RunArchiveView__verdict {
  margin: 0;
  font-size: var(--text-base);
  line-height: 1.55;
  color: var(--text-secondary);
}
.RunArchiveView__block {
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
}
.RunArchiveView__block-title {
  margin: 0 0 10px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  color: var(--neon-amber, #ffb020);
  text-transform: uppercase;
}
.RunArchiveView__list {
  margin: 0;
  padding-left: 1.2em;
  line-height: 1.65;
  color: var(--text-primary);
}
.RunArchiveView__list--mono {
  font-family: var(--mono);
  font-size: var(--text-sm);
}
.RunArchiveView__tags {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.RunArchiveView__epilogue-line {
  margin: 0 0 8px;
  line-height: 1.65;
  color: var(--text-primary);
}
.RunArchiveView__epilogue-line:last-child {
  margin-bottom: 0;
}
.RunArchiveView__teaser {
  margin: 0 0 18px;
  padding: 10px 14px;
  border-left: 3px solid var(--neon-cyan);
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--neon-cyan);
}
.RunArchiveView__details {
  margin-bottom: 18px;
}
.RunArchiveView__details summary {
  cursor: pointer;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.RunArchiveView__report {
  margin: 0;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  font-family: var(--mono);
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--text-primary);
  white-space: pre-wrap;
  max-height: min(420px, 50vh);
  overflow: auto;
}
.RunArchiveView__btn {
  padding: 10px 18px;
  border: 1px solid var(--neon-cyan);
  background: rgba(0, 255, 255, 0.1);
  color: var(--neon-cyan);
  font-family: var(--mono);
  cursor: pointer;
  border-radius: 4px;
}
.RunArchiveView__btn:hover {
  box-shadow: var(--glow-cyan);
}
</style>
