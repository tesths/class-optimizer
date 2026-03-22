import type { StatsOverview, Student, StudentGroup } from '@/types'
import {
  DEFAULT_GROUP_GROWTH_THRESHOLDS,
  calculateGrowthStage,
  getGrowthStageConfig,
  getGrowthGoalLabel,
  getGrowthIcon,
  getGrowthLabel,
  getGrowthProgress,
  getGrowthStageInfo,
  getPointsToNextStage,
  type GrowthStage,
  type GrowthTheme,
  type GrowthThresholds
} from './growth'

export type GardenLayer = 'students' | 'groups' | 'class'
export type GardenEntityKind = 'class' | 'group' | 'student'
export type GardenCardVariant = 'canopy' | 'orchard' | 'terrace'
export type GroupTerrainZone = 'north' | 'center' | 'south'
export type ClassDisplayZone = 'front' | 'middle' | 'back'

export interface GardenMetric {
  label: string
  value: string
  tone?: 'positive' | 'neutral' | 'warning'
}

export interface GardenMemberChip {
  id: number
  name: string
  icon: string
  score: number
}

export interface GardenCardViewModel {
  id: number | string
  kind: GardenEntityKind
  name: string
  title: string
  subtitle: string
  score: number
  stage: GrowthStage
  stageLabel: string
  icon: string
  progress: number
  pointsToNext: number
  nextGoalLabel: string
  goalCopy: string
  encouragement: string
  badge: string
  emphasis: 'spotlight' | 'warm' | 'calm'
  memberCount?: number
  members?: GardenMemberChip[]
}

export interface StudentGardenCardViewModel extends GardenCardViewModel {
  kind: 'student'
  levelLabel: string
  scoreLabel: string
  pointsToUpgrade: number
  currentLevelScore: number
  variant: GardenCardVariant
}

export interface GroupGardenCardViewModel extends GardenCardViewModel {
  kind: 'group'
  levelLabel: string
  scoreLabel: string
  pointsToUpgrade: number
  nextUpgradeLabel: string
  terrainZone: GroupTerrainZone
  memberCount: number
  members: GardenMemberChip[]
}

export interface GardenPlotViewModel {
  id: number | string
  name: string
  score: number
  icon: string
  stage: GrowthStage
  stageLabel: string
  note: string
  plotTone: 'spotlight' | 'warm' | 'calm'
}

export interface GardenSceneViewModel {
  title: string
  subtitle: string
  scoreLabel: string
  progress: number
  goalCopy: string
  stageLabel: string
  icon: string
  plots: GardenPlotViewModel[]
  metrics: GardenMetric[]
}

export interface ClassSceneZoneViewModel {
  id: ClassDisplayZone
  label: string
  specimenCount: number
  bloomingCount: number
  averageScore: number
}

export interface ClassSceneSpecimenViewModel {
  id: string
  source: 'student' | 'group'
  sourceId: number
  zone: ClassDisplayZone
  name: string
  status: string
  icon: string
  score: number
}

export interface FieldVertex {
  x: number
  y: number
}

interface FieldPlantPlacementBase {
  id: string
  source: 'student' | 'group'
  sourceId: number
  name: string
  status: string
  icon: string
  score: number
  progress: number
  sectionId: string
  x: number
  y: number
  showLabel: boolean
}

export interface GroupFieldPlantPlacementViewModel extends FieldPlantPlacementBase {
  zone: GroupTerrainZone
}

export interface ClassFieldPlantPlacementViewModel extends FieldPlantPlacementBase {
  zone: ClassDisplayZone
}

export interface GroupFieldSectionViewModel {
  id: string
  groupId: number
  name: string
  zone: GroupTerrainZone
  score: number
  stageLabel: string
  isSelected: boolean
  corners: [FieldVertex, FieldVertex, FieldVertex, FieldVertex]
  furrowCount: number
  plants: GroupFieldPlantPlacementViewModel[]
}

export interface GroupFieldSceneViewModel {
  title: string
  subtitle: string
  themeLabel: string
  scoreLabel: string
  scoreEntry: 'top-bar'
  selectedGroupId: number | null
  metrics: GardenMetric[]
  sections: GroupFieldSectionViewModel[]
  plants: GroupFieldPlantPlacementViewModel[]
}

