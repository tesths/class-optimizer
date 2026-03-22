// Growth stage calculation utilities
// Student thresholds stay aligned with backend defaults.
// Group scenes can optionally provide a higher custom threshold set.

export const FARM_THRESHOLDS = {
  seed: 0,
  sprout: 10,
  seedling: 30,
  flower: 60,
  harvest: 100
}

export const TREE_THRESHOLDS = {
  seed: 0,
  bud: 10,
  sapling: 30,
  young_tree: 60,
  big_tree: 100
}

export const DEFAULT_GROUP_GROWTH_THRESHOLDS = [0, 20, 50, 90, 140]

export type FarmStage = 'seed' | 'sprout' | 'seedling' | 'flower' | 'harvest'
export type TreeStage = 'seed' | 'bud' | 'sapling' | 'young_tree' | 'big_tree'
export type GrowthTheme = 'farm' | 'tree'
export type GrowthStage = FarmStage | TreeStage
export type GrowthThresholds = [number, number, number, number, number] | number[]

interface GrowthStageBase {
  name: GrowthStage
  emoji: string
  label: string
  color: string
}

export interface GrowthStageInfo extends GrowthStageBase {
  min: number
  max: number
}

const FARM_STAGE_BASE: GrowthStageBase[] = [
  { name: 'seed', emoji: '🌱', label: '种子', color: '#8B4513' },
  { name: 'sprout', emoji: '🌿', label: '嫩芽', color: '#90EE90' },
  { name: 'seedling', emoji: '🌾', label: '幼苗', color: '#32CD32' },
  { name: 'flower', emoji: '🌸', label: '开花', color: '#FF69B4' },
  { name: 'harvest', emoji: '🎉', label: '丰收', color: '#FFD700' }
]

const TREE_STAGE_BASE: GrowthStageBase[] = [
  { name: 'seed', emoji: '🌰', label: '种子', color: '#8B4513' },
  { name: 'bud', emoji: '🌱', label: '萌芽', color: '#98FB98' },
  { name: 'sapling', emoji: '🌿', label: '树苗', color: '#228B22' },
  { name: 'young_tree', emoji: '🌳', label: '小树', color: '#006400' },
  { name: 'big_tree', emoji: '🌲', label: '大树', color: '#2E8B57' }
]

function getDefaultThresholds(theme: GrowthTheme): number[] {
  return theme === 'farm'
    ? Object.values(FARM_THRESHOLDS)
    : Object.values(TREE_THRESHOLDS)
}

export function normalizeGrowthThresholds(thresholds: GrowthThresholds): number[] {
  const normalized = [...thresholds].map(value => Number(value))

  if (normalized.length !== 5 || normalized.some(value => Number.isNaN(value))) {
    throw new Error('成长阈值必须提供 5 个有效数字')
  }
  if (normalized[0] !== 0) {
    throw new Error('成长阈值第一档必须是 0')
  }
  if (normalized.some(value => value < 0)) {
    throw new Error('成长阈值不能为负数')
  }
  if (normalized.some((value, index) => index > 0 && value <= normalized[index - 1])) {
    throw new Error('成长阈值必须严格递增')
  }

  return normalized
}

function getThresholds(theme: GrowthTheme, thresholds?: GrowthThresholds): number[] {
  return normalizeGrowthThresholds(thresholds ?? getDefaultThresholds(theme))
}

function getStageBase(theme: GrowthTheme): GrowthStageBase[] {
  return theme === 'farm' ? FARM_STAGE_BASE : TREE_STAGE_BASE
}

export function getGrowthStageConfig(
  theme: GrowthTheme,
  thresholds?: GrowthThresholds
): GrowthStageInfo[] {
  const resolvedThresholds = getThresholds(theme, thresholds)
  const stageBase = getStageBase(theme)

  return stageBase.map((stage, index) => ({
    ...stage,
    min: resolvedThresholds[index],
    max: resolvedThresholds[index + 1] ?? Infinity
  }))
}

export function getGrowthStageInfo(
  theme: GrowthTheme,
  score: number,
  thresholds?: GrowthThresholds
): GrowthStageInfo {
  const normalizedScore = Math.max(0, score)
  const config = getGrowthStageConfig(theme, thresholds)

  for (const stage of [...config].reverse()) {
    if (normalizedScore >= stage.min) {
      return stage
    }
  }

  return config[0]
}

export function calculateGrowthStage(
  theme: GrowthTheme,
  score: number,
  thresholds?: GrowthThresholds
): GrowthStage {
  return getGrowthStageInfo(theme, score, thresholds).name
}

export function getGrowthIcon(stage: string, theme: GrowthTheme): string {
  const config = getGrowthStageConfig(theme)
  return config.find(item => item.name === stage)?.emoji ?? config[0].emoji
}

export function getGrowthColor(stage: string, theme: GrowthTheme): string {
  const config = getGrowthStageConfig(theme)
  return config.find(item => item.name === stage)?.color ?? config[0].color
}

export function getGrowthLabel(stage: string, theme: GrowthTheme): string {
  const config = getGrowthStageConfig(theme)
  return config.find(item => item.name === stage)?.label ?? config[0].label
}

export function getGrowthProgress(
  theme: GrowthTheme,
  score: number,
  thresholds?: GrowthThresholds
): number {
  const stage = getGrowthStageInfo(theme, score, thresholds)
  if (stage.max === Infinity) {
    return 100
  }

  const normalizedScore = Math.max(0, score)
  const stageRange = stage.max - stage.min
  const progress = ((normalizedScore - stage.min) / stageRange) * 100
  return Math.max(0, Math.min(100, Math.round(progress)))
}

export function getNextGrowthStageInfo(
  theme: GrowthTheme,
  score: number,
  thresholds?: GrowthThresholds
): GrowthStageInfo | null {
  const currentStage = getGrowthStageInfo(theme, score, thresholds)
  const config = getGrowthStageConfig(theme, thresholds)
  const currentIndex = config.findIndex(stage => stage.name === currentStage.name)

  if (currentIndex < 0 || currentIndex === config.length - 1) {
    return null
  }

  return config[currentIndex + 1]
}

export function getPointsToNextStage(
  theme: GrowthTheme,
  score: number,
  thresholds?: GrowthThresholds
): number {
  const normalizedScore = Math.max(0, score)
  const currentStage = getGrowthStageInfo(theme, normalizedScore, thresholds)

  if (currentStage.max === Infinity) {
    return 0
  }

  return Math.max(0, currentStage.max - normalizedScore)
}

export function getGrowthGoalLabel(
  theme: GrowthTheme,
  score: number,
  thresholds?: GrowthThresholds
): string {
  return getNextGrowthStageInfo(theme, score, thresholds)?.label ?? '已满级'
}
