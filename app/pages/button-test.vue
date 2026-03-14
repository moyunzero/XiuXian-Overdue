<template>
  <div class="Container">
    <div class="Card">
      <div class="CardInner">
        <h1 class="Title">Button Component Test</h1>
        <p class="Sub">Testing all variants and sizes</p>
        
        <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 24px;">
          <!-- Variants -->
          <section>
            <h2 style="font-size: 18px; margin-bottom: 12px;">Variants (Medium Size)</h2>
            <div class="Row">
              <Button variant="primary" @click="handleClick('Primary')">Primary</Button>
              <Button variant="secondary" @click="handleClick('Secondary')">Secondary</Button>
              <Button variant="danger" @click="handleClick('Danger')">Danger</Button>
              <Button variant="ghost" @click="handleClick('Ghost')">Ghost</Button>
            </div>
          </section>

          <!-- Sizes -->
          <section>
            <h2 style="font-size: 18px; margin-bottom: 12px;">Sizes (Primary Variant)</h2>
            <div class="Row" style="align-items: flex-start;">
              <Button variant="primary" size="sm" @click="handleClick('Small')">Small (32px)</Button>
              <Button variant="primary" size="md" @click="handleClick('Medium')">Medium (40px)</Button>
              <Button variant="primary" size="lg" @click="handleClick('Large')">Large (48px)</Button>
            </div>
          </section>

          <!-- States -->
          <section>
            <h2 style="font-size: 18px; margin-bottom: 12px;">States</h2>
            <div class="Row">
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="primary" :loading="isLoading" @click="toggleLoading">
                {{ isLoading ? 'Loading...' : 'Click to Load' }}
              </Button>
            </div>
          </section>

          <!-- With Icons -->
          <section>
            <h2 style="font-size: 18px; margin-bottom: 12px;">With Icons</h2>
            <div class="Row">
              <Button variant="primary" icon="⚡" @click="handleClick('Icon')">修炼</Button>
              <Button variant="secondary" icon="💰" @click="handleClick('Icon')">打工</Button>
              <Button variant="danger" icon="🔥" @click="handleClick('Icon')">借贷</Button>
            </div>
          </section>

          <!-- Full Width -->
          <section>
            <h2 style="font-size: 18px; margin-bottom: 12px;">Full Width</h2>
            <Button variant="primary" fullWidth @click="handleClick('Full Width')">
              Full Width Button
            </Button>
          </section>

          <!-- Click Log -->
          <section v-if="clickLog.length > 0">
            <h2 style="font-size: 18px; margin-bottom: 12px;">Click Log</h2>
            <div style="padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: rgba(0,0,0,0.25);">
              <div v-for="(log, index) in clickLog" :key="index" style="font-size: 12px; color: var(--muted); margin-bottom: 4px;">
                {{ log }}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '~/components/ui/Button.vue'

const isLoading = ref(false)
const clickLog = ref<string[]>([])

const handleClick = (buttonName: string) => {
  const timestamp = new Date().toLocaleTimeString()
  clickLog.value.unshift(`[${timestamp}] ${buttonName} button clicked`)
  if (clickLog.value.length > 10) {
    clickLog.value.pop()
  }
}

const toggleLoading = () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    handleClick('Loading')
  }, 2000)
}
</script>
