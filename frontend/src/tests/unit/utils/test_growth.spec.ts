import { describe, expect, it } from 'vitest'
import {
  FARM_THRESHOLDS,
  TREE_THRESHOLDS,
  calculateGrowthStage,
  getGrowthColor,
  getGrowthIcon,
  getGrowthLabel,
  getGrowthProgress,
  getGrowthStageConfig,
  getGrowthStageInfo
} from '@/utils/growth'

describe('growth utils boundary coverage', () => {
  it('keeps farm and tree thresholds aligned with the documented rules', () => {
    expect(FARM_THRESHOLDS).toEqual({
      seed: 0,
      sprout: 10,
      seedling: 30,
      flower: 60,
      harvest: 100
    })
    expect(TREE_THRESHOLDS).toEqual({
      seed: 0,
      bud: 10,
      sapling: 30,
      young_tree: 60,
      big_tree: 100
    })
  })

  it.each([
    ['farm', -1, 'seed'],
    ['farm', 0, 'seed'],
    ['farm', 9, 'seed'],
    ['farm', 10, 'sprout'],
    ['farm', 29, 'sprout'],
    ['farm', 30, 'seedling'],
    ['farm', 59, 'seedling'],
    ['farm', 60, 'flower'],
    ['farm', 99, 'flower'],
    ['farm', 100, 'harvest'],
    ['tree', -1, 'seed'],
    ['tree', 0, 'seed'],
    ['tree', 9, 'seed'],
    ['tree', 10, 'bud'],
    ['tree', 29, 'bud'],
    ['tree', 30, 'sapling'],
    ['tree', 59, 'sapling'],
    ['tree', 60, 'young_tree'],
    ['tree', 99, 'young_tree'],
    ['tree', 100, 'big_tree']
  ] as const)('calculates %s stage correctly at score %d', (theme, score, expectedStage) => {
    expect(calculateGrowthStage(theme, score)).toBe(expectedStage)
  })

  it('returns the expected metadata for the active stage', () => {
    expect(getGrowthStageInfo('farm', 35)).toMatchObject({
      name: 'seedling',
      label: '幼苗',
      emoji: '🌾'
    })
    expect(getGrowthStageInfo('tree', 75)).toMatchObject({
      name: 'young_tree',
      label: '小树',
      emoji: '🌳'
    })
  })

  it('keeps stage config ordered from low to high score', () => {
    const farmConfig = getGrowthStageConfig('farm')
    const treeConfig = getGrowthStageConfig('tree')

    expect(farmConfig.map(stage => stage.name)).toEqual([
      'seed',
      'sprout',
      'seedling',
      'flower',
      'harvest'
    ])
    expect(treeConfig.map(stage => stage.name)).toEqual([
      'seed',
      'bud',
      'sapling',
      'young_tree',
      'big_tree'
    ])
  })

  it('returns themed icon, label, and color with seed fallback for unknown stages', () => {
    expect(getGrowthIcon('flower', 'farm')).toBe('🌸')
    expect(getGrowthLabel('big_tree', 'tree')).toBe('大树')
    expect(getGrowthColor('sapling', 'tree')).toBe('#228B22')

    expect(getGrowthIcon('unknown', 'farm')).toBe('🌱')
    expect(getGrowthLabel('unknown', 'tree')).toBe('种子')
    expect(getGrowthColor('unknown', 'tree')).toBe('#8B4513')
  })

  it.each([
    ['farm', 0, 0],
    ['farm', 5, 50],
    ['farm', 10, 0],
    ['farm', 20, 50],
    ['farm', 30, 0],
    ['farm', 45, 50],
    ['farm', 60, 0],
    ['farm', 80, 50],
    ['farm', 100, 100],
    ['tree', 0, 0],
    ['tree', 5, 50],
    ['tree', 10, 0],
    ['tree', 20, 50],
    ['tree', 30, 0],
    ['tree', 45, 50],
    ['tree', 60, 0],
    ['tree', 80, 50],
    ['tree', 100, 100]
  ] as const)('calculates %s progress at score %d as %d%%', (theme, score, expectedProgress) => {
    expect(getGrowthProgress(theme, score)).toBe(expectedProgress)
  })

  it('caps progress between 0 and 100 for extreme values', () => {
    expect(getGrowthProgress('farm', -50)).toBe(0)
    expect(getGrowthProgress('tree', 999)).toBe(100)
  })
})
