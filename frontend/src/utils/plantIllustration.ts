import type { GrowthStage, GrowthTheme } from './growth'

export type PlantVariety =
  | 'wildflower'
  | 'sunflower'
  | 'lavender'
  | 'cabbage'
  | 'tomato'
  | 'bluebell'

export interface PlantIllustrationState {
  theme: GrowthTheme
  stage: GrowthStage
  stageLevel: 0 | 1 | 2 | 3 | 4
  variety: PlantVariety
}

const FARM_STAGE_BY_LEVEL: GrowthStage[] = ['seed', 'sprout', 'seedling', 'flower', 'harvest']
const TREE_STAGE_BY_LEVEL: GrowthStage[] = ['seed', 'bud', 'sapling', 'young_tree', 'big_tree']

const STAGE_LEVEL_MAP: Record<GrowthStage, 0 | 1 | 2 | 3 | 4> = {
  seed: 0,
  sprout: 1,
  seedling: 2,
  flower: 3,
  harvest: 4,
  bud: 1,
  sapling: 2,
  young_tree: 3,
  big_tree: 4
}

const VARIETIES: PlantVariety[] = ['wildflower', 'sunflower', 'lavender', 'cabbage', 'tomato', 'bluebell']

function isGrowthStage(value: string): value is GrowthStage {
  return value in STAGE_LEVEL_MAP
}

export function normalizePlantStage(theme: GrowthTheme, stage?: string): GrowthStage {
  if (!stage || !isGrowthStage(stage)) {
    return 'seed'
  }

  const level = STAGE_LEVEL_MAP[stage]
  return theme === 'farm' ? FARM_STAGE_BY_LEVEL[level] : TREE_STAGE_BY_LEVEL[level]
}

export function getPlantStageLevel(stage: GrowthStage | string): 0 | 1 | 2 | 3 | 4 {
  if (isGrowthStage(stage)) {
    return STAGE_LEVEL_MAP[stage]
  }
  return 0
}

export function pickPlantVariety(seed: number | string): PlantVariety {
  const source = String(seed || '')
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 1_000_000_007
  }
  return VARIETIES[Math.abs(hash) % VARIETIES.length]
}

export function deriveCropVariety(input: {
  id?: number | string
  index?: number
  fallbackSeed?: number | string
}): PlantVariety {
  const source = input.id ?? input.index ?? input.fallbackSeed ?? 'crop'
  return pickPlantVariety(source)
}

export function buildPlantIllustrationState(options: {
  theme: GrowthTheme
  stage?: string
  variety?: PlantVariety
  seed?: string | number
}): PlantIllustrationState {
  const stage = normalizePlantStage(options.theme, options.stage)
  const stageLevel = getPlantStageLevel(stage)
  const variety = options.variety ?? pickPlantVariety(options.seed ?? `${options.theme}-${stage}`)

  return {
    theme: options.theme,
    stage,
    stageLevel,
    variety
  }
}
