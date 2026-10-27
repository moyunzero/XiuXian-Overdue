<script setup lang="ts">
import { ref } from 'vue'

export interface StartBundleOption {
  id: string
  label: string
  description: string
}

const props = defineProps<{
  bundles: StartBundleOption[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const expanded = ref(false)

function selectBundle(id: string) {
  emit('update:modelValue', id)
}

function toggleExpanded() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div v-if="bundles.length > 0" class="StartBundleRow AgGlassSubcard">
    <button
      type="button"
      class="StartBundleRow__toggle"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <span>携带条款包</span>
      <span class="StartBundleRow__chevron" :class="{ 'StartBundleRow__chevron--open': expanded }">
        ▾
      </span>
    </button>

    <fieldset
      v-show="expanded"
      class="StartBundleRow__fieldset"
      role="radiogroup"
      aria-label="开局条款包"
    >
      <button
        type="button"
        class="StartBundleRow__option"
        :class="{ 'StartBundleRow__option--on': modelValue === 'standard' }"
        role="radio"
        :aria-checked="modelValue === 'standard'"
        @click="selectBundle('standard')"
      >
        <span class="StartBundleRow__optionLabel">标准灵贷（无附加）</span>
      </button>

      <button
        v-for="bundle in bundles"
        :key="bundle.id"
        type="button"
        class="StartBundleRow__option"
        :class="{ 'StartBundleRow__option--on': modelValue === bundle.id }"
        role="radio"
        :aria-checked="modelValue === bundle.id"
        @click="selectBundle(bundle.id)"
      >
        <span class="StartBundleRow__optionLabel">{{ bundle.label }}</span>
        <span class="StartBundleRow__optionDesc">{{ bundle.description }}</span>
      </button>
    </fieldset>
  </div>
</template>

<style scoped>
.StartBundleRow {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--ag-glass-border);
  border-radius: 10px;
  box-sizing: border-box;
}

.StartBundleRow__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--mono);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.StartBundleRow__toggle:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.StartBundleRow__chevron {
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.StartBundleRow__chevron--open {
  transform: rotate(180deg);
}

.StartBundleRow__fieldset {
  margin: 10px 0 0;
  padding: 0;
  border: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.StartBundleRow__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.28);
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.StartBundleRow__option--on {
  border-color: rgba(0, 255, 255, 0.45);
  box-shadow: inset 0 0 0 1px rgba(0, 255, 255, 0.25);
}

.StartBundleRow__option:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.StartBundleRow__optionLabel {
  font-family: var(--mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.StartBundleRow__optionDesc {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
