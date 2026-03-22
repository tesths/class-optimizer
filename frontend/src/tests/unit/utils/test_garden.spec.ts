import { describe, expect, it } from 'vitest'
import type { StatsOverview, Student, StudentGroup } from '@/types'
import {
  deriveClassFieldScene,
  deriveClassDisplayScene,
  deriveClassGardenSummary,
  deriveGroupFieldScene,
  deriveGroupGardenCards,
  deriveGroupTabCards,
  deriveStudentGardenCards,
  deriveStudentTabCards,
  type GardenLayer,
  getGardenThemeMeta
} from '@/utils/garden'

const mockStudents: Student[] = [
  {
    id: 1,
    class_id: 1,
    name: '小明',
    student_no: '001',
    group_id: 10,
    group_name: '红队',
    total_score: 68,
    growth_stage: 'flower',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 2,
    class_id: 1,
    name: '小红',
    student_no: '002',
    group_id: 11,
    group_name: '蓝队',
    total_score: 35,
    growth_stage: 'seedling',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 3,
    class_id: 1,
    name: '小刚',
    student_no: '003',
    group_id: 10,
    group_name: '红队',
    total_score: 12,
    growth_stage: 'sprout',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
]

const mockGroups: StudentGroup[] = [
  {
    id: 10,
    class_id: 1,
    name: '红队',
    total_score: 80,
    member_count: 2,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 11,
    class_id: 1,
    name: '蓝队',
    total_score: 35,
    member_count: 1,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
]

const mockStats: StatsOverview = {
  student_count: 3,
  group_count: 2,
  week_plus: 18,
  week_minus: 2,
  month_plus: 40,
  month_minus: 4
}

describe('garden utils', () => {
  it('supports three garden layers including class scene', () => {
    const layers: GardenLayer[] = ['students', 'groups', 'class']
    expect(layers).toContain('class')
  })

  it('derives sorted student garden cards with next-step copy', () => {
    const cards = deriveStudentGardenCards(mockStudents, 'farm')

    expect(cards).toHaveLength(3)
    expect(cards[0].name).toBe('小明')
    expect(cards[0].badge).toBe('今日主角')
    expect(cards[0].goalCopy).toContain('再得')
    expect(cards[2].subtitle).toBe('红队')
  })

  it('derives richer student tab cards with level and upgrade fields', () => {
    const cards = deriveStudentTabCards(mockStudents, 'farm')

    expect(cards).toHaveLength(3)
    expect(cards[0].kind).toBe('student')
    expect(cards[0].levelLabel).toContain('Lv.')
    expect(cards[0].scoreLabel).toContain('分')
    expect(cards[0].pointsToUpgrade).toBeTypeOf('number')
    expect(cards[0].variant).toMatch(/canopy|orchard|terrace/)
  })

  it('derives group cards with member chips and score progress', () => {
    const cards = deriveGroupGardenCards(mockGroups, mockStudents, 'tree')

    expect(cards).toHaveLength(2)
    expect(cards[0].name).toBe('红队')
    expect(cards[0].members).toHaveLength(2)
    expect(cards[0].members?.[0].name).toBe('小明')
    expect(cards[0].goalCopy).toContain('再得')
  })

  it('derives richer group tab cards with terrain zone and next-upgrade data', () => {
    const cards = deriveGroupTabCards(mockGroups, mockStudents, 'tree')

    expect(cards).toHaveLength(2)
    expect(cards[0].kind).toBe('group')
    expect(cards[0].memberCount).toBe(2)
    expect(cards[0].pointsToUpgrade).toBeTypeOf('number')
    expect(cards[0].nextUpgradeLabel.length).toBeGreaterThan(0)
    expect(cards[0].terrainZone).toMatch(/north|center|south/)
  })

  it('derives group field scene with quadrilateral sections and plant placements', () => {
    const scene = deriveGroupFieldScene({
      className: '三年二班',
      groups: mockGroups,
      students: mockStudents,
      theme: 'farm',
      selectedGroupId: 10
    })

    expect(scene.scoreEntry).toBe('top-bar')
    expect(scene.selectedGroupId).toBe(10)
    expect(scene.sections.length).toBe(2)
    expect(scene.sections[0].corners).toHaveLength(4)
    expect(scene.sections[0].plants.length).toBeGreaterThan(0)
    expect(scene.plants.every(plant => plant.x >= 0 && plant.x <= 100)).toBe(true)
    expect(scene.plants.every(plant => plant.y >= 0 && plant.y <= 100)).toBe(true)
  })

  it('builds a class summary with spotlight student and group', () => {
    const summary = deriveClassGardenSummary({
      className: '三年二班',
      students: mockStudents,
      groups: mockGroups,
      stats: mockStats,
      theme: 'farm'
    })

    expect(summary.heroName).toBe('三年二班的班级花园')
    expect(summary.heroGoalCopy.length).toBeGreaterThan(0)
    expect(summary.metrics).toHaveLength(4)
    expect(summary.spotlightStudent?.name).toBe('小明')
    expect(summary.spotlightGroup?.name).toBe('红队')
  })

  it('builds class field scene with contiguous sections and sparse labels', () => {
    const scene = deriveClassFieldScene({
      className: '三年二班',
      students: mockStudents,
      groups: mockGroups,
      stats: mockStats,
      theme: 'tree'
    })

    expect(scene.isInteractive).toBe(false)
    expect(scene.labelDensity).toBe('sparse')
    expect(scene.sections).toHaveLength(3)
    expect(scene.sections.every(section => section.corners.length === 4)).toBe(true)
    expect(scene.plants.every(plant => plant.sectionId.startsWith('class-zone-'))).toBe(true)
    expect(scene.plants.some(plant => plant.showLabel)).toBe(true)
  })

  it('builds class display scene as pure visual model with field placements', () => {
    const scene = deriveClassDisplayScene({
      className: '三年二班',
      students: mockStudents,
      groups: mockGroups,
      stats: mockStats,
      theme: 'tree'
    })

    expect(scene.isInteractive).toBe(false)
    expect(scene.zones).toHaveLength(3)
    expect(scene.specimens.length).toBeGreaterThanOrEqual(mockStudents.length)
    expect(scene.metrics).toHaveLength(4)
    expect(scene.themeLabel).toBe('森林模式')
    expect(scene.fieldSections).toHaveLength(3)
    expect(scene.plantPlacements.length).toBeGreaterThanOrEqual(mockStudents.length)
  })

  it('returns theme-specific scene metadata', () => {
    expect(getGardenThemeMeta('farm').sceneTitle).toBe('🌻 我的农场')
    expect(getGardenThemeMeta('tree').heroTitle).toBe('班级梦想树')
  })
})
