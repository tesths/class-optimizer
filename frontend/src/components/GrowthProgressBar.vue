<script setup lang="ts">
import { computed } from 'vue'
import {
  getGrowthLabel,
  getGrowthProgress,
  getGrowthStageConfig,
  getGrowthStageInfo
} from '@/utils/growth'

const props = defineProps<{
  score: number
  theme: 'farm' | 'tree'
  size?: 'small' | 'medium' | 'large'
}>()

const stageConfig = computed(() => getGrowthStageConfig(props.theme))

// Current stage
const currentStageInfo = computed(() => {
  return getGrowthStageInfo(props.theme, props.score)
})

// Progress percentage (0-100)
const progress = computed(() => getGrowthProgress(props.theme, props.score))

// Points to next stage
const pointsToNext = computed(() => {
  const stage = currentStageInfo.value
  if (stage.max === Infinity) return 0
  return stage.max - props.score
})

const nextStageLabel = computed(() => {
  const currentName = currentStageInfo.value.name
  const maxStage = props.theme === 'farm' ? 'harvest' : 'big_tree'
  if (currentName === maxStage) return '已满级'
  const currentIndex = stageConfig.value.findIndex(s => s.name === currentName)
  const nextStage = stageConfig.value[currentIndex + 1]
  return nextStage ? nextStage.label : ''
})
</script>

<template>
  <div :class="['growth-progress-bar', `size-${size || 'medium'}`, theme]">
    <div class="progress-header">
      <div class="stage-info">
        <span class="stage-dot" :style="{ backgroundColor: currentStageInfo.color }"></span>
        <span class="stage-name">{{ getGrowthLabel(currentStageInfo.name, theme) }}</span>
      </div>
      <span class="points-to-next" v-if="pointsToNext > 0">
        还需 {{ pointsToNext }} 分
      </span>
      <span class="points-to-next max" v-else>
        已满级 ✨
      </span>
    </div>

    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${currentStageInfo.color}cc, ${currentStageInfo.color})`
        }"
      >
        <div class="progress-shine"></div>
      </div>
      <!-- Stage markers -->
      <div class="stage-markers">
        <div
          v-for="stage in stageConfig.slice(0, -1)"
          :key="stage.name"
          class="marker"
          :class="{ passed: score >= stage.min }"
          :style="{ left: `${((stage.min - stageConfig[0].min) / (stageConfig[stageConfig.length - 2].max - stageConfig[0].min)) * 100}%` }"
        ></div>
      </div>
    </div>

    <div class="progress-footer">
      <span class="current-score">{{ score }}</span>
      <span class="next-stage-info" v-if="nextStageLabel !== '已满级'">
        下一阶段: {{ nextStageLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.growth-progress-bar {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stage-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.stage-name {
  font-family: var(--font-accent);
  font-size: 13px;
  font-weight: 600;
  color: var(--forest-700);
  letter-spacing: 0.04em;
}

.points-to-next {
  font-family: var(--font-accent);
  font-size: 11px;
  color: var(--brown-400);
  transition: color var(--duration-fast) var(--ease-out);
  letter-spacing: 0.03em;
}

.points-to-next.max {
  color: var(--terra-500);
  animation: shimmer 2s linear infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Progress track */
.progress-track {
  height: 10px;
  background: var(--cream-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: progressShine 2s ease-in-out infinite;
}

@keyframes progressShine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%);
}

/* Stage markers */
.stage-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.marker {
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  background: var(--cream-300);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: background 0.3s ease, transform 0.3s ease;
}

.marker.passed {
  background: var(--forest-500);
  transform: translate(-50%, -50%) scale(1.2);
}

/* Footer */
.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.current-score {
  font-family: var(--font-number);
  font-size: 14px;
  font-weight: 800;
  color: var(--forest-700);
  transition: color var(--duration-fast) var(--ease-out);
  font-variant-numeric: tabular-nums lining-nums;
}

.next-stage-info {
  font-size: 11px;
  color: var(--brown-400);
  letter-spacing: 0.02em;
}

/* Size variants */
.size-small .progress-track {
  height: 6px;
}

.size-small .stage-dot {
  width: 6px;
  height: 6px;
}

.size-small .stage-name,
.size-small .points-to-next {
  font-size: 11px;
}

.size-small .current-score {
  font-size: 12px;
}

.size-large .progress-track {
  height: 14px;
}

.size-large .stage-dot {
  width: 10px;
  height: 10px;
}

.size-large .stage-name,
.size-large .points-to-next {
  font-size: 15px;
}

.size-large .current-score {
  font-size: 18px;
}
</style>
