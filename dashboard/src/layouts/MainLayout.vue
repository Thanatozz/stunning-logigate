<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const mobileSidebarOpen = ref(false)

function closeSidebar() {
  mobileSidebarOpen.value = false
}
</script>

<template>
  <div class="flex min-h-screen">
    <div class="hidden lg:block">
      <AppSidebar />
    </div>

    <transition name="fade">
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
        @click="closeSidebar"
      />
    </transition>

    <transition name="slide">
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-y-0 left-0 z-50 lg:hidden"
      >
        <AppSidebar @navigate="closeSidebar" />
      </div>
    </transition>

    <div class="flex min-h-screen flex-1 flex-col">
      <AppHeader @menu="mobileSidebarOpen = !mobileSidebarOpen" />
      <main class="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