export interface ClassFieldSectionViewModel {
  id: string
  zone: ClassDisplayZone
  label: string
  corners: [FieldVertex, FieldVertex, FieldVertex, FieldVertex]
  furrowCount: number
  plantCount: number
}

export interface ClassFieldSceneViewModel {
  title: string
  subtitle: string
  themeLabel: string
  scoreLabel: string
  stageLabel: string
  icon: string
  labelDensity: 'sparse'
  isInteractive: false
  metrics: GardenMetric[]
  sections: ClassFieldSectionViewModel[]
  plants: ClassFieldPlantPlacementViewModel[]
}

export interface ClassDisplayGardenSceneViewModel {
  title: string
  subtitle: string
  themeLabel: string
  scoreLabel: string
  stageLabel: string
  icon: string
  isInteractive: false
  metrics: GardenMetric[]
  zones: ClassSceneZoneViewModel[]
  specimens: ClassSceneSpecimenViewModel[]
  fieldSections: ClassFieldSectionViewModel[]
  plantPlacements: ClassFieldPlantPlacementViewModel[]
}

export interface ClassGardenSummaryViewModel {
  heroName: string
  heroScore: number
  heroStage: GrowthStage
  heroLabel: string
  heroIcon: string
  heroGoalCopy: string
  heroEncouragement: string
  heroProgress: number
  studentBloomingCount: number
  metrics: GardenMetric[]
  spotlightStudent?: GardenCardViewModel
  spotlightGroup?: GardenCardViewModel
}

export interface GardenPageSummaryViewModel {
  heading: string
  subheading: string
  themeLabel: string
  metrics: GardenMetric[]
}

interface GardenThemeMeta {
  sceneTitle: string
  heroTitle: string
  studentUnit: string
  groupUnit: string
  classUnit: string
  actionVerb: string
  maxCopy: string
  wallTitle: string
  wallDescription: string
  groupListDescription: string
  groupSceneTitle: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getThemeMeta(theme: GrowthTheme): GardenThemeMeta {
  if (theme === 'farm') {
    return {
      sceneTitle: '🌻 我的农场',
      heroTitle: '班级丰收花园',
      studentUnit: '小菜畦',
      groupUnit: '合作花圃',
      classUnit: '班级花园',
      actionVerb: '施肥成长',
      maxCopy: '已经丰收啦',
      wallTitle: '我的园地墙',
      wallDescription: '全班同学的植物会一起长满整片花园。',
      groupListDescription: '每个小组都有自己的整块花圃，点进去看整片景观。',
      groupSceneTitle: '小组花圃'
    }
  }

  return {
    sceneTitle: '🌲 成长树林',
    heroTitle: '班级梦想树',
    studentUnit: '小树地块',
    groupUnit: '合作林地',
    classUnit: '班级森林',
    actionVerb: '浇灌成长',
    maxCopy: '已经长成大树啦',
    wallTitle: '我的园地墙',
    wallDescription: '全班同学的植物会一起铺满整片森林地景。',
    groupListDescription: '每个小组都有自己的整块林地，点进去看完整树林。',
    groupSceneTitle: '小组林地'
  }
}

function getGoalCopy(theme: GrowthTheme, score: number, thresholds?: GrowthThresholds): string {
  const pointsToNext = getPointsToNextStage(theme, score, thresholds)
  const nextGoalLabel = getGrowthGoalLabel(theme, score, thresholds)
  const meta = getThemeMeta(theme)

  if (!pointsToNext) {
    return meta.maxCopy
  }

  return `再得 ${pointsToNext} 分就能升级到${nextGoalLabel}`
}

function getEncouragement(theme: GrowthTheme, score: number): string {
  const stage = calculateGrowthStage(theme, score)

  if (theme === 'farm') {
    switch (stage) {
      case 'seed':
        return '刚播下小种子，等你来照顾。'
      case 'sprout':
        return '嫩芽冒头了，继续加油。'
      case 'seedling':
        return '小苗站稳啦，离开花不远了。'
      case 'flower':
        return '已经开花，马上就会迎来丰收。'
      case 'harvest':
        return '今天的努力已经结出成果。'
      default:
        return '花园正在安静成长。'
    }
  }

  switch (stage) {
    case 'seed':
      return '小种子在发力，慢慢长大。'
    case 'bud':
      return '已经冒出新芽，继续向上。'
    case 'sapling':
      return '树苗挺起来了，正在长高。'
    case 'young_tree':
      return '小树越来越稳，马上更茂盛。'
    case 'big_tree':
      return '已经成为班级里的大树啦。'
    default:
      return '小树在慢慢吸收阳光。'
  }
}

function getBadge(rank: number, kind: GardenEntityKind): string {
  if (kind === 'class') return '全班总览'
  if (rank === 0) return '今日主角'
  if (rank === 1) return '发光中'
  if (rank === 2) return '冲刺中'
  return kind === 'group' ? '合作成长' : '稳步成长'
}

function getEmphasis(rank: number): 'spotlight' | 'warm' | 'calm' {
  if (rank === 0) return 'spotlight'
  if (rank <= 2) return 'warm'
  return 'calm'
}

function getCardVariant(rank: number): GardenCardVariant {
  if (rank % 3 === 0) return 'canopy'
  if (rank % 3 === 1) return 'orchard'
  return 'terrace'
}

function getGroupTerrainZone(rank: number): GroupTerrainZone {
  if (rank % 3 === 0) return 'north'
  if (rank % 3 === 1) return 'center'
  return 'south'
}

function getClassDisplayZone(progress: number): ClassDisplayZone {
  if (progress >= 75) return 'back'
  if (progress >= 40) return 'middle'
  return 'front'
}

function toQuadrilateral(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  topInset: number,
  bottomInset: number
): [FieldVertex, FieldVertex, FieldVertex, FieldVertex] {
  return [
    { x: x0 + topInset, y: y0 },
    { x: x1 - topInset, y: y0 },
    { x: x1 - bottomInset, y: y1 },
    { x: x0 + bottomInset, y: y1 }
  ]
}

function getBoundingBox(corners: [FieldVertex, FieldVertex, FieldVertex, FieldVertex]) {
  const xs = corners.map(corner => corner.x)
  const ys = corners.map(corner => corner.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
}

function getGroupSectionCorners(index: number, total: number): [FieldVertex, FieldVertex, FieldVertex, FieldVertex] {
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(total || 1))))
  const rows = Math.max(1, Math.ceil((total || 1) / columns))
  const column = index % columns
  const row = Math.floor(index / columns)
  const cellWidth = 100 / columns
  const cellHeight = 100 / rows
  const x0 = column * cellWidth
  const y0 = row * cellHeight
  const x1 = x0 + cellWidth
  const y1 = y0 + cellHeight
  const topInset = 1.8 + row * 0.6
  const bottomInset = 0.8 + row * 0.3
  return toQuadrilateral(x0, y0, x1, y1, topInset, bottomInset)
}

