<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean
    hint?: string
  }>(),
  {
    hint: '短痛：换一点现金，完整度再跌一截。'
  }
)

const emit = defineEmits<{
  activate: []
}>()
</script>

<template>
  <div class="BloodDrawGritLink">
    <button
      type="button"
      class="BloodDrawGritLink__btn"
      :disabled="disabled"
      @click="emit('activate')"
    >
      抽血换现
    </button>
    <p class="BloodDrawGritLink__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.BloodDrawGritLink {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.BloodDrawGritLink__btn {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

.BloodDrawGritLink__btn:hover:not(:disabled) {
  color: var(--danger);
}

.BloodDrawGritLink__btn:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.BloodDrawGritLink__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.BloodDrawGritLink__hint {
  margin: 4px 0 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
