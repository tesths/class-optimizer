<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = defineProps<{
  delta: number // 正数=加分, 负数=减分
  theme: 'farm' | 'tree'
}>()

const emit = defineEmits<{
  (e: 'complete'): void
}>()

const isVisible = ref(true)
const particles = ref<Array<{ id: number; tx: number; ty: number; delay: number }>>([])

// 生成随机粒子
onMounted(() => {
  // 生成 12 个粒子
  particles.value = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    tx: (Math.random() - 0.5) * 100, // -50 to 50
    ty: -Math.random() * 80 - 20, // -20 to -100 (向上飘)
    delay: Math.random() * 0.2 // 0 to 0.2s 延迟
  }))

  // 动画结束后通知父组件
  setTimeout(() => {
    isVisible.value = false
    emit('complete')
  }, 1500)
})

const isPositive = computed(() => props.delta > 0)

const effectClass = computed(() => isPositive.value ? 'fertilize' : 'wither')

const deltaText = computed(() => {
  return isPositive.value ? `+${props.delta}` : `${props.delta}`
})
</script>

<template>
  <Teleport to="body">
    <Transition name="effect-fade">
      <div v-if="isVisible" :class="['fertilizer-effect', effectClass]">
        <!-- 粒子效果 -->
        <div class="particles">
          <span
            v-for="p in particles"
            :key="p.id"
            class="particle"
            :style="{
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--delay': `${p.delay}s`
            }"
          >
            {{ isPositive ? '✨' : '🍂' }}
          </span>
        </div>

        <!-- 中心图标 -->
        <div class="center-icon">
          <span class="delta-text">{{ deltaText }}</span>
          <span class="emoji">{{ isPositive ? '💚' : '💔' }}</span>
        </div>

        <!-- 文字提示 -->
        <div class="effect-text">
          {{ isPositive ? '施肥成功！' : '植物枯萎了...' }}
        </div>

        <!-- 背景光晕 -->
        <div class="glow-overlay"></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fertilizer-effect {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
  background: rgba(26, 58, 36, 0.6);
  backdrop-filter: blur(8px);
}

.particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.particle {
  position: absolute;
  font-size: 20px;
  animation: particle-rise 1.2s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes particle-rise {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0.5);
    opacity: 0;
  }
}

.center-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: icon-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.delta-text {
  font-size: 48px;
  font-weight: bold;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.fertilize .delta-text {
  color: #4CAF50;
}

.wither .delta-text {
  color: #F44336;
}

.emoji {
  font-size: 64px;
  animation: emoji-bounce 0.8s ease-in-out infinite;
}

@keyframes emoji-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes icon-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.effect-text {
  margin-top: 20px;
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  animation: text-slide-up 0.5s ease-out 0.2s both;
}

@keyframes text-slide-up {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.glow-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  animation: glow-pulse 1s ease-in-out infinite;
}

.fertilize .glow-overlay {
  background: radial-gradient(circle, rgba(76, 175, 80, 0.4) 0%, transparent 70%);
}

.wither .glow-overlay {
  background: radial-gradient(circle, rgba(244, 67, 54, 0.4) 0%, transparent 70%);
}

@keyframes glow-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.3;
  }
}

/* 过渡动画 */
.effect-fade-enter-active,
.effect-fade-leave-active {
  transition: opacity 0.3s ease;
}

.effect-fade-enter-from,
.effect-fade-leave-to {
  opacity: 0;
}
</style>