function getClassSectionCorners(zone: ClassDisplayZone): [FieldVertex, FieldVertex, FieldVertex, FieldVertex] {
  if (zone === 'back') {
    return toQuadrilateral(0, 0, 100, 33.34, 8, 4.5)
  }
  if (zone === 'middle') {
    return toQuadrilateral(0, 33.34, 100, 66.67, 5.5, 2.8)
  }
  return toQuadrilateral(0, 66.67, 100, 100, 3.5, 1.8)
}

function getLevelLabel(theme: GrowthTheme, score: number, thresholds?: GrowthThresholds): string {
  const stage = getGrowthStageInfo(theme, score, thresholds)
  const stageIndex = getGrowthStageConfig(theme, thresholds)
    .findIndex(config => config.name === stage.name)
  return `Lv.${Math.max(stageIndex + 1, 1)} ${stage.label}`
}

function sortByScoreAndName<T extends { id: number; name: string; total_score?: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const scoreDiff = (right.total_score || 0) - (left.total_score || 0)
    if (scoreDiff !== 0) return scoreDiff

    const nameDiff = left.name.localeCompare(right.name, 'zh-Hans-CN')
    if (nameDiff !== 0) return nameDiff

    return left.id - right.id
  })
}

function toGardenPlot(card: GardenCardViewModel): GardenPlotViewModel {
  return {
    id: card.id,
    name: card.name,
    score: card.score,
    icon: card.icon,
    stage: card.stage,
    stageLabel: card.stageLabel,
    note: card.goalCopy,
    plotTone: card.emphasis
  }
}

export function deriveStudentGardenCards(
  students: Student[],
  theme: GrowthTheme
): GardenCardViewModel[] {
  return deriveStudentTabCards(students, theme)
}

