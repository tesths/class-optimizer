import { describe, expect, it } from 'vitest'
import {
  FARM_THRESHOLDS,
  TREE_THRESHOLDS,
  calculateGrowthStage,
  getGrowthColor,
  getGrowthIcon
} from '@/utils/growth'

describe('growth utils', () => {
  it('uses backend-aligned threshold constants', () => {
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
    ['farm', -5, 'seed'],
    ['farm', 10, 'sprout'],
    ['farm', 30, 'seedling'],
    ['farm', 60, 'flower'],
    ['farm', 100, 'harvest'],
    ['tree', 0, 'seed'],
    ['tree', 10, 'bud'],
    ['tree', 30, 'sapling'],
    ['tree', 60, 'young_tree'],
    ['tree', 100, 'big_tree']
  ] as const)('calculates %s stage at score %d', (theme, score, stage) => {
    expect(calculateGrowthStage(theme, score)).toBe(stage)
  })

  it('returns themed icons and colors', () => {
    expect(getGrowthIcon('sprout', 'farm')).toBe('🌿')
    expect(getGrowthIcon('young_tree', 'tree')).toBe('🌳')
    expect(getGrowthColor('flower', 'farm')).toBe('#FF69B4')
    expect(getGrowthColor('big_tree', 'tree')).toBe('#2E8B57')
  })

  it('falls back to seed visuals for unknown stages', () => {
    expect(getGrowthIcon('unknown', 'farm')).toBe('🌱')
    expect(getGrowthIcon('unknown', 'tree')).toBe('🌰')
    expect(getGrowthColor('unknown', 'farm')).toBe('#8B4513')
    expect(getGrowthColor('unknown', 'tree')).toBe('#8B4513')
  })
})
