<script setup lang="ts">
import { onMounted, nextTick, ref } from 'vue'
import { Star, Minus, Plus, Trash2, Download, RefreshCw } from 'lucide-vue-next'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { useInstallPrompt } from '@/composables/useInstallPrompt'

const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()
const install = useInstallPrompt()

async function handleInstall() {
  if (install.canPromptNatively.value) {
    await install.triggerNativeInstall()
  } else if (install.isIOS) {
    ui.installInstructionsOpen = true
  }
  ui.closeSettingsDropdown()
}

function handleApplyUpdate() {
  // applyUpdate posts SKIP_WAITING; the controllerchange listener in
  // main.ts then reloads the page. Closing the dropdown first avoids
  // a flash of the stale UI between activation and reload.
  ui.closeSettingsDropdown()
  ui.applyUpdate?.()
}

const dropdownRef = ref<HTMLElement | null>(null)
onMounted(() => {
  // Focus the dropdown container so Escape works immediately, before
  // the user has a chance to tab into a child button. tabindex="-1"
  // makes the div programmatically focusable without joining tab order.
  nextTick(() => dropdownRef.value?.focus())
})

const gitHash = __GIT_HASH__

const FS_LABELS: Record<string, string> = {
  default: 'Default',
  medium: 'Medium',
  large: 'Large',
}

function handleDecrease() {
  navigation.decreaseFontSize()
  ui.showToast(`Text: ${FS_LABELS[navigation.fontSize]}`)
}

function handleIncrease() {
  navigation.increaseFontSize()
  ui.showToast(`Text: ${FS_LABELS[navigation.fontSize]}`)
}

function handleReset() {
  const ok = window.confirm(
    'Reset all data?\n\nThis will clear your watched dancers, current dance position, font size, and any other saved settings. The schedule itself is not affected.'
  )
  if (!ok) return

  // Remove all keys with our app prefix
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('dt:')) keysToRemove.push(k)
  }
  for (const k of keysToRemove) localStorage.removeItem(k)

  // Reload so Pinia stores re-init from defaults
  window.location.reload()
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-30 bg-black/30" @click="ui.closeSettingsDropdown()"></div>

  <!-- Dropdown. role=menu makes the structure announce as a menu to
       assistive tech; Escape closes from anywhere inside. tabindex=-1
       gives the container a focus target so the keydown handler fires
       even before the user has tabbed into a child button. -->
  <div
    ref="dropdownRef"
    class="absolute right-2 z-40 w-56 bg-surface-raised border border-gray-700 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden focus:outline-none"
    style="top: calc(env(safe-area-inset-top, 0px) + 48px)"
    role="menu"
    tabindex="-1"
    @keydown.esc="ui.closeSettingsDropdown()"
  >
    <!-- Font size -->
    <div class="px-3 py-2.5 flex items-center justify-between">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        :class="navigation.canDecreaseFontSize
          ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
          : 'bg-surface text-gray-600 cursor-not-allowed'"
        :disabled="!navigation.canDecreaseFontSize"
        aria-label="Decrease font size"
        @click="handleDecrease"
      ><Minus :size="16" /></button>
      <span class="text-xs text-gray-400">Font Size</span>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        :class="navigation.canIncreaseFontSize
          ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
          : 'bg-surface text-gray-600 cursor-not-allowed'"
        :disabled="!navigation.canIncreaseFontSize"
        aria-label="Increase font size"
        @click="handleIncrease"
      ><Plus :size="16" /></button>
    </div>

    <div class="border-t border-gray-700"></div>

    <!-- Watch dancers -->
    <button
      class="w-full px-3 py-2.5 flex items-center gap-2.5 text-left active:bg-surface-overlay transition-colors"
      @click="ui.openWatchPanel()"
    >
      <Star :size="16" :class="watchStore.watchedDancers.length > 0 ? 'text-gold-400 fill-gold-400' : 'text-gray-400'" />
      <span class="text-sm text-gray-200">Watched Dancers</span>
      <span v-if="watchStore.watchedDancers.length > 0" class="text-xs text-gray-500 ml-auto">
        {{ watchStore.watchedDancers.length }}
      </span>
    </button>

    <div class="border-t border-gray-700"></div>

    <!-- Update available: shown when a new SW version has installed and
         is waiting. Tapping reloads with the new version. Hidden by
         default — the auto-reload behavior was previously unconditional
         and could interrupt a live competition. -->
    <button
      v-if="ui.updateAvailable"
      class="w-full px-3 py-2.5 flex items-center gap-2.5 text-left active:bg-indigo-500/20 transition-colors"
      @click="handleApplyUpdate"
    >
      <RefreshCw :size="16" class="text-indigo-300" />
      <span class="text-sm text-indigo-200">Update available</span>
    </button>

    <div v-if="ui.updateAvailable" class="border-t border-gray-700"></div>

    <!-- Install app: only rendered when installation is actually possible
         (not standalone, browser supports it). Re-triggers the install
         flow even after the banner was dismissed. -->
    <button
      v-if="install.canInstall.value"
      class="w-full px-3 py-2.5 flex items-center gap-2.5 text-left active:bg-surface-overlay transition-colors"
      @click="handleInstall"
    >
      <Download :size="16" class="text-indigo-300" />
      <span class="text-sm text-gray-200">Install app</span>
    </button>

    <div v-if="install.canInstall.value" class="border-t border-gray-700"></div>

    <!-- Reset data -->
    <button
      class="w-full px-3 py-2.5 flex items-center gap-2.5 text-left active:bg-red-500/20 transition-colors"
      @click="handleReset"
    >
      <Trash2 :size="16" class="text-red-400" />
      <span class="text-sm text-red-400">Reset all data</span>
    </button>

    <div class="border-t border-gray-700"></div>
    <div class="px-3 py-1.5 text-[10px] text-gray-600 text-right">{{ gitHash }}</div>
  </div>
</template>