export function deriveStudentTabCards(
  students: Student[],
  theme: GrowthTheme
): StudentGardenCardViewModel[] {
  return sortByScoreAndName(students).map((student, index) => {
    const score = student.total_score || 0
    const stage = (student.growth_stage as GrowthStage) || calculateGrowthStage(theme, score)
    const pointsToNext = getPointsToNextStage(theme, score)

    return {
      id: student.id,
      kind: 'student',
      name: student.name,
      title: `${student.name}的${getThemeMeta(theme).studentUnit}`,
      subtitle: student.group_name || '还没有加入小组',
      score,
      stage,
      stageLabel: getGrowthLabel(stage, theme),
      icon: getGrowthIcon(stage, theme),
      progress: getGrowthProgress(theme, score),
      pointsToNext,
      nextGoalLabel: getGrowthGoalLabel(theme, score),
      goalCopy: getGoalCopy(theme, score),
      encouragement: getEncouragement(theme, score),
      badge: getBadge(index, 'student'),
      emphasis: getEmphasis(index),
      levelLabel: getLevelLabel(theme, score),
      scoreLabel: `${score} 分`,
      pointsToUpgrade: pointsToNext,
      currentLevelScore: score,
      variant: getCardVariant(index)
    }
  })
}

export function deriveGroupGardenCards(
  groups: StudentGroup[],
  students: Student[],
  theme: GrowthTheme,
  thresholds: GrowthThresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS
): GardenCardViewModel[] {
  return deriveGroupTabCards(groups, students, theme, thresholds)
}

export function deriveGroupTabCards(
  groups: StudentGroup[],
  students: Student[],
  theme: GrowthTheme,
  thresholds: GrowthThresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS
): GroupGardenCardViewModel[] {
  return sortByScoreAndName(groups).map((group, index) => {
    const members = sortByScoreAndName(
      students.filter(student => student.group_id === group.id)
    )
    const score = group.total_score || 0
    const stageInfo = getGrowthStageInfo(theme, score, thresholds)
    const pointsToNext = getPointsToNextStage(theme, score, thresholds)

    return {
      id: group.id,
      kind: 'group',
      name: group.name,
      title: `${group.name}${theme === 'farm' ? '花圃' : '林地'}`,
      subtitle: members.length ? `${members.length} 位成员共同经营` : '还没有成员加入',
      score,
      stage: stageInfo.name,
      stageLabel: stageInfo.label,
      icon: stageInfo.emoji,
      progress: getGrowthProgress(theme, score, thresholds),
      pointsToNext,
      nextGoalLabel: getGrowthGoalLabel(theme, score, thresholds),
      goalCopy: getGoalCopy(theme, score, thresholds),
      encouragement: members.length ? `领跑成员：${members[0].name}` : '邀请同学加入后会更热闹。',
      badge: getBadge(index, 'group'),
      emphasis: getEmphasis(index),
      memberCount: members.length,
      members: members.map(member => ({
        id: member.id,
        name: member.name,
        score: member.total_score || 0,
        icon: getGrowthIcon(
          (member.growth_stage as GrowthStage) || calculateGrowthStage(theme, member.total_score || 0),
          theme
        )
      })),
      levelLabel: getLevelLabel(theme, score, thresholds),
      scoreLabel: `${score} 分`,
      pointsToUpgrade: pointsToNext,
      nextUpgradeLabel: getGrowthGoalLabel(theme, score, thresholds),
      terrainZone: getGroupTerrainZone(index)
    }
  })
}

