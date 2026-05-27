<script setup lang="ts">
import { onMounted } from 'vue'
import DesktopShell from '~/components/act1/DesktopShell.vue'
import { useAct1Session } from '~/composables/useAct1Session'

const {
  ready,
  startConfig,
  act1,
  openWindows,
  activeWindow,
  mobileTab,
  showLoanPopup,
  modifiers,
  todos,
  debtTotal,
  creditors,
  act1Notifications,
  priorMetaUnlocks,
  metaUnlocks,
  permanentModifiers,
  allModulesDone,
  settled,
  WINDOW_LABELS,
  initSession,
  openWindow,
  closeWindow,
  focusWindow,
  focusTodo,
  isModuleUnlocked,
  submitInterview,
  dismissLoanAd,
  acknowledgeLoanPopup,
  markLoanCompared,
  trackLoanCompare,
  signLoan,
  spendFamily,
  handleCollectionChoice,
  finishSettlement
} = useAct1Session()

onMounted(() => {
  initSession()
})
</script>

<template>
  <div v-if="ready && startConfig && act1 && modifiers" class="Act1Page">
    <DesktopShell
      :start-config="startConfig"
      :act1="act1"
      :open-windows="openWindows"
      :active-window="activeWindow"
      :mobile-tab="mobileTab"
      :window-labels="WINDOW_LABELS"
      :todos="todos"
      :debt-total="debtTotal"
      :creditors="creditors"
      :act1-notifications="act1Notifications"
      :meta-unlocks="metaUnlocks"
      :permanent-modifiers="permanentModifiers"
      :all-modules-done="allModulesDone"
      :settled="settled"
      :show-loan-popup="showLoanPopup"
      :modifiers="modifiers"
      :prior-meta-unlocks="priorMetaUnlocks"
      :is-module-unlocked="isModuleUnlocked"
      @open-window="openWindow"
      @close-window="closeWindow"
      @focus-window="focusWindow"
      @focus-todo="focusTodo"
      @submit-interview="submitInterview"
      @dismiss-loan-ad="dismissLoanAd"
      @acknowledge-loan-popup="acknowledgeLoanPopup"
      @compare-loan="markLoanCompared"
      @compare-loan-tick="trackLoanCompare"
      @sign-loan="signLoan"
      @spend-family="spendFamily"
      @collection-choice="handleCollectionChoice"
      @finish-settlement="finishSettlement"
    />
  </div>
  <div v-else class="Act1Page Act1Page--loading">
    <p>正在载入入学前夜…</p>
  </div>
</template>

<style scoped>
.Act1Page {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  background: #000;
  overflow-x: hidden;
}
.Act1Page--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-family: var(--mono);
}
</style>
