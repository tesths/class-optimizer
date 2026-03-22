<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import type { GrowthTheme } from '@/utils/growth'
import {
  buildPlantIllustrationState,
  type PlantVariety
} from '@/utils/plantIllustration'

const props = withDefaults(defineProps<{
  theme?: GrowthTheme
  stage?: string
  variety?: PlantVariety
  dense?: boolean
  featured?: boolean
  placeholder?: boolean
}>(), {
  theme: 'farm',
  stage: 'seed',
  dense: false,
  featured: false,
  placeholder: false
})

const state = computed(() => buildPlantIllustrationState({
  theme: props.theme,
  stage: props.stage,
  variety: props.variety
}))

const uid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 100000)
const gradientStemId = `crop-stem-${uid}`
const gradientPetalId = `crop-petal-${uid}`
const gradientLeafId = `crop-leaf-${uid}`

const showSprout = computed(() => !props.placeholder && state.value.stageLevel >= 1)
const showStem = computed(() => !props.placeholder && state.value.stageLevel >= 2)
const showBloom = computed(() => !props.placeholder && state.value.stageLevel >= 3)
const showHarvest = computed(() => !props.placeholder && state.value.stageLevel >= 4)
const blossomCount = computed(() => {
  if (state.value.stageLevel <= 2 || props.placeholder) return 0
  if (props.dense) return 1
  return props.featured ? 3 : 2
})
</script>

<template>
  <div
    :class="[
      'garden-crop-illustration',
      `theme-${state.theme}`,
      `stage-${state.stage}`,
      `variety-${state.variety}`,
      {
        dense,
        featured,
        placeholder
      }
    ]"
    aria-hidden="true"
  >
    <svg class="crop-svg" viewBox="0 0 120 132" role="presentation">
      <defs>
        <linearGradient :id="gradientStemId" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#2f5b2f" />
          <stop offset="100%" stop-color="#6ca15e" />
        </linearGradient>
        <linearGradient :id="gradientLeafId" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3f7a45" />
          <stop offset="100%" stop-color="#8ec97d" />
        </linearGradient>
        <radialGradient :id="gradientPetalId" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff6df" />
          <stop offset="100%" stop-color="#f0a55a" />
        </radialGradient>
      </defs>

      <ellipse class="crop-shadow" cx="60" cy="112" rx="34" ry="10" />
      <ellipse class="crop-soil" cx="60" cy="108" rx="32" ry="9" />

      <g class="plant-body">
        <g v-if="showSprout" class="sprout-group">
          <path class="leaf leaf-left" d="M58 92 C38 82, 32 62, 58 70 Z" :fill="`url(#${gradientLeafId})`" />
          <path class="leaf leaf-right" d="M62 92 C82 82, 88 62, 62 70 Z" :fill="`url(#${gradientLeafId})`" />
        </g>

        <path
          v-if="showStem"
          class="stem"
          d="M60 106 C54 84, 54 60, 60 24 C66 60, 66 84, 60 106 Z"
          :fill="`url(#${gradientStemId})`"
        />

        <g v-if="showBloom" class="bloom-group" :data-count="blossomCount">
          <g v-if="blossomCount >= 1" class="blossom b-main" transform="translate(60 30)">
            <circle class="petal p1" r="10" cx="0" cy="-11" :fill="`url(#${gradientPetalId})`" />
            <circle class="petal p2" r="10" cx="10" cy="-3" :fill="`url(#${gradientPetalId})`" />
            <circle class="petal p3" r="10" cx="6.5" cy="9" :fill="`url(#${gradientPetalId})`" />
            <circle class="petal p4" r="10" cx="-6.5" cy="9" :fill="`url(#${gradientPetalId})`" />
            <circle class="petal p5" r="10" cx="-10" cy="-3" :fill="`url(#${gradientPetalId})`" />
            <circle class="core" r="6.8" />
          </g>

          <g v-if="blossomCount >= 2" class="blossom b-left" transform="translate(40 47) scale(0.76)">
            <circle class="petal" r="8.6" cx="0" cy="-9.6" />
            <circle class="petal" r="8.6" cx="8.4" cy="-2.2" />
            <circle class="petal" r="8.6" cx="5.4" cy="8.4" />
            <circle class="petal" r="8.6" cx="-5.4" cy="8.4" />
            <circle class="petal" r="8.6" cx="-8.4" cy="-2.2" />
            <circle class="core" r="5.8" />
          </g>

          <g v-if="blossomCount >= 3" class="blossom b-right" transform="translate(80 47) scale(0.76)">
            <circle class="petal" r="8.6" cx="0" cy="-9.6" />
            <circle class="petal" r="8.6" cx="8.4" cy="-2.2" />
            <circle class="petal" r="8.6" cx="5.4" cy="8.4" />
            <circle class="petal" r="8.6" cx="-5.4" cy="8.4" />
            <circle class="petal" r="8.6" cx="-8.4" cy="-2.2" />
            <circle class="core" r="5.8" />
          </g>
        </g>

        <g v-if="showHarvest" class="fruit-group">
          <circle class="fruit f1" r="4.5" cx="46" cy="60" />
          <circle class="fruit f2" r="4.5" cx="74" cy="62" />
          <circle class="fruit f3" r="4.9" cx="60" cy="55" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.garden-crop-illustration {
  --crop-scale: 1;
  width: 100%;
  height: 100%;
  min-width: 40px;
  min-height: 46px;
  display: grid;
  place-items: center;
}