export function deriveClassGardenSummary(options: {
  className: string
  students: Student[]
  groups: StudentGroup[]
  stats: StatsOverview | null
  theme: GrowthTheme
  groupThresholds?: GrowthThresholds
}): ClassGardenSummaryViewModel {
  const { className, students, groups, stats, theme, groupThresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS } = options
  const studentCards = deriveStudentGardenCards(students, theme)
  const groupCards = deriveGroupGardenCards(groups, students, theme, groupThresholds)
  const totalStudentScore = students.reduce((sum, student) => sum + (student.total_score || 0), 0)
  const totalGroupScore = groups.reduce((sum, group) => sum + (group.total_score || 0), 0)
  const avgStudentScore = students.length ? totalStudentScore / students.length : 0
  const avgGroupScore = groups.length ? totalGroupScore / groups.length : avgStudentScore * 0.8
  const weeklyMomentum = clamp((stats?.week_plus || 0) - Math.floor((stats?.week_minus || 0) / 2), 0, 120)
  const participationBoost = clamp(
    students.filter(student => (student.total_score || 0) > 0).length * 4,
    0,
    36
  )
  const heroScore = Math.round(
    clamp(avgStudentScore * 0.7 + avgGroupScore * 0.22 + weeklyMomentum * 0.32 + participationBoost, 0, 180)
  )
  const stage = calculateGrowthStage(theme, heroScore)
  const meta = getThemeMeta(theme)
  const studentBloomingCount = students.filter(student => {
    const score = student.total_score || 0
    const currentStage = calculateGrowthStage(theme, score)
    return theme === 'farm'
      ? currentStage === 'flower' || currentStage === 'harvest'
      : currentStage === 'young_tree' || currentStage === 'big_tree'
  }).length

  return {
    heroName: `${className}的${meta.classUnit}`,
    heroScore,
    heroStage: stage,
    heroLabel: getGrowthLabel(stage, theme),
    heroIcon: getGrowthIcon(stage, theme),
    heroGoalCopy: getGoalCopy(theme, heroScore),
    heroEncouragement:
      theme === 'farm'
        ? '这片花园会跟着全班每天一起变得更热闹。'
        : '这片森林会跟着全班每天一起长得更茂盛。',
    heroProgress: getGrowthProgress(theme, heroScore),
    studentBloomingCount,
    metrics: [
      { label: '成长人数', value: `${students.length}`, tone: 'neutral' },
      { label: '本周加分', value: `+${stats?.week_plus || 0}`, tone: 'positive' },
      { label: '活跃小组', value: `${groups.length}`, tone: 'neutral' },
      { label: theme === 'farm' ? '开花人数' : '成树人数', value: `${studentBloomingCount}`, tone: 'positive' }
    ],
    spotlightStudent: studentCards[0],
    spotlightGroup: groupCards[0]
  }
}

export function buildGardenPageSummary(options: {
  className: string
  students: Student[]
  groups: StudentGroup[]
  stats: StatsOverview | null
  theme: GrowthTheme
}): GardenPageSummaryViewModel {
  const { className, students, groups, stats, theme } = options
  const meta = getThemeMeta(theme)
  const plantedCount = students.filter(student => (student.total_score || 0) > 0).length

  return {
    heading: meta.sceneTitle,
    subheading: `${className}的${meta.classUnit}`,
    themeLabel: theme === 'farm' ? '花园模式' : '森林模式',
    metrics: [
      { label: '学生', value: `${students.length}`, tone: 'neutral' },
      { label: '小组', value: `${groups.length}`, tone: 'neutral' },
      { label: '已点亮地块', value: `${plantedCount}`, tone: 'positive' },
      { label: '本周加分', value: `+${stats?.week_plus || 0}`, tone: 'positive' }
    ]
  }
}

export function buildClassGardenWallScene(options: {
  className: string
  students: Student[]
  groups: StudentGroup[]
  theme: GrowthTheme
  stats: StatsOverview | null
}): GardenSceneViewModel {
  const { className, students, groups, theme, stats } = options
  const cards = deriveStudentGardenCards(students, theme)
  const totalScore = students.reduce((sum, student) => sum + (student.total_score || 0), 0)
  const avgScore = students.length ? Math.round(totalScore / students.length) : 0

  return {
    title: getThemeMeta(theme).wallTitle,
    subtitle: `${className}里每位同学都有自己的${getThemeMeta(theme).studentUnit}。`,
    scoreLabel: `全班累计 ${totalScore} 分`,
    progress: getGrowthProgress(theme, avgScore),
    goalCopy: students.length
      ? `${getThemeMeta(theme).wallDescription} 点击学生即可直接评分。`
      : '先添加学生，整片园地墙就会亮起来。',
    stageLabel: students.length ? `${students.length} 块地已解锁` : '等待解锁',
    icon: theme === 'farm' ? '🧺' : '🧭',
    plots: cards.map(toGardenPlot),
    metrics: [
      { label: '学生总数', value: `${students.length}`, tone: 'neutral' },
      { label: '小组总数', value: `${groups.length}`, tone: 'neutral' },
      { label: '本周加分', value: `+${stats?.week_plus || 0}`, tone: 'positive' },
      { label: theme === 'farm' ? '开花地块' : '成树地块', value: `${cards.filter(card => card.progress >= 100).length}`, tone: 'positive' }
    ]
  }
}

