<script setup lang="ts">
import { Download, X } from 'lucide-vue-next'
import { useInstallPrompt } from '@/composables/useInstallPrompt'
import { useUiStore } from '@/stores/ui'

const {
  shouldShowBanner,
  canPromptNatively,
  isIOS,
  triggerNativeInstall,
  dismissBanner,
} = useInstallPrompt()
const ui = useUiStore()

async function handleInstall() {
  if (canPromptNatively.value) {
    const outcome = await triggerNativeInstall()
    void outcome
  } else if (isIOS) {
    ui.installInstructionsOpen = true
  }
}
</script>

<template>
  <div
    v-if="shouldShowBanner"
    class="mx-2 mt-2 px-3 py-2.5 rounded-lg border border-indigo-400/40 bg-indigo-500/15 flex items-center gap-2.5"
  >
    <Download :size="18" class="text-indigo-300 shrink-0" />
    <div class="flex-1 min-w-0">
      <div class="text-sm font-semibold text-indigo-200">Install Dance Tracker</div>
      <div class="text-xs text-indigo-300/70 mt-0.5">
        {{ isIOS ? 'Add to your Home Screen for one-tap access' : 'Quick access from your home screen' }}
      </div>
    </div>
    <button
      class="text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-500 active:bg-indigo-600 text-white shrink-0 transition-colors"
      @click="handleInstall"
    >
      {{ isIOS ? 'How' : 'Install' }}
    </button>
    <button
      class="p-1 rounded text-indigo-300/70 hover:text-indigo-200 active:bg-indigo-500/20 shrink-0"
      aria-label="Dismiss install banner"
      @click="dismissBanner"
    >
      <X :size="16" />
    </button>
  </div>
</template>