.crop-svg {
  width: 100%;
  height: 100%;
  shape-rendering: geometricPrecision;
  overflow: visible;
  transform-origin: 60px 84px;
  transform: translateY(0) scale(var(--crop-scale));
}

.crop-shadow {
  fill: rgba(39, 26, 18, 0.16);
}

.crop-soil {
  fill: #7b4a29;
}

.leaf {
  transform-origin: 60px 90px;
  stroke: rgba(37, 81, 36, 0.15);
  stroke-width: 0.8;
}

.stem {
  opacity: 0.95;
  filter: saturate(1.04);
}

.blossom .petal {
  fill: #f3b86d;
  stroke: rgba(144, 90, 39, 0.16);
  stroke-width: 0.85;
}

.blossom .core {
  fill: #fbe87f;
  stroke: rgba(115, 78, 27, 0.2);
  stroke-width: 0.75;
}

.fruit {
  fill: #d95d3f;
  stroke: rgba(109, 37, 22, 0.25);
  stroke-width: 1.2;
}

.garden-crop-illustration.theme-tree .crop-soil {
  fill: #6a4f33;
}

.garden-crop-illustration.theme-tree .blossom .petal {
  fill: #bfd7a3;
}

.garden-crop-illustration.theme-tree .blossom .core {
  fill: #8da765;
}

.garden-crop-illustration.theme-tree .fruit {
  fill: #86a86f;
}

.garden-crop-illustration.variety-sunflower .blossom .petal {
  fill: #f0bf45;
}

.garden-crop-illustration.variety-sunflower .blossom .core {
  fill: #7a4c23;
}

.garden-crop-illustration.variety-lavender .blossom .petal {
  fill: #b9a4e8;
}

.garden-crop-illustration.variety-lavender .blossom .core {
  fill: #ffe4a7;
}

.garden-crop-illustration.variety-cabbage .blossom .petal {
  fill: #8fb574;
}

.garden-crop-illustration.variety-cabbage .blossom .core {
  fill: #dce8c6;
}

.garden-crop-illustration.variety-tomato .fruit {
  fill: #c74835;
}

.garden-crop-illustration.variety-bluebell .blossom .petal {
  fill: #6c9ce1;
}

.garden-crop-illustration.stage-seed .crop-soil {
  transform: scale(0.96);
}

.garden-crop-illustration.stage-seed .crop-shadow {
  opacity: 0.72;
}

.garden-crop-illustration.placeholder .crop-soil {
  filter: saturate(0.72) brightness(0.94);
}

.garden-crop-illustration.placeholder .crop-shadow {
  opacity: 0.1;
}

.garden-crop-illustration.stage-harvest .crop-shadow,
.garden-crop-illustration.featured .crop-shadow {
  opacity: 0.26;
}

.garden-crop-illustration.featured:not(.dense) {
  --crop-scale: 1.08;
}

.garden-crop-illustration.dense {
  --crop-scale: 0.94;
}

@media (prefers-reduced-motion: no-preference) {
  .garden-crop-illustration .crop-svg {
    animation: crop-bob 3.2s ease-in-out infinite;
  }

  .garden-crop-illustration.featured .crop-svg {
    animation-duration: 2.8s;
  }
}

@keyframes crop-bob {
  0% {
    transform: translateY(0) scale(var(--crop-scale));
  }

  50% {
    transform: translateY(-1.8px) scale(calc(var(--crop-scale) * 1.01));
  }

  100% {
    transform: translateY(0) scale(var(--crop-scale));
  }
}
</style>