export function deriveGroupFieldScene(options: {
  className: string
  groups: StudentGroup[]
  students: Student[]
  theme: GrowthTheme
  selectedGroupId?: number | null
  thresholds?: GrowthThresholds
}): GroupFieldSceneViewModel {
  const {
    className,
    groups,
    students,
    theme,
    selectedGroupId = null,
    thresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS
  } = options
  const cards = deriveGroupTabCards(groups, students, theme, thresholds)
  const resolvedSelectedId = cards.find(card => card.id === selectedGroupId)?.id || cards[0]?.id || null
  const sections = cards.map((card, cardIndex) => {
    const sectionId = `group-field-${card.id}`
    const corners = getGroupSectionCorners(cardIndex, cards.length)
    const bounds = getBoundingBox(corners)
    const members = sortByScoreAndName(students.filter(student => student.group_id === card.id))
    const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(Math.max(members.length, 1)))))
    const rows = Math.max(1, Math.ceil(Math.max(members.length, 1) / cols))
    const usableWidth = bounds.maxX - bounds.minX - 10
    const usableHeight = bounds.maxY - bounds.minY - 10
    const placements: GroupFieldPlantPlacementViewModel[] = members.map((member, memberIndex) => {
      const col = memberIndex % cols
      const row = Math.floor(memberIndex / cols)
      const score = member.total_score || 0
      const stage = getGrowthStageInfo(theme, score)
      const progress = getGrowthProgress(theme, score)
      return {
        id: `group-plant-${card.id}-${member.id}`,
        source: 'student',
        sourceId: member.id,
        zone: card.terrainZone,
        sectionId,
        name: member.name,
        status: stage.label,
        icon: stage.emoji,
        score,
        progress,
        x: Number((bounds.minX + 5 + ((col + 0.5) * usableWidth) / cols).toFixed(2)),
        y: Number((bounds.minY + 5 + ((row + 0.55) * usableHeight) / rows).toFixed(2)),
        showLabel: memberIndex < 4 || card.id === resolvedSelectedId
      }
    })
    return {
      id: sectionId,
      groupId: Number(card.id),
      name: card.name,
      zone: card.terrainZone,
      score: card.score,
      stageLabel: card.stageLabel,
      isSelected: card.id === resolvedSelectedId,
      corners,
      furrowCount: Math.max(3, rows + 1),
      plants: placements
    }
  })
  const selectedCard = cards.find(card => card.id === resolvedSelectedId)
  return {
    title: `${className} · ${theme === 'farm' ? '小组合作田' : '小组合作林地'}`,
    subtitle: theme === 'farm'
      ? '整片地景连续展示，每个小组占据一个四边形田块。'
      : '整片林地连续展示，每个小组占据一个四边形地块。',
    themeLabel: theme === 'farm' ? '花园模式' : '森林模式',
    scoreLabel: selectedCard ? `${selectedCard.name} ${selectedCard.score} 分` : '暂无小组数据',
    scoreEntry: 'top-bar',
    selectedGroupId: resolvedSelectedId ? Number(resolvedSelectedId) : null,
    metrics: [
      { label: '小组地块', value: `${sections.length}`, tone: 'neutral' },
      { label: '种植植物', value: `${sections.reduce((sum, section) => sum + section.plants.length, 0)}`, tone: 'neutral' },
      { label: '聚焦地块', value: selectedCard?.name || '-', tone: 'positive' },
      { label: '还差升级', value: selectedCard ? `${selectedCard.pointsToUpgrade} 分` : '-', tone: 'positive' }
    ],
    sections,
    plants: sections.flatMap(section => section.plants)
  }
}

