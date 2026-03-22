<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getGrowthColor, getGrowthIcon, getGrowthLabel } from '@/utils/growth'

const props = defineProps<{
  stage: string
  theme: 'farm' | 'tree'
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
}>()

const size = computed(() => props.size || 'medium')
const isAnimated = computed(() => props.animated ?? false)
const stageColor = computed(() => getGrowthColor(props.stage, props.theme))

const isAnimating = ref(false)
const animationType = ref<'none' | 'up' | 'down' | 'celebrate'>('none')

watch(
  () => props.stage,
  (newStage, oldStage) => {
    if (newStage !== oldStage) {
      triggerCelebrate()
    }
  }
)

function resetAnimation(delay: number) {
  setTimeout(() => {
    isAnimating.value = false
    animationType.value = 'none'
  }, delay)
}

function triggerCelebrate() {
  if (!isAnimated.value) return
  animationType.value = 'celebrate'
  isAnimating.value = true
  resetAnimation(1000)
}

defineExpose({
  triggerCelebrate,
  triggerFertilize: (isPositive: boolean) => {
    if (!isAnimated.value) return
    animationType.value = isPositive ? 'up' : 'down'
    isAnimating.value = true
    resetAnimation(800)
  }
})

const currentStage = computed(() => ({
  emoji: getGrowthIcon(props.stage, props.theme),
  label: getGrowthLabel(props.stage, props.theme)
}))

const themeKicker = computed(() => (props.theme === 'farm' ? '园地阶段' : '树木阶段'))

const sizeClass = computed(() => `size-${size.value}`)
</script>

<template>
  <div
    :class="['growth-visual', theme, sizeClass, { animated: isAnimated }]"
    :style="{ '--stage-color': stageColor }"
  >
    <div class="growth-halo"></div>
    <div class="growth-plaque">
      <div :class="['growth-icon', animationType, { animating: isAnimating }]">
        {{ currentStage.emoji }}
      </div>
    </div>
    <div class="growth-meta">
      <div class="growth-kicker">{{ themeKicker }}</div>
      <div class="growth-label">{{ currentStage.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.growth-visual {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.growth-halo {
  position: absolute;
  inset: 10px auto auto;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--stage-color) 26%, white) 0%, transparent 70%);
  filter: blur(10px);
  opacity: 0.95;
}

.growth-plaque {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 70px;
  min-height: 70px;
  padding: 10px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(250, 247, 242, 0.92));
  border: 1px solid color-mix(in srgb, var(--stage-color) 18%, rgba(229, 221, 208, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 10px 26px rgba(61, 122, 82, 0.12);
}

.growth-icon {
  font-size: 32px;
  line-height: 1;
  transition: transform 0.3s ease, filter 0.3s ease;
  filter: drop-shadow(0 8px 14px color-mix(in srgb, var(--stage-color) 24%, transparent));
}

.growth-meta {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.growth-kicker {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--stage-color) 16%, white);
  font-family: var(--font-accent);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.05em;
  color: var(--forest-700);
}

.growth-label {
  padding: 5px 11px;
  border-radius: var(--radius-full);
  border: 1px solid color-mix(in srgb, var(--stage-color) 16%, rgba(229, 221, 208, 0.8));
  background: rgba(255, 255, 255, 0.84);
  font-family: var(--font-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--forest-700);
}

.size-small .growth-plaque {
  min-width: 56px;
  min-height: 56px;
  padding: 8px;
  border-radius: 18px;
}

.size-small .growth-icon {
  font-size: 24px;
}

.size-small .growth-kicker {
  display: none;
}

.size-small .growth-label {
  font-size: 10px;
}

.size-large .growth-plaque {
  min-width: 96px;
  min-height: 96px;
  border-radius: 30px;
}

.size-large .growth-icon {
  font-size: 48px;
}

.size-large .growth-kicker {
  font-size: 0.76rem;
}

.size-large .growth-label {
  font-size: 14px;
}

.animated .growth-plaque {
  animation: plaque-breathe 3s ease-in-out infinite;
}

.growth-icon.up {
  animation: fertilize-up 0.8s ease-out forwards !important;
}

.growth-icon.down {
  animation: wither-down 0.8s ease-out forwards !important;
}

.growth-icon.celebrate {
  animation: celebrate-bounce 1s ease-out forwards !important;
}

@keyframes plaque-breathe {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

@keyframes fertilize-up {
  0% {
    transform: scale(1) translateY(0);
    filter: brightness(1);
  }

  30% {
    transform: scale(1.22) translateY(-8px);
    filter: brightness(1.25) drop-shadow(0 0 10px rgba(76, 175, 80, 0.8));
  }

  100% {
    transform: scale(1) translateY(0);
    filter: brightness(1);
  }
}

@keyframes wither-down {
  0% {
    transform: scale(1) translateY(0);
    filter: brightness(1) saturate(1);
  }

  30% {
    transform: scale(0.92) translateY(6px);
    filter: brightness(0.78) saturate(0.6);
  }

  100% {
    transform: scale(1) translateY(0);
    filter: brightness(1) saturate(1);
  }
}

@keyframes celebrate-bounce {
  0% {
    transform: scale(1) rotate(0deg);
  }

  18% {
    transform: scale(1.35) rotate(-8deg);
  }

  36% {
    transform: scale(1.24) rotate(8deg);
  }

  55% {
    transform: scale(1.1) rotate(-4deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
  }
}
</style>
