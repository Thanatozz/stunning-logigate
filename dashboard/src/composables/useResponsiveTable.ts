import { computed, onMounted, onUnmounted, ref } from 'vue'

const MOBILE_BREAKPOINT = 768

export function useResponsiveTable() {
  const width = ref(window.innerWidth)

  const onResize = () => {
    width.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })

  const isMobileTable = computed(() => width.value < MOBILE_BREAKPOINT)

  return {
    width,
    isMobileTable,
  }
}