export function deriveClassFieldScene(options: {
  className: string
  students: Student[]
  groups: StudentGroup[]
  stats: StatsOverview | null
  theme: GrowthTheme
  groupThresholds?: GrowthThresholds
}): ClassFieldSceneViewModel {
  const {
    className,
    students,
    groups,
    stats,
    theme,
    groupThresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS
  } = options
  const studentCards = deriveStudentTabCards(students, theme)
  const groupCards = deriveGroupTabCards(groups, students, theme, groupThresholds)
  const summary = deriveClassGardenSummary({
    className,
    students,
    groups,
    stats,
    theme,
    groupThresholds
  })
  const rawPlants: ClassFieldPlantPlacementViewModel[] = [
    ...studentCards.map(card => ({
      id: `class-student-${card.id}`,
      source: 'student' as const,
      sourceId: Number(card.id),
      zone: getClassDisplayZone(card.progress),
      sectionId: `class-zone-${getClassDisplayZone(card.progress)}`,
      name: card.name,
      status: card.levelLabel,
      icon: card.icon,
      score: card.score,
      progress: card.progress,
      x: 0,
      y: 0,
      showLabel: false
    })),
    ...groupCards.map(card => ({
      id: `class-group-${card.id}`,
      source: 'group' as const,
      sourceId: Number(card.id),
      zone: getClassDisplayZone(card.progress),
      sectionId: `class-zone-${getClassDisplayZone(card.progress)}`,
      name: card.name,
      status: `${card.levelLabel} · ${card.memberCount}人`,
      icon: card.icon,
      score: card.score,
      progress: card.progress,
      x: 0,
      y: 0,
      showLabel: false
    }))
  ]
  const sortedRawPlants = [...rawPlants].sort((left, right) => right.score - left.score)
  const labelCount = Math.max(5, Math.ceil(sortedRawPlants.length * 0.3))
  const labelIds = new Set(sortedRawPlants.slice(0, labelCount).map(item => item.id))
  const sections = (['back', 'middle', 'front'] as ClassDisplayZone[]).map((zone) => {
    const zonePlants = sortedRawPlants.filter(plant => plant.zone === zone)
    const corners = getClassSectionCorners(zone)
    const bounds = getBoundingBox(corners)
    const cols = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(Math.max(zonePlants.length, 1)))))
    const rows = Math.max(1, Math.ceil(Math.max(zonePlants.length, 1) / cols))
    const usableWidth = bounds.maxX - bounds.minX - 8
    const usableHeight = bounds.maxY - bounds.minY - 8
    zonePlants.forEach((plant, plantIndex) => {
      const col = plantIndex % cols
      const row = Math.floor(plantIndex / cols)
      plant.x = Number((bounds.minX + 4 + ((col + 0.5) * usableWidth) / cols).toFixed(2))
      plant.y = Number((bounds.minY + 4 + ((row + 0.55) * usableHeight) / rows).toFixed(2))
      plant.sectionId = `class-zone-${zone}`
      plant.showLabel = labelIds.has(plant.id)
    })
    return {
      id: `class-zone-${zone}`,
      zone,
      label: theme === 'farm'
        ? (zone === 'back' ? '晨光畦' : zone === 'middle' ? '向阳田' : '丰收坡')
        : (zone === 'back' ? '林缘带' : zone === 'middle' ? '林心带' : '冠层带'),
      corners,
      furrowCount: Math.max(4, rows + 2),
      plantCount: zonePlants.length
    }
  })
  return {
    title: `${className} · ${theme === 'farm' ? '班级总田景' : '班级总林景'}`,
    subtitle: theme === 'farm'
      ? '整片四边形农田仅用于展示班级成长，不承载评分操作。'
      : '整片四边形林地仅用于展示班级成长，不承载评分操作。',
    themeLabel: theme === 'farm' ? '花园模式' : '森林模式',
    scoreLabel: `班级成长值 ${summary.heroScore}`,
    stageLabel: summary.heroLabel,
    icon: summary.heroIcon,
    labelDensity: 'sparse',
    isInteractive: false,
    metrics: [
      { label: '学生植物', value: `${studentCards.length}`, tone: 'neutral' },
      { label: '小组植物', value: `${groupCards.length}`, tone: 'neutral' },
      { label: '本周加分', value: `+${stats?.week_plus || 0}`, tone: 'positive' },
      { label: '显示标签', value: `${labelIds.size}`, tone: 'positive' }
    ],
    sections,
    plants: sortedRawPlants
  }
}

