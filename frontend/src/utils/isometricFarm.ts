import type { GrowthStage, GrowthTheme } from './growth'
import {
  FARM_CROP_ASSETS,
  FARM_PROP_ASSETS,
  FARM_TILE_ASSETS
} from './farmAssetManifest'

export type FarmPlotTone = 'ridge' | 'meadow' | 'grove'
export type FarmSceneKind = 'groups' | 'class'

export interface IsometricFarmPlant {
  id: number | string
  name: string
  score: number
  stage: GrowthStage
  stageLabel: string
  statusCopy: string
  showLabel: boolean
  featured?: boolean
  placeholder?: boolean
}

export interface IsometricFarmPlot {
  id: number | string
  name: string
  subtitle: string
  score: number
  scoreLabel: string
  note: string
  tone: FarmPlotTone
  rows: IsometricFarmPlant[][]
}

export const FARM_SCENE_ASSETS = {
  dirt: FARM_TILE_ASSETS.dirtBase,
  dirtFarmland: FARM_TILE_ASSETS.farmlandPlot,
  cropYoung: FARM_CROP_ASSETS.cornYoungSingle,
  cropYoungDense: FARM_CROP_ASSETS.cornYoungCluster,
  cropMature: FARM_CROP_ASSETS.cornMatureSingle,
  cropMatureDense: FARM_CROP_ASSETS.cornMatureCluster,
  harvest: FARM_CROP_ASSETS.haySmall,
  harvestDense: FARM_CROP_ASSETS.hayBales,
  harvestStack: FARM_CROP_ASSETS.hayStack,
  fence: FARM_PROP_ASSETS.fenceLow,
  planks: FARM_TILE_ASSETS.pathPlanks,
  planksCornerLeft: FARM_TILE_ASSETS.pathCornerLeft,
  planksCornerRight: FARM_TILE_ASSETS.pathCornerRight,
  pathOld: FARM_TILE_ASSETS.pathPlanksOld,
  shackWall: FARM_PROP_ASSETS.shackWall,
  shackRoof: FARM_PROP_ASSETS.shackRoof,
  chimneyBase: FARM_PROP_ASSETS.chimneyBase,
  chimneyTop: FARM_PROP_ASSETS.chimneyTop,
  sacksCrate: FARM_PROP_ASSETS.sacksCrate,
  ladderStand: FARM_PROP_ASSETS.ladderStand
} as const

export type FarmSceneAssetKey = keyof typeof FARM_SCENE_ASSETS

export function getCropAssetKey(options: {
  theme: GrowthTheme
  stage: GrowthStage
  featured?: boolean
  placeholder?: boolean
}): FarmSceneAssetKey {
  const { stage, featured, placeholder } = options

  if (placeholder) return 'dirt'
  if (stage === 'seed' || stage === 'sprout' || stage === 'bud') {
    return featured ? 'cropYoungDense' : 'cropYoung'
  }
  if (stage === 'seedling' || stage === 'sapling') {
    return featured ? 'cropMatureDense' : 'cropMature'
  }
  if (stage === 'flower' || stage === 'young_tree') {
    return featured ? 'cropMatureDense' : 'cropMature'
  }
  return featured ? 'harvestStack' : 'harvestDense'
}

export function getToneColors(tone: FarmPlotTone) {
  if (tone === 'meadow') {
    return {
      outline: 0xc99555,
      shade: 0x7c4a29,
      label: 0xfff2d9
    }
  }

  if (tone === 'grove') {
    return {
      outline: 0xd58e4e,
      shade: 0x6f391f,
      label: 0xffedcf
    }
  }

  return {
    outline: 0xb27b49,
    shade: 0x5d301b,
    label: 0xffefd8
  }
}
