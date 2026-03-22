<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getGrowthIcon, getGrowthLabel } from '@/utils/growth'

const props = withDefaults(defineProps<{
  fromStage: string
  toStage: string
  theme: 'farm' | 'tree'
  scope?: 'student' | 'group' | 'class'
  entityName?: string
}>(), {
  scope: 'student',
  entityName: ''
})

const emit = defineEmits<{
  (e: 'complete'): void
}>()

const isVisible = ref(true)
const particles = ref<Array<{ id: number; x: number; y: number; delay: number; icon: string }>>([])

const toStageEmoji = computed(() => getGrowthIcon(props.toStage, props.theme))
const toStageLabel = computed(() => getGrowthLabel(props.toStage, props.theme))
const congratsText = computed(() => {
  if (props.scope === 'class') return '全班升级啦！'
  if (props.scope === 'group') return '小组成长啦！'
  return '恭喜升级！'
})
const subtitleText = computed(() => {
  if (props.entityName) {
    return `${props.entityName}已经成长到 ${toStageLabel.value}`
  }

  return props.theme === 'farm'
    ? '新的花园阶段已经点亮'
    : '新的成长阶段已经点亮'
})

onMounted(() => {
  const particleIcons = props.theme === 'farm' ? ['⭐', '🌼', '✨'] : ['⭐', '🍃', '✨']

  particles.value = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    x: (Math.random() - 0.5) * 320,
    y: (Math.random() - 0.5) * 280,
    delay: Math.random() * 0.3,
    icon: particleIcons[index % particleIcons.length]
  }))

  setTimeout(() => {
    isVisible.value = false
    emit('complete')
  }, 2500)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="celebration">
      <div v-if="isVisible" :class="['growth-celebration', theme]">
        <div class="stars">
          <span
            v-for="particle in particles"
            :key="particle.id"
            class="star"
            :style="{
              '--x': `${particle.x}px`,
              '--y': `${particle.y}px`,
              '--delay': `${particle.delay}s`
            }"
          >
            {{ particle.icon }}
          </span>
        </div>

        <div class="celebration-content">
          <div class="upgrade-ring"></div>
          <div class="upgrade-icon">{{ toStageEmoji }}</div>
          <div class="upgrade-text">
            <span class="congrats">{{ congratsText }}</span>
            <span class="stage-name">{{ toStageLabel }}</span>
            <span class="stage-subtitle">{{ subtitleText }}</span>
          </div>
        </div>

        <div class="bg-glow"></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.growth-celebration {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 58, 36, 0.62);
  backdrop-filter: blur(14px);
  z-index: 10000;
  pointer-events: none;
}

.growth-celebration.farm {
  background: rgba(90, 63, 28, 0.46);
}

.stars {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.star {
  position: absolute;
  font-size: 24px;
  animation: star-explode 1.5s ease-out forwards;
  animation-delay: var(--delay);
}

@keyframes star-explode {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }

  30% {
    transform: translate(calc(var(--x) * 0.35), calc(var(--y) * 0.35)) scale(1.45);
    opacity: 1;
  }

  100% {
    transform: translate(var(--x), var(--y)) scale(0);
    opacity: 0;
  }
}

.celebration-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: content-zoom 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes content-zoom {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }

  60% {
    transform: scale(1.08);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.upgrade-ring {
  position: absolute;
  top: 18px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.42);
  animation: ring-spin 6s linear infinite;
}

@keyframes ring-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.upgrade-icon {
  position: relative;
  z-index: 1;
  font-size: 120px;
  filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.8));
  animation: icon-dance 0.8s ease-in-out infinite;
}

@keyframes icon-dance {
  0%,
  100% {
    transform: rotate(-5deg) scale(1);
  }

  25% {
    transform: rotate(5deg) scale(1.08);
  }

  50% {
    transform: rotate(-3deg) scale(1.02);
  }

  75% {
    transform: rotate(3deg) scale(1.08);
  }
}

.upgrade-text {
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
}

.congrats {
  font-family: var(--font-accent);
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #ffe082;
  text-shadow: 0 2px 18px rgba(255, 224, 130, 0.9);
}

.stage-name {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: white;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.stage-subtitle {
  color: rgba(255, 255, 255, 0.88);
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.bg-glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.26) 0%, transparent 70%);
  animation: glow-pulse 1s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }

  50% {
    transform: scale(1.18);
    opacity: 0.8;
  }
}

.celebration-enter-active,
.celebration-leave-active {
  transition: opacity 0.4s ease;
}

.celebration-enter-from,
.celebration-leave-to {
  opacity: 0;
}
</style>