export function deriveClassDisplayScene(options: {
  className: string
  students: Student[]
  groups: StudentGroup[]
  stats: StatsOverview | null
  theme: GrowthTheme
  groupThresholds?: GrowthThresholds
}): ClassDisplayGardenSceneViewModel {
  const {
    className,
    students,
    groups,
    stats,
    theme,
    groupThresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS
  } = options
  const classSummary = deriveClassGardenSummary({
    className,
    students,
    groups,
    stats,
    theme,
    groupThresholds
  })
  const fieldScene = deriveClassFieldScene({
    className,
    students,
    groups,
    stats,
    theme,
    groupThresholds
  })
  const specimens: ClassSceneSpecimenViewModel[] = fieldScene.plants.map(plant => ({
    id: plant.id,
    source: plant.source,
    sourceId: plant.sourceId,
    zone: plant.zone,
    name: plant.name,
    status: plant.status,
    icon: plant.icon,
    score: plant.score
  }))
  const zones: ClassSceneZoneViewModel[] = fieldScene.sections.map(section => {
    const zoneItems = fieldScene.plants.filter(plant => plant.zone === section.zone)
    const total = zoneItems.reduce((sum, plant) => sum + plant.score, 0)
    return {
      id: section.zone,
      label: section.label,
      specimenCount: zoneItems.length,
      bloomingCount: zoneItems.filter(plant => plant.progress >= 100).length,
      averageScore: zoneItems.length ? Math.round(total / zoneItems.length) : 0
    }
  })
  const studentCards = deriveStudentTabCards(students, theme)
  const groupCards = deriveGroupTabCards(groups, students, theme, groupThresholds)

  return {
    title: `${className} · ${theme === 'farm' ? '班级花园全景' : '班级森林全景'}`,
    subtitle: theme === 'farm'
      ? '整片土地仅用于展示班级成长状态，不承载评分交互。'
      : '整片林地仅用于展示班级成长状态，不承载评分交互。',
    themeLabel: theme === 'farm' ? '花园模式' : '森林模式',
    scoreLabel: `班级成长值 ${classSummary.heroScore}`,
    stageLabel: classSummary.heroLabel,
    icon: classSummary.heroIcon,
    isInteractive: false,
    metrics: [
      { label: '学生植物', value: `${studentCards.length}`, tone: 'neutral' },
      { label: '小组地块', value: `${groupCards.length}`, tone: 'neutral' },
      { label: '本周加分', value: `+${stats?.week_plus || 0}`, tone: 'positive' },
      { label: '已成熟', value: `${zones.reduce((sum, zone) => sum + zone.bloomingCount, 0)}`, tone: 'positive' }
    ],
    zones,
    specimens,
    fieldSections: fieldScene.sections,
    plantPlacements: fieldScene.plants
  }
}

export function buildGroupGardenScene(options: {
  group: StudentGroup | null
  students: Student[]
  theme: GrowthTheme
  thresholds?: GrowthThresholds
}): GardenSceneViewModel | null {
  const { group, students, theme, thresholds = DEFAULT_GROUP_GROWTH_THRESHOLDS } = options
  if (!group) return null

  const memberCards = deriveStudentGardenCards(
    students.filter(student => student.group_id === group.id),
    theme
  )
  const score = group.total_score || 0
  const progress = getGrowthProgress(theme, score, thresholds)

  return {
    title: `${group.name}${theme === 'farm' ? '的花圃' : '的林地'}`,
    subtitle: memberCards.length
      ? `${memberCards.length} 位同学共同经营这片${getThemeMeta(theme).groupUnit}。`
      : '还没有成员加入这片小组园地。',
    scoreLabel: `小组累计 ${score} 分`,
    progress,
    goalCopy: getGoalCopy(theme, score, thresholds),
    stageLabel: getGrowthLabel(calculateGrowthStage(theme, score, thresholds), theme),
    icon: getGrowthIcon(calculateGrowthStage(theme, score, thresholds), theme),
    plots: memberCards.map(toGardenPlot),
    metrics: [
      { label: '成员人数', value: `${memberCards.length}`, tone: 'neutral' },
      { label: '小组积分', value: `${score}`, tone: 'positive' },
      { label: '成长阶段', value: getGrowthLabel(calculateGrowthStage(theme, score, thresholds), theme), tone: 'neutral' },
      { label: '下一级目标', value: `${getPointsToNextStage(theme, score, thresholds)} 分`, tone: 'positive' }
    ]
  }
}

export function getGardenThemeMeta(theme: GrowthTheme) {
  return getThemeMeta(theme)
}
