<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getClass, updateClass } from '@/api/classes'
import { getGroups, scoreGroup } from '@/api/group'
import { getStatsOverview } from '@/api/stats'
import { getScoreItems, getStudents, scoreStudent } from '@/api/student'
import type { Class, ScoreItem, StatsOverview, Student, StudentGroup } from '@/types'
import {
  DEFAULT_GROUP_GROWTH_THRESHOLDS,
  getGrowthGoalLabel,
  getGrowthIcon,
  getGrowthProgress,
  getGrowthStageConfig,
  getGrowthStageInfo,
  getPointsToNextStage,
  normalizeGrowthThresholds,
  type GrowthStage,
  type GrowthTheme
} from '@/utils/growth'
import FertilizerEffect from '@/components/FertilizerEffect.vue'
import GrowthCelebration from '@/components/GrowthCelebration.vue'
import GroupScoreDialog from '@/components/GroupScoreDialog.vue'
import ScoreDialog from '@/components/ScoreDialog.vue'

type GardenTab = 'students' | 'groups' | 'class'
type CardTone = 'ridge' | 'meadow' | 'grove'

interface StatChip {
  label: string
  value: string
  tone?: 'positive' | 'neutral' | 'warning'
}

interface StudentCardViewModel {
  id: number
  name: string
  score: number
  icon: string
  stageLabel: string
  levelLabel: string
  progress: number
  pointsToNext: number
  nextGoalLabel: string
  upgradeCopy: string
  progressCopy: string
  groupName: string
  tone: CardTone
  highlight: string
}

interface GroupPlantViewModel {
  id: number
  name: string
  score: number
  icon: string
  stage: GrowthStage
  stageLabel: string
  statusCopy: string
}

interface GroupCardViewModel {
  id: number
  name: string
  score: number
  icon: string
  stageLabel: string
  levelLabel: string
  progress: number
  pointsToNext: number
  nextGoalLabel: string
  upgradeCopy: string
  memberCount: number
  subtitle: string
  tone: CardTone
  plants: GroupPlantViewModel[]
}

interface FieldPlantViewModel {
  id: number | string
  name: string
  score: number
  icon: string
  stage: GrowthStage
  stageLabel: string
  statusCopy: string
  showLabel: boolean
  featured?: boolean
  placeholder?: boolean
}

interface FieldPlotViewModel {
  id: number | string
  name: string
  subtitle: string
  score: number
  scoreLabel: string
  note: string
  tone: CardTone
  rows: FieldPlantViewModel[][]
}

const route = useRoute()
const router = useRouter()

const classId = computed(() => Number(route.params.classId))

const cls = ref<Class | null>(null)
const students = ref<Student[]>([])
const groups = ref<StudentGroup[]>([])
const stats = ref<StatsOverview | null>(null)
const studentScoreItems = ref<ScoreItem[]>([])
const groupScoreItems = ref<ScoreItem[]>([])

const classTheme = ref<GrowthTheme>('farm')
const activeTab = ref<GardenTab>('students')
const selectedGroupId = ref<number | null>(null)

const loading = ref(false)
const themeSaving = ref(false)
const error = ref('')

const selectedStudent = ref<Student | null>(null)
const selectedGroup = ref<StudentGroup | null>(null)
const showStudentScoreDialog = ref(false)
const showGroupScoreDialog = ref(false)

const showFertilizer = ref(false)
const showCelebration = ref(false)
const lastScoreDelta = ref(0)
const lastFromStage = ref('')
const lastToStage = ref('')
const lastScoredStudentId = ref<number | null>(null)
const lastScoreBefore = ref(0)

function sortByScoreAndName<T extends { id: number; name: string; total_score?: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const scoreDiff = (right.total_score || 0) - (left.total_score || 0)
    if (scoreDiff !== 0) return scoreDiff

    const nameDiff = left.name.localeCompare(right.name, 'zh-Hans-CN')
    if (nameDiff !== 0) return nameDiff

    return left.id - right.id
  })
}

function getGroupThresholds(classRecord: Class | null): number[] {
  const raw = classRecord?.group_growth_thresholds
  if (!raw || raw.length !== 5) {
    return [...DEFAULT_GROUP_GROWTH_THRESHOLDS]
  }

  try {
    return normalizeGrowthThresholds(raw)
  } catch {
    return [...DEFAULT_GROUP_GROWTH_THRESHOLDS]
  }
}

function getLevelLabel(theme: GrowthTheme, stage: GrowthStage, thresholds?: number[]): string {
  const stages = getGrowthStageConfig(theme, thresholds)
  const level = stages.findIndex(item => item.name === stage) + 1
  return `Lv.${Math.max(level, 1)}`
}

function getCardTone(index: number): CardTone {
  return (['ridge', 'meadow', 'grove'] as CardTone[])[index % 3]
}

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function getClassFieldColumns(total: number): number {
  if (total >= 54) return 10
  if (total >= 36) return 9
  if (total >= 24) return 8
  if (total >= 12) return 7
  return 6
}

function getPlaceholderStage(theme: GrowthTheme): GrowthStage {
  return theme === 'tree' ? 'bud' : 'sprout'
}

function createFieldPlant(options: {
  id: number | string
  name: string
  score: number
  stage: GrowthStage
  stageLabel: string
  statusCopy: string
  showLabel: boolean
  placeholder?: boolean
  featured?: boolean
  salt?: number
}): FieldPlantViewModel {
  return {
    id: options.id,
    name: options.name,
    score: options.score,
    icon: getGrowthIcon(options.stage, classTheme.value),
    stage: options.stage,
    stageLabel: options.stageLabel,
    statusCopy: options.statusCopy,
    showLabel: options.showLabel,
    featured: options.featured,
    placeholder: options.placeholder
  }
}

function buildFieldRows(
  plants: FieldPlantViewModel[],
  columns: number,
  minimumSlots: number,
  placeholderStatus: string
): FieldPlantViewModel[][] {
  const safeColumns = Math.max(columns, 1)
  const targetSlots = Math.max(
    Math.max(minimumSlots, safeColumns),
    Math.ceil(Math.max(plants.length, 1) / safeColumns) * safeColumns
  )
  const filledPlants = [...plants]

  for (let index = filledPlants.length; index < targetSlots; index += 1) {
    filledPlants.push(createFieldPlant({
      id: `placeholder-${placeholderStatus}-${index}`,
      name: '',
      score: 0,
      stage: getPlaceholderStage(classTheme.value),
      stageLabel: placeholderStatus,
      statusCopy: placeholderStatus,
      showLabel: false,
      salt: index,
      placeholder: true
    }))
  }

  return chunkItems(filledPlants, safeColumns)
}

function getTabFromQuery(raw: unknown): GardenTab {
  if (raw === 'groups' || raw === 'class') {
    return raw
  }
  return 'students'
}

function readHighlightedGroupQuery(): number | null {
  const raw = route.query.highlightGroup ?? route.query.groupId
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
}

function buildQuery(tab: GardenTab, highlightGroup = selectedGroupId.value): Record<string, string> {
  const query: Record<string, string> = {}

  if (tab !== 'students') {
    query.tab = tab
  }

  if (tab === 'groups' && highlightGroup) {
    query.highlightGroup = String(highlightGroup)
  }

  return query
}

function syncStateFromRoute() {
  activeTab.value = getTabFromQuery(route.query.tab)

  const highlightGroup = readHighlightedGroupQuery()
  if (highlightGroup) {
    selectedGroupId.value = highlightGroup
  }
}

const themeCopy = computed(() => (
  classTheme.value === 'farm'
    ? {
        label: '花园模式',
        title: '班级成长花园',
        subtitle: '把学生、小组和班级成长都放回一片有土地和季节感的自然场景里。',
        studentLead: '学生列表',
        studentHint: '每张卡都展示姓名、积分、植物状态、当前等级和距离升级还差多少。',
        groupLead: '小组列表',
        groupHint: '上方用于评分，下方是一整片按小组铺开的花园地景，只做展示。',
        classLead: '班级列表',
        classHint: '整页只保留班级主景，不提供评分入口，适合课堂展示。',
        studentUnit: '菜畦',
        groupUnit: '花圃',
        classUnit: '班级花园',
        terrainTitle: '整片合作花园',
        terrainHint: '不同小组在自己的土地里生长，植物标签只保留姓名和当前状态。',
        panoramaTitle: '班级总花园',
        panoramaHint: '从晨雾田到丰收坡，整班植物按成长成熟度向前铺开。',
        bands: ['晨雾田', '向阳圃', '丰收坡']
      }
    : {
        label: '森林模式',
        title: '班级成长森林',
        subtitle: '把学生、小组和班级成长放进一片更真实的森林层次里。',
        studentLead: '学生列表',
        studentHint: '每张卡都展示姓名、积分、植物状态、当前等级和距离升级还差多少。',
        groupLead: '小组列表',
        groupHint: '上方用于评分，下方是一整片按小组铺开的林地景观，只做展示。',
        classLead: '班级列表',
        classHint: '整页只保留班级主景，不提供评分入口，适合课堂展示。',
        studentUnit: '林下地块',
        groupUnit: '林地区',
        classUnit: '班级森林',
        terrainTitle: '整片合作林地',
        terrainHint: '不同小组在自己的林地下生长，植物标签只保留姓名和当前状态。',
        panoramaTitle: '班级总森林',
        panoramaHint: '从林缘到冠层，整班植物按成长成熟度向前铺开。',
        bands: ['林缘带', '林心带', '冠层带']
      }
))

const groupThresholds = computed(() => getGroupThresholds(cls.value))

const sortedStudents = computed(() => sortByScoreAndName(students.value))
const sortedGroups = computed(() => sortByScoreAndName(groups.value))

const studentCards = computed<StudentCardViewModel[]>(() => (
  sortedStudents.value.map((student, index) => {
    const score = student.total_score || 0
    const stageInfo = getGrowthStageInfo(classTheme.value, score)
    const pointsToNext = getPointsToNextStage(classTheme.value, score)

    return {
      id: student.id,
      name: student.name,
      score,
      icon: stageInfo.emoji,
      stageLabel: stageInfo.label,
      levelLabel: getLevelLabel(classTheme.value, stageInfo.name),
      progress: getGrowthProgress(classTheme.value, score),
      pointsToNext,
      nextGoalLabel: getGrowthGoalLabel(classTheme.value, score),
      upgradeCopy: pointsToNext ? `还差 ${pointsToNext} 分升级` : '已进入最高阶段',
      progressCopy: pointsToNext ? `${score} / ${score + pointsToNext}` : `${score} / 满级`,
      groupName: student.group_name || '未加入小组',
      tone: getCardTone(index),
      highlight: index === 0 ? '今日长势最好' : index === 1 ? '成长速度很稳' : index === 2 ? '本周在上升' : '继续培育中'
    }
  })
))

const groupCards = computed<GroupCardViewModel[]>(() => (
  sortedGroups.value.map((group, index) => {
    const score = group.total_score || 0
    const stageInfo = getGrowthStageInfo(classTheme.value, score, groupThresholds.value)
    const pointsToNext = getPointsToNextStage(classTheme.value, score, groupThresholds.value)
    const members = sortByScoreAndName(
      students.value.filter(student => student.group_id === group.id)
    )

    return {
      id: group.id,
      name: group.name,
      score,
      icon: stageInfo.emoji,
      stageLabel: stageInfo.label,
      levelLabel: getLevelLabel(classTheme.value, stageInfo.name, groupThresholds.value),
      progress: getGrowthProgress(classTheme.value, score, groupThresholds.value),
      pointsToNext,
      nextGoalLabel: getGrowthGoalLabel(classTheme.value, score, groupThresholds.value),
      upgradeCopy: pointsToNext ? `还差 ${pointsToNext} 分升级` : '已进入最高阶段',
      memberCount: members.length,
      subtitle: members.length
        ? `${members.length} 位成员，领长势的是 ${members[0].name}`
        : '还没有成员加入这片地景',
      tone: getCardTone(index),
      plants: members.map(member => {
        const memberStageInfo = getGrowthStageInfo(classTheme.value, member.total_score || 0)
        return {
          id: member.id,
          name: member.name,
          score: member.total_score || 0,
          icon: memberStageInfo.emoji,
          stage: memberStageInfo.name,
          stageLabel: memberStageInfo.label,
          statusCopy: `${memberStageInfo.label} · ${member.total_score || 0} 分`
        }
      })
    }
  })
))

const headerMetrics = computed<StatChip[]>(() => {
  const grownCount = students.value.filter(student => (student.total_score || 0) > 0).length
  const completionRate = students.value.length
    ? Math.round((grownCount / students.value.length) * 100)
    : 0
  const weeklyNet = (stats.value?.week_plus || 0) - (stats.value?.week_minus || 0)

  return [
    { label: '学生', value: `${students.value.length}`, tone: 'neutral' },
    { label: '小组', value: `${groups.value.length}`, tone: 'neutral' },
    { label: '本周净增长', value: `${weeklyNet >= 0 ? '+' : ''}${weeklyNet}`, tone: weeklyNet >= 0 ? 'positive' : 'warning' },
    { label: '已点亮', value: `${completionRate}%`, tone: 'positive' }
  ]
})

const panelIntro = computed(() => {
  if (activeTab.value === 'groups') {
    return {
      title: themeCopy.value.groupLead,
      copy: themeCopy.value.groupHint
    }
  }

  if (activeTab.value === 'class') {
    return {
      title: themeCopy.value.classLead,
      copy: themeCopy.value.classHint
    }
  }

  return {
    title: themeCopy.value.studentLead,
    copy: themeCopy.value.studentHint
  }
})

const highlightedGroup = computed(() => (
  groupCards.value.find(group => group.id === selectedGroupId.value) || groupCards.value[0] || null
))

const groupLandscapeMetrics = computed<StatChip[]>(() => {
  if (!highlightedGroup.value) {
    return []
  }

  return [
    { label: '当前聚焦', value: highlightedGroup.value.name, tone: 'neutral' },
    { label: '成员', value: `${highlightedGroup.value.memberCount}`, tone: 'neutral' },
    { label: '阶段', value: highlightedGroup.value.stageLabel, tone: 'positive' },
    { label: '还差', value: highlightedGroup.value.pointsToNext ? `${highlightedGroup.value.pointsToNext} 分` : '已满级', tone: 'positive' }
  ]
})

const groupFieldPlots = computed<FieldPlotViewModel[]>(() => (
  groupCards.value.map((group, index) => ({
    id: group.id,
    name: group.name,
    subtitle: `${group.stageLabel} · ${group.memberCount} 位成员`,
    score: group.score,
    scoreLabel: `${group.score} 分`,
    note: group.upgradeCopy,
    tone: getCardTone(index),
    rows: buildFieldRows(
      group.plants.map((plant, plantIndex) => createFieldPlant({
        id: plant.id,
        name: plant.name,
        score: plant.score,
        stage: plant.stage,
        stageLabel: plant.stageLabel,
        statusCopy: plant.statusCopy,
        showLabel: true,
        featured: plantIndex < 2 || plant.score >= 60,
        salt: index + plantIndex
      })),
      5,
      15,
      '待生长'
    )
  }))
))

const classFieldPlot = computed<FieldPlotViewModel | null>(() => {
  if (!sortedStudents.value.length) {
    return null
  }

  const plants = sortedStudents.value.map((student, index) => {
    const score = student.total_score || 0
    const stageInfo = getGrowthStageInfo(classTheme.value, score)

    return createFieldPlant({
      id: `class-${student.id}`,
      name: student.name,
      score,
      stage: stageInfo.name,
      stageLabel: stageInfo.label,
      statusCopy: `${stageInfo.label} · ${score} 分`,
      showLabel: false,
      featured: index < 3 || score >= 60,
      salt: index
    })
  })

  const columns = getClassFieldColumns(plants.length)
  const totalScore = plants.reduce((sum, plant) => sum + plant.score, 0)

  return {
    id: 'class-overview',
    name: classTheme.value === 'farm' ? '全班共享菜地' : '全班共享林地',
    subtitle: `${plants.length} 株植物`,
    score: totalScore,
    scoreLabel: `${totalScore} 分`,
    note: '不再按小组切分，悬浮查看每株植物属于谁。',
    tone: 'ridge',
    rows: buildFieldRows(plants, columns, Math.max(columns * 3, 18), '待生长')
  }
})

async function loadData() {
  if (!classId.value) return

  loading.value = true
  error.value = ''

  try {
    const [classRecord, studentList, groupList, studentItems, groupItems, overview] = await Promise.all([
      getClass(classId.value),
      getStudents(classId.value),
      getGroups(classId.value),
      getScoreItems(classId.value, { targetType: 'student' }),
      getScoreItems(classId.value, { targetType: 'group' }),
      getStatsOverview(classId.value)
    ])

    cls.value = classRecord
    classTheme.value = classRecord.visual_theme === 'tree' ? 'tree' : 'farm'
    students.value = studentList
    groups.value = groupList
    studentScoreItems.value = studentItems
    groupScoreItems.value = groupItems
    stats.value = overview

    const routeHighlight = readHighlightedGroupQuery()
    const preservedHighlight = groupList.find(group => group.id === selectedGroupId.value)?.id || null
    const rankedDefault = sortByScoreAndName(groupList)[0]?.id || null

    selectedGroupId.value =
      groupList.find(group => group.id === routeHighlight)?.id ||
      preservedHighlight ||
      rankedDefault
  } catch (e: any) {
    error.value = e.response?.data?.detail || '花园加载失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.classId,
  () => {
    void loadData()
  },
  { immediate: true }
)

watch(
  () => [route.query.tab, route.query.highlightGroup, route.query.groupId],
  () => {
    syncStateFromRoute()
  },
  { immediate: true }
)

function switchTab(tab: GardenTab) {
  activeTab.value = tab
  void router.replace({
    path: route.path,
    query: buildQuery(tab)
  })
}

function highlightGroup(groupId: number, syncRoute = false) {
  selectedGroupId.value = groupId

  if (syncRoute && activeTab.value === 'groups') {
    void router.replace({
      path: route.path,
      query: buildQuery('groups', groupId)
    })
  }
}

function openStudentDialog(studentId: number) {
  const student = students.value.find(item => item.id === studentId)
  if (!student) return

  selectedStudent.value = student
  showStudentScoreDialog.value = true
}

function openGroupDialog(groupId: number) {
  const group = groups.value.find(item => item.id === groupId)
  if (!group) return

  highlightGroup(groupId, true)
  selectedGroup.value = group
  showGroupScoreDialog.value = true
}

async function handleThemeChange(theme: GrowthTheme) {
  if (!classId.value || themeSaving.value || classTheme.value === theme) return

  themeSaving.value = true
  error.value = ''

  try {
    const updatedClass = await updateClass(classId.value, { visual_theme: theme })
    cls.value = updatedClass
    classTheme.value = updatedClass.visual_theme === 'tree' ? 'tree' : 'farm'
  } catch (e: any) {
    error.value = e.response?.data?.detail || '主题切换失败'
  } finally {
    themeSaving.value = false
  }
}

async function handleStudentScoreSubmit(data: { score_item_id: number | null; score_delta: number; remark: string }) {
  if (!selectedStudent.value || !data.score_item_id) return

  showStudentScoreDialog.value = false
  lastScoredStudentId.value = selectedStudent.value.id
  lastScoreBefore.value = selectedStudent.value.total_score || 0
  lastScoreDelta.value = data.score_delta
  showFertilizer.value = true

  try {
    await scoreStudent(selectedStudent.value.id, {
      score_item_id: data.score_item_id,
      remark: data.remark
    })
    await loadData()
  } catch (e: any) {
    showFertilizer.value = false
    error.value = e.response?.data?.detail || '学生评分失败'
  }
}

async function handleGroupScoreSubmit(data: { score_item_id: number | null; score_delta: number; remark: string }) {
  if (!selectedGroup.value || !data.score_item_id) return

  showGroupScoreDialog.value = false

  try {
    await scoreGroup(selectedGroup.value.id, {
      score_item_id: data.score_item_id,
      remark: data.remark
    })
    await loadData()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '小组评分失败'
  }
}

function onFertilizerComplete() {
  showFertilizer.value = false

  const scoredStudent = students.value.find(student => student.id === lastScoredStudentId.value)
  if (!scoredStudent) return

  const oldStage = getGrowthStageInfo(classTheme.value, lastScoreBefore.value).name
  const newStage = getGrowthStageInfo(classTheme.value, scoredStudent.total_score || 0).name

  if (oldStage !== newStage) {
    lastFromStage.value = oldStage
    lastToStage.value = newStage
    showCelebration.value = true
  }
}

function onCelebrationComplete() {
  showCelebration.value = false
}
</script>

<template>
  <div :class="['garden-redesign', `theme-${classTheme}`]" :data-active-tab="activeTab">
    <header class="garden-shell-header">
      <button type="button" class="page-back-button back-btn" @click="router.push(`/class/${classId}`)">
        返回班级
      </button>

      <div class="header-copy">
        <span class="header-kicker">{{ themeCopy.label }}</span>
        <h1>{{ themeCopy.title }}</h1>
        <p>{{ themeCopy.subtitle }}</p>
      </div>

      <div class="header-actions">
        <div class="theme-switcher" role="group" aria-label="花园主题切换">
          <button
            type="button"
            :class="['theme-pill', { active: classTheme === 'farm' }]"
            :disabled="themeSaving"
            @click="handleThemeChange('farm')"
          >
            花园
          </button>
          <button
            type="button"
            :class="['theme-pill', { active: classTheme === 'tree' }]"
            :disabled="themeSaving"
            @click="handleThemeChange('tree')"
          >
            森林
          </button>
        </div>
      </div>
    </header>

    <div v-if="loading" class="ui-loading-state ui-soft-panel loading-panel">
      <span class="ui-loading-spinner" aria-hidden="true"></span>
      <p class="ui-loading-title">成长场景加载中...</p>
      <p class="ui-loading-copy">正在整理学生卡片、小组地景和班级总景。</p>
    </div>

    <main v-else class="garden-shell">
      <section class="overview-ribbon">
        <div class="overview-copy">
          <span class="overview-kicker">{{ cls?.name || '班级' }}</span>
          <h2>{{ panelIntro.title }}</h2>
          <p>{{ panelIntro.copy }}</p>
        </div>

        <div class="overview-stats">
          <article
            v-for="metric in headerMetrics"
            :key="metric.label"
            :class="['stat-chip', metric.tone || 'neutral']"
          >
            <span class="stat-label">{{ metric.label }}</span>
            <strong class="stat-value">{{ metric.value }}</strong>
          </article>
        </div>
      </section>

      <nav class="garden-tabs" aria-label="Garden Tabs">
        <button
          type="button"
          :class="['garden-tab', { active: activeTab === 'students' }]"
          @click="switchTab('students')"
        >
          学生列表
        </button>
        <button
          type="button"
          :class="['garden-tab', { active: activeTab === 'groups' }]"
          @click="switchTab('groups')"
        >
          小组列表
        </button>
        <button
          type="button"
          :class="['garden-tab', { active: activeTab === 'class' }]"
          @click="switchTab('class')"
        >
          班级列表
        </button>
      </nav>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <section v-if="activeTab === 'students'" class="garden-tab-panel students-panel">
        <header class="panel-header">
          <div>
            <h3>学生成长卡片</h3>
            <p>点击任意卡片即可按照自定义积分项目加分或减分。</p>
          </div>
          <span class="panel-meta">{{ studentCards.length }} 张卡片</span>
        </header>

        <div v-if="studentCards.length" class="student-gallery student-list-grid">
          <button
            v-for="(card, index) in studentCards"
            :key="card.id"
            type="button"
            :class="['student-growth-card', 'student-list-card', `tone-${card.tone}`]"
            :style="{ animationDelay: `${index * 36}ms` }"
            @click="openStudentDialog(card.id)"
          >
            <div class="card-topline">
              <span class="card-chip">{{ card.highlight }}</span>
              <span class="card-score">{{ card.score }} 分</span>
            </div>

            <div class="student-card-hero">
              <div class="plant-medallion">
                <span class="plant-icon">{{ card.icon }}</span>
                <span class="plant-stage">{{ card.stageLabel }}</span>
              </div>
              <div class="student-copy">
                <h4>{{ card.name }}</h4>
                <p>{{ card.groupName }}</p>
              </div>
            </div>

            <dl class="detail-grid">
              <div>
                <dt>当前等级</dt>
                <dd>{{ card.levelLabel }}</dd>
              </div>
              <div>
                <dt>当前状态</dt>
                <dd>{{ card.stageLabel }}</dd>
              </div>
              <div>
                <dt>距离升级</dt>
                <dd>{{ card.pointsToNext ? `${card.pointsToNext} 分` : '已满级' }}</dd>
              </div>
              <div>
                <dt>当前分数</dt>
                <dd>{{ card.progressCopy }}</dd>
              </div>
            </dl>

            <div class="card-progress">
              <div class="card-progress-fill" :style="{ width: `${card.progress}%` }"></div>
            </div>

            <div class="card-foot">
              <span>{{ card.upgradeCopy }}</span>
              <span class="card-action">点击按项目加减分</span>
            </div>
          </button>
        </div>

        <div v-else class="ui-empty-state ui-soft-panel empty-panel" data-empty-icon="🌱">
          <p class="ui-empty-title">还没有学生成长卡片</p>
          <p class="ui-empty-copy">先添加学生，学生列表会自动生成成长卡片。</p>
        </div>
      </section>

      <section v-else-if="activeTab === 'groups'" class="garden-tab-panel groups-panel">
        <header class="panel-header">
          <div>
            <h3>小组整片农田</h3>
            <p>小组切换和评分放在顶部控制条，主画面是一整块连续田地，不再拆成卡片。</p>
          </div>
          <span class="panel-meta">{{ groupFieldPlots.length }} 块田地</span>
        </header>

        <div v-if="groupFieldPlots.length" class="group-layout">
          <section class="group-toolbar">
            <div class="group-toolbar-main">
              <div class="group-toolbar-copy">
                <span class="group-toolbar-kicker">小组控制条</span>
                <h4>{{ highlightedGroup?.name || '选择一个小组' }}</h4>
                <p>
                  {{
                    highlightedGroup
                      ? `${highlightedGroup.stageLabel} · ${highlightedGroup.score} 分 · ${highlightedGroup.memberCount} 位成员`
                      : '切换上方小组后，可从这里直接评分。'
                  }}
                </p>
              </div>

              <div class="group-toolbar-actions">
                <button
                  v-for="group in groupCards"
                  :key="group.id"
                  type="button"
                  :class="['group-selector-pill', { active: group.id === selectedGroupId }]"
                  @click="highlightGroup(group.id, true)"
                >
                  {{ group.name }}
                </button>

                <button
                  type="button"
                  class="group-score-trigger"
                  :disabled="!highlightedGroup"
                  @click="highlightedGroup && openGroupDialog(highlightedGroup.id)"
                >
                  给当前小组评分
                </button>
              </div>
            </div>

            <div v-if="highlightedGroup" class="group-toolbar-metrics">
              <span
                v-for="metric in groupLandscapeMetrics"
                :key="metric.label"
                :class="['landscape-chip', metric.tone || 'neutral']"
              >
                {{ metric.label }}：{{ metric.value }}
              </span>
            </div>
          </section>

          <section class="group-landscape-panel">
            <div class="group-landscape group-field-estate group-farm-scene group-continuous-field group-continuous-farm">
              <div class="field-mosaic-board group-farm-estate group-field-grid">
                <article
                  v-for="plot in groupFieldPlots"
                  :key="plot.id"
                  :class="['field-plot-card', 'group-plot-card', `tone-${plot.tone}`, { selected: plot.id === selectedGroupId }]"
                  @click="highlightGroup(Number(plot.id), true)"
                >
                  <header class="field-plot-head">
                    <strong>{{ plot.name }}</strong>
                    <span>{{ plot.scoreLabel }}</span>
                  </header>

                  <div class="field-card-grid" :style="{ '--field-columns': String(plot.rows[0]?.length || 5) }">
                    <template v-for="(row, rowIndex) in plot.rows" :key="`${plot.id}-${rowIndex}`">
                      <div
                        v-for="plant in row"
                        :key="plant.id"
                        :class="['field-soil-card', `stage-${plant.stage}`, { placeholder: plant.placeholder, featured: plant.featured }]"
                      >
                        <div class="field-soil-ridges" aria-hidden="true"></div>
                        <span v-if="!plant.placeholder" class="field-plant-emoji" aria-hidden="true">
                          {{ plant.icon }}
                        </span>

                        <div v-if="!plant.placeholder" class="field-hover-tooltip">
                          <strong>{{ plant.name }}</strong>
                          <span>{{ plot.name }} · {{ plant.stageLabel }}</span>
                        </div>
                      </div>
                    </template>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="ui-empty-state ui-soft-panel empty-panel" data-empty-icon="👥">
          <p class="ui-empty-title">还没有小组田地</p>
          <p class="ui-empty-copy">先创建小组，整片小组农田才会被点亮。</p>
        </div>
      </section>

      <section v-else class="garden-tab-panel class-panel">
        <header class="panel-header class-panel-header">
          <div>
            <h3>{{ themeCopy.panoramaTitle }}</h3>
            <p>班级页只保留一整块田地，所有学生植物都种在一起，悬浮时再显示归属。</p>
          </div>
          <span class="panel-meta class-no-score">纯展示场景，不提供评分入口</span>
        </header>

        <section v-if="classFieldPlot" class="class-panorama">
          <div class="class-estate class-farm-scene class-continuous-field class-continuous-farm class-farm-estate class-garden-scene">
            <div class="field-mosaic-board class-farm-estate class-field-grid">
              <article
                :class="['field-plot-card', 'class-plot-card', `tone-${classFieldPlot.tone}`]"
              >
                <header class="field-plot-head class-plot-head">
                  <div class="class-plot-copy">
                    <strong>{{ classFieldPlot.name }}</strong>
                    <span>{{ classFieldPlot.note }}</span>
                  </div>
                  <span class="class-plot-summary">{{ classFieldPlot.subtitle }}</span>
                </header>

                <div class="field-card-grid class-card-grid" :style="{ '--field-columns': String(classFieldPlot.rows[0]?.length || 8) }">
                  <template v-for="(row, rowIndex) in classFieldPlot.rows" :key="`class-overview-${rowIndex}`">
                    <div
                      v-for="plant in row"
                      :key="plant.id"
                      :class="['field-soil-card', 'class-soil-card', `stage-${plant.stage}`, { placeholder: plant.placeholder, featured: plant.featured }]"
                    >
                      <div class="field-soil-ridges" aria-hidden="true"></div>
                      <span v-if="!plant.placeholder" class="field-plant-emoji" aria-hidden="true">
                        {{ plant.icon }}
                      </span>

                      <div v-if="!plant.placeholder" class="field-hover-tooltip">
                        <strong>{{ plant.name }}</strong>
                        <span>{{ plant.stageLabel }} · {{ plant.score }} 分</span>
                      </div>
                    </div>
                  </template>
                </div>
              </article>
            </div>
          </div>
        </section>

        <div v-else class="ui-empty-state ui-soft-panel empty-panel" data-empty-icon="🌱">
          <p class="ui-empty-title">班级总景还没有植物</p>
          <p class="ui-empty-copy">先添加学生后，班级花园会变成整片可展示的田地。</p>
        </div>
      </section>
    </main>

    <ScoreDialog
      :visible="showStudentScoreDialog"
      :student="selectedStudent"
      :score-items="studentScoreItems"
      :theme="classTheme"
      @close="showStudentScoreDialog = false"
      @submit="handleStudentScoreSubmit"
    />

    <GroupScoreDialog
      :visible="showGroupScoreDialog"
      :group="selectedGroup"
      :score-items="groupScoreItems"
      @close="showGroupScoreDialog = false"
      @submit="handleGroupScoreSubmit"
    />

    <FertilizerEffect
      v-if="showFertilizer"
      :delta="lastScoreDelta"
      :theme="classTheme"
      @complete="onFertilizerComplete"
    />

    <GrowthCelebration
      v-if="showCelebration"
      :from-stage="lastFromStage"
      :to-stage="lastToStage"
      :theme="classTheme"
      @complete="onCelebrationComplete"
    />
  </div>
</template>

<style scoped>
.garden-redesign {
  min-height: 100dvh;
  padding: clamp(18px, 2vw, 32px);
  background:
    radial-gradient(circle at 15% 12%, rgba(255, 255, 255, 0.78), transparent 32%),
    radial-gradient(circle at 82% 10%, rgba(255, 244, 218, 0.46), transparent 26%),
    linear-gradient(180deg, #eef6f0 0%, #eef5e4 28%, #e5edd5 58%, #d8e1c4 100%);
  color: var(--brown-600);
}

.garden-redesign.theme-tree {
  background:
    radial-gradient(circle at 16% 10%, rgba(255, 255, 255, 0.72), transparent 30%),
    radial-gradient(circle at 85% 14%, rgba(228, 247, 238, 0.52), transparent 24%),
    linear-gradient(180deg, #edf6f7 0%, #edf4ed 28%, #dde9db 58%, #d0ddcf 100%);
}

.garden-shell-header,
.overview-ribbon,
.garden-tabs,
.garden-tab-panel {
  width: min(1320px, 100%);
  margin-inline: auto;
}

.garden-shell-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: start;
  margin-bottom: 20px;
}

.back-btn {
  margin-top: 4px;
}

.header-copy {
  display: grid;
  gap: 6px;
}

.header-kicker,
.overview-kicker,
.panorama-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 251, 244, 0.82);
  border: 1px solid rgba(215, 196, 173, 0.72);
  color: var(--brown-400);
  font-size: 0.84rem;
  letter-spacing: 0.08em;
}

.header-copy p,
.overview-copy p,
.panel-header p,
.panorama-summary-main p {
  margin: 0;
  max-width: 64ch;
  color: color-mix(in srgb, var(--brown-600) 78%, white 22%);
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.theme-switcher {
  display: inline-flex;
  gap: 10px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(255, 253, 248, 0.76);
  border: 1px solid rgba(218, 206, 190, 0.9);
  box-shadow: var(--shadow-sm);
}

.theme-pill {
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  background: transparent;
  color: var(--brown-400);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--duration-normal) var(--ease-out), background var(--duration-normal) var(--ease-out), color var(--duration-normal) var(--ease-out);
}

.theme-pill.active {
  background: linear-gradient(135deg, rgba(255, 249, 235, 0.96), rgba(247, 238, 214, 0.88));
  color: var(--forest-700);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 88, 51, 0.12);
}

.loading-panel {
  width: min(920px, 100%);
  margin: 42px auto 0;
}

.garden-shell {
  display: grid;
  gap: 18px;
}

.overview-ribbon {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 18px;
  padding: clamp(20px, 2.2vw, 30px);
  border-radius: 32px;
  background:
    linear-gradient(135deg, rgba(255, 251, 243, 0.92), rgba(243, 239, 229, 0.86)),
    radial-gradient(circle at top right, rgba(246, 228, 190, 0.26), transparent 34%);
  border: 1px solid rgba(220, 211, 197, 0.92);
  box-shadow: 0 24px 60px rgba(97, 84, 58, 0.12);
}

.garden-redesign[data-active-tab='groups'] .overview-ribbon,
.garden-redesign[data-active-tab='class'] .overview-ribbon {
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  align-items: center;
  padding: 18px 22px;
}

.overview-copy {
  display: grid;
  gap: 10px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
}

.stat-chip,
.landscape-chip {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(227, 220, 209, 0.88);
}

.stat-chip.positive,
.landscape-chip.positive {
  background: rgba(235, 246, 234, 0.92);
}

.stat-chip.warning,
.landscape-chip.warning {
  background: rgba(249, 235, 227, 0.92);
}

.stat-label {
  font-size: 0.82rem;
  color: var(--brown-400);
}

.stat-value {
  font-family: var(--font-number);
  font-size: 1.34rem;
  color: var(--forest-700);
}

.garden-tabs {
  display: inline-flex;
  gap: 10px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.82);
  border: 1px solid rgba(226, 217, 205, 0.92);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 12px;
  z-index: 10;
}

.garden-tab {
  border: none;
  padding: 12px 20px;
  border-radius: 999px;
  background: transparent;
  color: var(--brown-400);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--duration-normal) var(--ease-out), background var(--duration-normal) var(--ease-out), color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
}

.garden-tab.active {
  background: linear-gradient(135deg, rgba(255, 248, 236, 0.96), rgba(237, 244, 231, 0.92));
  color: var(--forest-700);
  box-shadow: 0 12px 26px rgba(86, 102, 63, 0.13);
}

.error-banner {
  width: min(1320px, 100%);
  margin: 0 auto;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(244, 223, 220, 0.92);
  border: 1px solid rgba(211, 164, 157, 0.92);
  color: #8e403c;
}

.garden-tab-panel {
  display: grid;
  gap: 18px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
}

.panel-meta {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.88);
  border: 1px solid rgba(223, 214, 200, 0.92);
  color: var(--brown-400);
  white-space: nowrap;
}

.student-gallery,
.group-gallery {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.student-growth-card,
.group-growth-card {
  grid-column: span 4;
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(223, 214, 200, 0.92);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.94), rgba(244, 240, 229, 0.88)),
    radial-gradient(circle at top right, rgba(243, 228, 197, 0.28), transparent 34%);
  box-shadow: 0 22px 54px rgba(97, 84, 58, 0.12);
  text-align: left;
  cursor: pointer;
  animation: float-up 520ms var(--ease-out) both;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out);
}

.student-growth-card:hover,
.student-growth-card:focus-visible,
.group-growth-card:hover,
.group-growth-card:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 28px 66px rgba(75, 78, 57, 0.18);
  border-color: rgba(162, 172, 128, 0.94);
  outline: none;
}

.group-growth-card.selected {
  border-color: rgba(128, 154, 105, 0.98);
  box-shadow: 0 28px 68px rgba(79, 109, 77, 0.2);
}

.tone-ridge {
  background:
    linear-gradient(180deg, rgba(255, 250, 242, 0.96), rgba(247, 242, 228, 0.9)),
    radial-gradient(circle at top right, rgba(247, 228, 194, 0.34), transparent 32%);
}

.tone-meadow {
  background:
    linear-gradient(180deg, rgba(248, 252, 244, 0.96), rgba(239, 245, 232, 0.9)),
    radial-gradient(circle at top right, rgba(215, 232, 194, 0.34), transparent 32%);
}

.tone-grove {
  background:
    linear-gradient(180deg, rgba(246, 251, 250, 0.96), rgba(236, 242, 240, 0.9)),
    radial-gradient(circle at top right, rgba(200, 225, 220, 0.34), transparent 32%);
}

.card-topline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.card-chip,
.field-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(226, 218, 206, 0.92);
  color: var(--brown-400);
  font-size: 0.8rem;
}

.card-score {
  font-family: var(--font-number);
  font-size: 1.1rem;
  color: var(--forest-700);
}

.student-card-hero {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.plant-medallion {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 120px;
  padding: 14px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 22%, rgba(255, 255, 255, 0.84), transparent 48%),
    linear-gradient(180deg, rgba(237, 245, 230, 0.92), rgba(226, 231, 211, 0.94));
  border: 1px solid rgba(216, 222, 204, 0.96);
}

.plant-icon {
  font-size: 2.4rem;
  line-height: 1;
}

.plant-stage {
  font-size: 0.92rem;
  color: var(--brown-400);
}

.student-copy {
  display: grid;
  gap: 6px;
}

.student-copy p {
  color: var(--brown-400);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-grid div {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(230, 223, 211, 0.84);
}

.detail-grid dt {
  font-size: 0.8rem;
  color: var(--brown-400);
}

.detail-grid dd {
  font-weight: 700;
  color: var(--forest-700);
}

.card-progress {
  overflow: hidden;
  height: 12px;
  border-radius: 999px;
  background: rgba(228, 222, 212, 0.82);
}

.card-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8eaa67 0%, #c6b25b 48%, #d89052 100%);
  transition: width 360ms var(--ease-out);
}

.garden-redesign.theme-tree .card-progress-fill {
  background: linear-gradient(90deg, #5a9272 0%, #79a06a 42%, #bd8a5b 100%);
}

.card-foot {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  color: var(--brown-400);
  font-size: 0.92rem;
}

.card-action {
  color: var(--forest-700);
  font-weight: 700;
}

.group-layout {
  display: grid;
  gap: 14px;
}

.group-toolbar {
  display: grid;
  gap: 12px;
  padding: clamp(14px, 1.6vw, 18px);
  border-radius: 26px;
  border: 1px solid rgba(215, 204, 187, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.84), rgba(247, 243, 233, 0.68)),
    radial-gradient(circle at top right, rgba(243, 228, 197, 0.18), transparent 34%);
  box-shadow: 0 14px 34px rgba(97, 84, 58, 0.08);
  backdrop-filter: blur(12px);
}

.group-toolbar-main,
.group-toolbar-actions,
.group-toolbar-copy,
.group-toolbar-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.group-toolbar-main {
  justify-content: space-between;
  align-items: center;
}

.group-toolbar-copy {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.group-toolbar-copy h4,
.group-toolbar-copy p {
  margin: 0;
}

.group-toolbar-kicker {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(226, 218, 206, 0.92);
  color: var(--brown-400);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.group-toolbar-actions {
  align-items: center;
  justify-content: flex-end;
}

.group-selector-pill,
.group-score-trigger {
  border: none;
  min-height: 44px;
  padding: 9px 15px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), background var(--duration-normal) var(--ease-out), color var(--duration-normal) var(--ease-out);
}

.group-selector-pill {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(226, 218, 206, 0.92);
  color: var(--brown-400);
  font-weight: 700;
}

.group-selector-pill.active {
  background: linear-gradient(135deg, rgba(236, 245, 230, 0.96), rgba(251, 243, 220, 0.92));
  color: var(--forest-700);
  box-shadow: 0 12px 24px rgba(93, 112, 74, 0.16);
}

.group-score-trigger {
  background: linear-gradient(135deg, var(--forest-700), color-mix(in srgb, var(--forest-700) 75%, var(--terra-500) 25%));
  color: rgba(255, 251, 244, 0.96);
  font-weight: 700;
  box-shadow: 0 14px 28px rgba(54, 89, 61, 0.22);
}

.group-score-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

.group-selector-pill:hover,
.group-score-trigger:hover:not(:disabled) {
  transform: translateY(-2px);
}

.group-landscape-panel,
.class-panorama {
  padding: clamp(12px, 1.4vw, 16px);
  border-radius: 36px;
  border: 1px solid rgba(216, 203, 178, 0.72);
  background:
    linear-gradient(180deg, rgba(247, 243, 232, 0.76), rgba(235, 228, 206, 0.58)),
    radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.38), transparent 26%);
  box-shadow: 0 18px 42px rgba(102, 83, 52, 0.08);
}

.empty-panel {
  padding: clamp(14px, 1.6vw, 20px);
  border-radius: 30px;
  border: 1px solid rgba(223, 214, 200, 0.84);
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.92), rgba(243, 239, 228, 0.84)),
    radial-gradient(circle at top right, rgba(243, 228, 197, 0.2), transparent 34%);
  box-shadow: 0 18px 46px rgba(97, 84, 58, 0.1);
}

.group-landscape {
  position: relative;
  display: grid;
  gap: 10px;
  padding: 0;
  background: transparent;
  min-height: auto;
}

.garden-redesign.theme-tree .group-landscape {
  background: transparent;
}

.landscape-sky,
.landscape-haze,
.landscape-path,
.panorama-backdrop {
  display: none;
}

.landscape-metrics,
.panorama-summary,
.panorama-band-stack {
  position: relative;
  z-index: 1;
}

.landscape-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.estate-ribbon {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  max-width: min(100%, 760px);
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 250, 242, 0.76);
  border: 1px solid rgba(216, 206, 189, 0.76);
  box-shadow: 0 10px 20px rgba(104, 94, 73, 0.06);
  backdrop-filter: blur(12px);
}

.estate-ribbon span {
  color: var(--brown-400);
}

.farm-board-copy {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.farm-board-copy-main {
  display: grid;
  gap: 6px;
  max-width: 58ch;
}

.farm-board-copy-main strong {
  color: var(--forest-700);
  font-size: 1.05rem;
}

.farm-board-copy-main span {
  color: color-mix(in srgb, var(--brown-600) 76%, white 24%);
  font-size: 0.84rem;
}

.farm-board-badge,
.farm-plot-meta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 250, 241, 0.84);
  border: 1px solid rgba(219, 209, 192, 0.82);
  color: var(--brown-400);
  font-size: 0.78rem;
  box-shadow: 0 8px 18px rgba(97, 85, 64, 0.08);
}

.farm-board-badge {
  white-space: nowrap;
}

.farm-plot-meta {
  padding-inline: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.farm-board-copy-class {
  align-items: center;
}

.estate-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px 16px;
  align-content: start;
}

.estate-plot {
  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 0;
  min-height: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  transition: transform var(--duration-normal) var(--ease-out), filter var(--duration-normal) var(--ease-out), opacity var(--duration-normal) var(--ease-out);
}

.estate-plot.selected,
.estate-plot:hover {
  transform: translateY(-2px);
  filter: saturate(1.04);
}

.class-estate-plot {
  cursor: default;
}

.class-estate-plot:hover {
  transform: none;
  filter: none;
}

.estate-plot-rows {
  display: grid;
  gap: 8px;
  padding-top: 4px;
  align-content: start;
}

.estate-plot-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: stretch;
  justify-items: stretch;
}

.class-estate-rows .estate-plot-row {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.estate-plant {
  position: relative;
  min-height: 112px;
  width: 100%;
  aspect-ratio: 1 / 1.02;
  display: grid;
  justify-items: center;
  align-content: end;
  padding: 0;
  overflow: visible;
  isolation: isolate;
  background: transparent;
}

.estate-plant.placeholder {
  opacity: 0.8;
}

.estate-plant-copy {
  position: absolute;
  inset: 0 4px 10px;
  z-index: 2;
  display: grid;
  justify-items: center;
  align-content: end;
  gap: 4px;
  padding: 0 2px 16px;
  pointer-events: none;
}

.estate-plant-soil {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 70px;
  transform: none;
  border-radius: 18px 18px 10px 10px;
  background:
    linear-gradient(180deg, rgba(255, 232, 205, 0.18), transparent 22%),
    repeating-linear-gradient(90deg, rgba(90, 52, 26, 0.18) 0 8px, rgba(132, 82, 44, 0.04) 8px 16px),
    linear-gradient(180deg, rgba(142, 84, 43, 0.98), rgba(98, 55, 27, 1));
  clip-path: polygon(10% 12%, 100% 12%, 90% 100%, 0 100%);
  box-shadow:
    0 12px 18px rgba(68, 41, 21, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.estate-plant-soil::before,
.estate-plant-soil::after {
  content: '';
  position: absolute;
}

.estate-plant-soil::before {
  inset: 10px 10px 18px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 28% 18%, rgba(255, 248, 238, 0.16), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 40%);
  clip-path: polygon(8% 8%, 100% 8%, 92% 100%, 0 100%);
}

.estate-plant-soil::after {
  inset: auto 8px 0;
  height: 18px;
  background: linear-gradient(180deg, rgba(88, 50, 25, 0.96), rgba(61, 33, 17, 0.98));
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
  border-radius: 0 0 10px 10px;
}

.estate-plant-icon {
  position: relative;
  z-index: 3;
  margin-bottom: 8px;
  font-size: clamp(1.8rem, 1.5rem + 0.7vw, 2.45rem);
  line-height: 1;
  filter: drop-shadow(0 6px 8px rgba(58, 44, 26, 0.22));
}

.estate-plant-name,
.estate-plant-status {
  position: relative;
  z-index: 3;
  display: inline-flex;
  justify-content: center;
  max-width: calc(100% - 10px);
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 250, 243, 0.92);
  color: color-mix(in srgb, var(--brown-600) 88%, white 12%);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 6px 12px rgba(85, 60, 37, 0.08);
}

.estate-plant-name {
  font-size: 0.7rem;
  font-weight: 700;
}

.estate-plant-status {
  font-size: 0.66rem;
  color: color-mix(in srgb, var(--brown-400) 86%, white 14%);
}

.estate-plant.placeholder .estate-plant-icon {
  transform: translateY(24px) scale(0.52);
  opacity: 0;
}

.estate-plant.placeholder .estate-plant-name,
.estate-plant.placeholder .estate-plant-status {
  display: none;
}

.estate-plant.placeholder .estate-plant-soil {
  filter: saturate(0.72) brightness(0.96);
}

.estate-plot-foot {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 251, 243, 0.68);
  border: 1px solid rgba(225, 217, 201, 0.84);
}

.farm-board {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border-radius: 32px;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.28), transparent 16%),
    radial-gradient(circle at 88% 10%, rgba(255, 244, 216, 0.18), transparent 18%),
    linear-gradient(180deg, rgba(188, 222, 157, 0.96), rgba(149, 195, 122, 0.98) 52%, rgba(134, 182, 114, 0.98) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(214, 228, 194, 0.78),
    0 24px 44px rgba(89, 111, 67, 0.18);
}

.farm-board::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 92px),
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 88px);
  opacity: 0.42;
  pointer-events: none;
}

.garden-redesign.theme-tree .farm-board {
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.24), transparent 18%),
    radial-gradient(circle at 88% 10%, rgba(255, 244, 216, 0.14), transparent 18%),
    linear-gradient(180deg, rgba(183, 214, 171, 0.96), rgba(147, 180, 138, 0.96) 52%, rgba(132, 166, 125, 0.98) 100%);
}

.farm-board-water,
.farm-board-path {
  position: absolute;
  z-index: 0;
}

.farm-board-water {
  right: -12px;
  bottom: -18px;
  width: 150px;
  height: 96px;
  border-radius: 24px 0 24px 0;
  background:
    linear-gradient(180deg, rgba(120, 200, 236, 0.94), rgba(84, 164, 214, 0.96));
  box-shadow:
    inset 0 0 0 3px rgba(211, 242, 255, 0.34),
    0 16px 30px rgba(68, 130, 170, 0.14);
  transform: skewX(-18deg);
}

.class-board-water {
  width: 180px;
  height: 102px;
}

.farm-board-path {
  background: rgba(235, 217, 176, 0.74);
  box-shadow:
    inset 0 0 0 1px rgba(198, 169, 121, 0.22),
    0 10px 22px rgba(159, 129, 89, 0.08);
}

.farm-board-path-a {
  left: 22px;
  right: 22px;
  top: 48%;
  height: 10px;
  border-radius: 999px;
  transform: skewX(-20deg);
}

.farm-board-path-b {
  top: 22px;
  bottom: 22px;
  left: 50%;
  width: 10px;
  border-radius: 999px;
  transform: translateX(-50%) skewY(-20deg);
}

.farm-sections {
  position: relative;
  z-index: 1;
  padding: 0;
  border-radius: 0;
  background: transparent;
  align-items: start;
}

.farm-section {
  position: relative;
  --farm-caption-color: color-mix(in srgb, var(--brown-500) 82%, white 18%);
}

.farm-board-copy {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.farm-board-copy-main {
  display: grid;
  gap: 4px;
  max-width: min(100%, 620px);
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  backdrop-filter: blur(10px);
}

.farm-board-copy-main strong {
  color: var(--forest-700);
  font-size: 1.02rem;
}

.farm-board-copy-main span:last-child {
  color: color-mix(in srgb, var(--brown-600) 78%, white 22%);
  font-size: 0.82rem;
}

.farm-board-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 249, 239, 0.78);
  border: 1px solid rgba(219, 208, 186, 0.72);
  color: var(--brown-400);
  white-space: nowrap;
  box-shadow: 0 8px 14px rgba(97, 85, 64, 0.06);
}

.farm-sign {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: auto;
  max-width: 100%;
  padding: 8px 10px;
  border-radius: 15px;
  background:
    linear-gradient(180deg, rgba(155, 104, 62, 0.98), rgba(107, 69, 37, 0.98));
  color: rgba(255, 248, 235, 0.96);
  box-shadow:
    0 8px 14px rgba(94, 66, 39, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.farm-sign strong {
  color: inherit;
}

.farm-sign span {
  color: rgba(255, 244, 226, 0.88);
  font-family: var(--font-number);
  font-size: 0.8rem;
}

.farm-plot-meta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.84);
  border: 1px solid rgba(225, 217, 201, 0.76);
  color: var(--brown-400);
  font-size: 0.74rem;
  box-shadow: 0 8px 14px rgba(85, 60, 37, 0.06);
}

.farm-caption,
.farm-note {
  margin: 0;
  color: color-mix(in srgb, var(--brown-600) 74%, white 26%);
}

.farm-caption {
  font-size: 0.84rem;
  padding-left: 2px;
}

.farm-note {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: calc(100% - 6px);
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 249, 240, 0.84);
  border: 1px solid rgba(225, 217, 201, 0.76);
  font-size: 0.74rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 8px 14px rgba(85, 60, 37, 0.06);
}

.farm-tile-grid {
  gap: 8px;
}

.farm-tile-row {
  gap: 8px;
}

.farm-tile {
  transform: translateY(0);
}

.class-panorama-head {
  position: relative;
  z-index: 1;
}

.class-estate {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
}

.class-estate-grid {
  align-content: start;
}

.class-estate-plant:not(.labeled) .estate-plant-icon {
  opacity: 0.88;
  transform: scale(0.88);
}

.class-estate-plant:not(.labeled) .estate-plant-soil {
  width: clamp(36px, 52%, 60px);
  height: 14px;
}

.field-crop-icon,
.panorama-stage-icon {
  font-size: 1.36rem;
}

.field-crop span:last-child,
.band-header span,
.band-empty,
.panorama-stage-pill p {
  color: var(--brown-400);
}

.band-empty {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(204, 196, 182, 0.9);
}

.class-panel-header {
  margin-bottom: 0;
}

.class-panorama {
  position: relative;
  display: grid;
  gap: 0;
  min-height: 0;
}

.panorama-backdrop-sky {
  top: 0;
  height: 44%;
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.72), transparent 28%),
    linear-gradient(180deg, rgba(219, 236, 244, 0.92), rgba(236, 245, 230, 0.9));
}

.panorama-backdrop-hills {
  top: 24%;
  height: 22%;
  background:
    radial-gradient(circle at 25% 20%, rgba(128, 156, 101, 0.34), transparent 24%),
    radial-gradient(circle at 72% 36%, rgba(117, 145, 96, 0.28), transparent 24%);
  filter: blur(10px);
}

.panorama-backdrop-ground {
  bottom: 0;
  height: 52%;
  background:
    linear-gradient(180deg, rgba(224, 214, 187, 0.46), rgba(196, 173, 136, 0.52)),
    linear-gradient(180deg, rgba(148, 112, 72, 0.08), transparent 34%);
}

.garden-redesign.theme-tree .panorama-backdrop-ground {
  background:
    linear-gradient(180deg, rgba(214, 212, 192, 0.42), rgba(174, 166, 145, 0.5)),
    linear-gradient(180deg, rgba(108, 90, 72, 0.08), transparent 34%);
}

.panorama-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

.panorama-summary-main {
  display: grid;
  gap: 10px;
}

.panorama-stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 20px;
  background: rgba(255, 252, 245, 0.84);
  border: 1px solid rgba(220, 210, 193, 0.82);
  box-shadow: 0 10px 22px rgba(92, 78, 58, 0.08);
}

.panorama-band-stack {
  display: grid;
  gap: 16px;
}

.panorama-band {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.48), rgba(255, 247, 230, 0.26)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 40%);
  border: 1px solid rgba(231, 225, 214, 0.88);
}

.band-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.band-plants {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.panorama-plant {
  min-width: 108px;
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 12px 12px 10px;
  border-radius: 20px;
  background: rgba(255, 252, 246, 0.72);
  border: 1px solid rgba(230, 223, 211, 0.84);
}

.panorama-plant-icon {
  font-size: 1.56rem;
}

@keyframes float-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1100px) {
  .overview-ribbon,
  .panorama-summary {
    grid-template-columns: 1fr;
  }

  .estate-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .student-growth-card,
  .group-growth-card {
    grid-column: span 6;
  }
}

@media (max-width: 780px) {
  .garden-redesign {
    padding: 14px;
  }

  .garden-shell-header {
    grid-template-columns: 1fr;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .overview-stats,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .group-toolbar-main,
  .group-toolbar-actions,
  .estate-ribbon,
  .farm-board-copy {
    flex-direction: column;
    align-items: flex-start;
  }

  .garden-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-radius: 24px;
  }

  .garden-tab {
    padding-inline: 10px;
  }

  .student-gallery,
  .estate-grid {
    grid-template-columns: 1fr;
  }

  .student-growth-card,
  .group-growth-card {
    grid-column: auto;
  }

  .student-card-hero {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .card-foot,
  .band-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .group-landscape {
    gap: 10px;
  }

  .farm-board {
    padding: 20px 16px 24px;
    border-radius: 28px;
  }

  .panorama-plant {
    width: 100%;
  }

  .panorama-summary {
    grid-template-columns: 1fr;
  }

  .estate-plot-rows,
  .class-estate-rows {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .student-growth-card,
  .group-growth-card,
  .theme-pill,
  .garden-tab,
  .estate-plot,
  .group-selector-pill,
  .group-score-trigger {
    animation: none;
    transition: none;
  }
}

/* === Continuous Farm Scene Override === */
.garden-redesign .group-landscape-panel,
.garden-redesign .class-panorama {
  position: relative;
  overflow: hidden;
  padding: clamp(14px, 1.5vw, 18px);
  border-radius: 38px;
  border: 1px solid rgba(210, 196, 169, 0.72);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.58), transparent 30%),
    linear-gradient(180deg, rgba(248, 244, 234, 0.98), rgba(236, 227, 205, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    0 28px 60px rgba(103, 84, 57, 0.12);
}

.garden-redesign .group-landscape,
.garden-redesign .class-estate {
  position: relative;
  isolation: isolate;
}

.garden-redesign .group-landscape {
  padding-top: 70px;
}

.garden-redesign .farm-horizon {
  position: absolute;
  inset: 0 0 auto;
  height: 130px;
  pointer-events: none;
  z-index: 0;
}

.garden-redesign .farm-cloud,
.garden-redesign .farm-hill {
  position: absolute;
  display: block;
}

.garden-redesign .farm-cloud {
  top: 10px;
  width: 140px;
  height: 42px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 25% 50%, rgba(255, 255, 255, 0.96) 0 22px, transparent 23px),
    radial-gradient(circle at 58% 42%, rgba(255, 255, 255, 0.92) 0 26px, transparent 27px),
    radial-gradient(circle at 78% 55%, rgba(255, 255, 255, 0.88) 0 19px, transparent 20px);
  filter: drop-shadow(0 10px 18px rgba(116, 150, 150, 0.16));
  opacity: 0.92;
}

.garden-redesign .farm-cloud-a {
  left: 8%;
}

.garden-redesign .farm-cloud-b {
  right: 11%;
  top: 22px;
  transform: scale(0.88);
}

.garden-redesign .farm-hill {
  bottom: 6px;
  border-radius: 50% 50% 0 0;
  background: linear-gradient(180deg, rgba(158, 191, 120, 0.94), rgba(116, 153, 88, 0.98));
  filter: blur(0.3px);
}

.garden-redesign .farm-hill-a {
  left: -3%;
  width: 52%;
  height: 76px;
}

.garden-redesign .farm-hill-b {
  right: -5%;
  width: 48%;
  height: 64px;
  background: linear-gradient(180deg, rgba(171, 197, 133, 0.86), rgba(126, 158, 98, 0.94));
}

.garden-redesign .farm-board {
  position: relative;
  z-index: 1;
  overflow: hidden;
  padding: clamp(22px, 2vw, 30px);
  border-radius: 40px;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.22), transparent 22%),
    radial-gradient(circle at 88% 14%, rgba(244, 225, 164, 0.14), transparent 18%),
    linear-gradient(180deg, rgba(176, 211, 129, 0.98), rgba(135, 182, 102, 0.98) 52%, rgba(118, 170, 95, 0.98) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(220, 235, 196, 0.64),
    inset 0 -22px 32px rgba(77, 119, 56, 0.16),
    0 28px 50px rgba(92, 111, 66, 0.2);
}

.garden-redesign.theme-tree .farm-board {
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.2), transparent 22%),
    radial-gradient(circle at 88% 12%, rgba(208, 227, 196, 0.16), transparent 20%),
    linear-gradient(180deg, rgba(182, 205, 165, 0.98), rgba(145, 173, 131, 0.98) 52%, rgba(123, 149, 111, 0.98) 100%);
}

.garden-redesign .farm-board::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 88px),
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 86px);
  opacity: 0.5;
  pointer-events: none;
}

.garden-redesign .farm-board::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 28%;
  background: linear-gradient(180deg, rgba(100, 139, 80, 0), rgba(69, 104, 52, 0.18));
  pointer-events: none;
}

.garden-redesign .farm-board-copy {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.garden-redesign .farm-board-copy-main {
  display: grid;
  gap: 5px;
  max-width: min(100%, 56ch);
}

.garden-redesign .farm-board-copy-main strong {
  font-size: 1.1rem;
}

.garden-redesign .farm-board-copy-main span:last-child {
  font-size: 0.83rem;
  color: color-mix(in srgb, var(--brown-600) 80%, white 20%);
}

.garden-redesign .farm-board-badge,
.garden-redesign .farm-plot-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 251, 244, 0.86);
  border: 1px solid rgba(222, 210, 188, 0.82);
  box-shadow: 0 10px 16px rgba(97, 82, 59, 0.08);
}

.garden-redesign .farm-board-water,
.garden-redesign .farm-board-path,
.garden-redesign .farm-board-shed,
.garden-redesign .farm-board-marker {
  position: absolute;
  z-index: 0;
  pointer-events: none;
}

.garden-redesign .farm-board-water {
  right: -18px;
  bottom: -24px;
  width: 190px;
  height: 120px;
  border-radius: 42px 0 28px 12px;
  transform: skewX(-18deg) rotate(-2deg);
  background:
    linear-gradient(180deg, rgba(132, 212, 240, 0.98), rgba(82, 165, 216, 0.98)),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0 10px, transparent 10px 22px);
  box-shadow:
    inset 0 0 0 3px rgba(217, 243, 255, 0.42),
    0 20px 34px rgba(61, 122, 167, 0.18);
}

.garden-redesign .class-board-water {
  width: 240px;
  height: 136px;
}

.garden-redesign .farm-board-path {
  background:
    repeating-linear-gradient(90deg, rgba(217, 187, 141, 0.26) 0 12px, rgba(230, 204, 160, 0.48) 12px 24px),
    linear-gradient(180deg, rgba(237, 214, 172, 0.92), rgba(218, 189, 140, 0.88));
  box-shadow:
    inset 0 0 0 1px rgba(184, 151, 103, 0.16),
    0 10px 18px rgba(135, 106, 69, 0.1);
}

.garden-redesign .farm-board-path-a {
  top: 44%;
  left: 18px;
  right: 120px;
  height: 16px;
  border-radius: 999px;
  transform: skewX(-18deg);
}

.garden-redesign .farm-board-path-b {
  top: 20px;
  bottom: 26px;
  left: 46%;
  width: 16px;
  border-radius: 999px;
  transform: translateX(-50%) skewY(-18deg);
}

.garden-redesign .farm-board-shed {
  top: 28px;
  right: 146px;
  width: 118px;
  height: 92px;
  border-radius: 10px 10px 18px 18px;
  background: linear-gradient(180deg, #d0a466, #9d6a3d 58%, #7d512e 100%);
  clip-path: polygon(18% 26%, 82% 26%, 100% 48%, 100% 100%, 0 100%, 0 48%);
  box-shadow: 0 16px 24px rgba(100, 70, 43, 0.16);
}

.garden-redesign .farm-board-shed::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #d7b06b, #ab753f);
  clip-path: polygon(12% 28%, 88% 28%, 100% 0, 0 0);
}

.garden-redesign .farm-board-shed::after {
  content: '';
  position: absolute;
  left: 40%;
  bottom: 0;
  width: 22%;
  height: 34%;
  transform: translateX(-50%);
  border-radius: 10px 10px 0 0;
  background: linear-gradient(180deg, rgba(96, 55, 28, 0.98), rgba(58, 31, 16, 0.98));
}

.garden-redesign .class-board-shed {
  right: 172px;
  width: 132px;
  height: 96px;
}

.garden-redesign .farm-board-marker {
  right: 64px;
  bottom: 116px;
  width: 66px;
  height: 78px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(122, 84, 46, 0.96), rgba(84, 53, 28, 0.98));
  box-shadow: 0 14px 18px rgba(85, 57, 33, 0.14);
}

.garden-redesign .farm-board-marker::before {
  content: '';
  position: absolute;
  inset: 10px 8px 24px;
  border-radius: 12px;
  background: rgba(255, 242, 215, 0.9);
}

.garden-redesign .farm-board-marker::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -20px;
  width: 12px;
  height: 30px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(107, 73, 39, 0.96), rgba(72, 46, 24, 0.98));
}

.garden-redesign .class-board-marker {
  bottom: 126px;
}

.garden-redesign .panorama-backdrop {
  display: block;
  position: absolute;
  inset-inline: 0;
  pointer-events: none;
}

.garden-redesign .panorama-backdrop-sky {
  top: 0;
  height: 36%;
  background:
    radial-gradient(circle at 14% 16%, rgba(255, 255, 255, 0.72), transparent 24%),
    linear-gradient(180deg, rgba(213, 231, 245, 0.64), rgba(234, 244, 228, 0.3));
}

.garden-redesign .panorama-backdrop-hills {
  top: 18%;
  height: 22%;
  background:
    radial-gradient(circle at 20% 24%, rgba(119, 153, 95, 0.26), transparent 28%),
    radial-gradient(circle at 72% 38%, rgba(116, 149, 95, 0.22), transparent 26%);
  filter: blur(12px);
}

.garden-redesign .panorama-backdrop-ground {
  bottom: 0;
  height: 48%;
  background: linear-gradient(180deg, rgba(209, 196, 158, 0.16), rgba(170, 143, 99, 0.18));
}

.garden-redesign .farm-sections {
  position: relative;
  z-index: 2;
  display: grid;
  align-items: end;
}

.garden-redesign .group-field-grid {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px;
}

.garden-redesign .group-field-grid > .estate-plot {
  grid-column: span 4;
}

.garden-redesign .class-field-grid {
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 12px;
}

.garden-redesign .class-field-grid > .estate-plot {
  grid-column: span 5;
}

.garden-redesign .group-estate-plot,
.garden-redesign .class-estate-plot {
  position: relative;
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 18px 16px 18px;
  min-height: 0;
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
  border: 1px solid rgba(87, 52, 28, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 239, 214, 0.08),
    0 18px 24px rgba(79, 49, 27, 0.12);
  transform: translateY(calc(var(--plot-index, 0) * 2px));
}

.garden-redesign .group-estate-plot {
  cursor: pointer;
}

.garden-redesign .group-estate-plot:hover,
.garden-redesign .group-estate-plot.selected {
  transform: translateY(calc(var(--plot-index, 0) * 2px - 3px));
  filter: saturate(1.05);
}

.garden-redesign .class-estate-plot {
  cursor: default;
}

.garden-redesign .farm-section.tone-ridge {
  background: linear-gradient(180deg, #7e4326, #5d2f1a 58%, #442110 100%);
}

.garden-redesign .farm-section.tone-meadow {
  background: linear-gradient(180deg, #945734, #6f3d22 58%, #522a15 100%);
}

.garden-redesign .farm-section.tone-grove {
  background: linear-gradient(180deg, #a56036, #7c4426 58%, #5b2f17 100%);
}

.garden-redesign .group-estate-plot.selected {
  box-shadow:
    inset 0 0 0 2px rgba(255, 233, 175, 0.48),
    0 20px 26px rgba(79, 49, 27, 0.16);
}

.garden-redesign .farm-section-ridge {
  position: absolute;
  left: 10px;
  right: 12px;
  bottom: 12px;
  height: 18px;
  opacity: 0.3;
  border-radius: 999px;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 11px, transparent 11px 22px);
}

.garden-redesign .farm-section-head {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
  align-items: flex-start;
}

.garden-redesign .farm-sign {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: fit-content;
  max-width: 100%;
  padding: 9px 12px;
  border-radius: 18px 18px 16px 16px;
  background:
    linear-gradient(180deg, rgba(167, 112, 67, 0.98), rgba(113, 73, 40, 0.98));
  color: rgba(255, 247, 233, 0.98);
  box-shadow:
    0 10px 14px rgba(77, 49, 28, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.garden-redesign .farm-sign span {
  font-family: var(--font-number);
}

.garden-redesign .farm-section-note {
  position: relative;
  z-index: 2;
  margin: 0;
  min-height: 2.3em;
  color: rgba(255, 238, 215, 0.84);
  font-size: 0.74rem;
  line-height: 1.45;
}

.garden-redesign .class-estate-plot .farm-section-note {
  color: rgba(255, 242, 223, 0.78);
}

.garden-redesign .farm-patch-grid,
.garden-redesign .estate-plot-rows {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 8px;
}

.garden-redesign .estate-plot-row {
  display: grid;
  grid-template-columns: repeat(var(--row-columns, 4), minmax(0, 1fr));
  gap: 8px;
}

.garden-redesign .groups-panel .estate-plant,
.garden-redesign .class-panel .estate-plant {
  position: relative;
  min-height: 122px;
  width: 100%;
  aspect-ratio: 1 / 1.05;
  display: grid;
  justify-items: center;
  align-content: end;
  padding: 0;
  overflow: visible;
  isolation: isolate;
}

.garden-redesign .class-panel .class-estate-plant {
  min-height: 116px;
}

.garden-redesign .farm-tile-top {
  position: absolute;
  inset: 0 4px 14px;
  z-index: 1;
  border-radius: 20px 20px 14px 14px;
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 22%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0 10px, transparent 10px 20px);
  opacity: 0.4;
}

.garden-redesign .estate-plant-copy {
  position: absolute;
  inset: 0 4px 10px;
  z-index: 3;
  display: grid;
  justify-items: center;
  align-content: end;
  gap: 4px;
  padding: 0 2px 12px;
  pointer-events: none;
}

.garden-redesign .estate-plant-illustration {
  position: relative;
  z-index: 3;
  width: clamp(58px, 74%, 90px);
  height: clamp(64px, 82%, 94px);
  margin-bottom: 6px;
  filter: drop-shadow(0 10px 14px rgba(57, 42, 25, 0.24));
}

.garden-redesign .estate-plant.featured .estate-plant-illustration {
  width: clamp(66px, 82%, 102px);
  height: clamp(74px, 88%, 106px);
}

.garden-redesign .class-estate-plant:not(.labeled) .estate-plant-illustration {
  width: clamp(52px, 68%, 78px);
  height: clamp(58px, 72%, 82px);
  opacity: 0.94;
}

.garden-redesign .estate-plant.placeholder .estate-plant-illustration {
  opacity: 0.5;
  transform: translateY(6px) scale(0.84);
}

.garden-redesign .estate-plant-soil {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 74px;
  border-radius: 18px 18px 10px 10px;
  clip-path: polygon(10% 12%, 100% 12%, 90% 100%, 0 100%);
  box-shadow:
    0 12px 18px rgba(68, 41, 21, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.garden-redesign .tone-ridge .estate-plant-soil {
  background:
    linear-gradient(180deg, rgba(255, 239, 223, 0.14), transparent 22%),
    repeating-linear-gradient(90deg, rgba(86, 48, 21, 0.18) 0 8px, rgba(132, 82, 44, 0.04) 8px 16px),
    linear-gradient(180deg, #8b4e2a, #603117);
}

.garden-redesign .tone-meadow .estate-plant-soil {
  background:
    linear-gradient(180deg, rgba(255, 239, 223, 0.12), transparent 22%),
    repeating-linear-gradient(90deg, rgba(96, 58, 30, 0.18) 0 8px, rgba(142, 92, 52, 0.04) 8px 16px),
    linear-gradient(180deg, #995a33, #6f3d22);
}

.garden-redesign .tone-grove .estate-plant-soil {
  background:
    linear-gradient(180deg, rgba(255, 239, 223, 0.12), transparent 22%),
    repeating-linear-gradient(90deg, rgba(98, 58, 28, 0.18) 0 8px, rgba(146, 98, 60, 0.04) 8px 16px),
    linear-gradient(180deg, #a56638, #794326);
}

.garden-redesign .estate-plant-soil::after {
  content: '';
  position: absolute;
  inset: auto 8px 0;
  height: 18px;
  border-radius: 0 0 10px 10px;
  background: linear-gradient(180deg, rgba(70, 38, 18, 0.96), rgba(49, 25, 12, 0.98));
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
}

.garden-redesign .estate-plant-name,
.garden-redesign .estate-plant-status {
  position: relative;
  z-index: 3;
  display: inline-flex;
  justify-content: center;
  max-width: calc(100% - 8px);
  padding: 3px 7px;
  border-radius: 999px;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 6px 12px rgba(85, 60, 37, 0.08);
}

.garden-redesign .estate-plant-name {
  background: rgba(255, 250, 243, 0.94);
  color: color-mix(in srgb, var(--brown-600) 88%, white 12%);
  font-size: 0.7rem;
  font-weight: 700;
}

.garden-redesign .estate-plant-status {
  background: rgba(255, 250, 243, 0.78);
  color: color-mix(in srgb, var(--brown-400) 86%, white 14%);
  font-size: 0.64rem;
}

.garden-redesign .class-estate-plant:not(.labeled) .estate-plant-name,
.garden-redesign .class-estate-plant:not(.labeled) .estate-plant-status {
  display: none;
}

.garden-redesign .estate-plant.placeholder .estate-plant-name,
.garden-redesign .estate-plant.placeholder .estate-plant-status {
  display: none;
}

.garden-redesign .panorama-stage-pill {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 22px;
  background: rgba(255, 252, 245, 0.86);
  border: 1px solid rgba(220, 210, 193, 0.82);
  box-shadow: 0 12px 18px rgba(92, 78, 58, 0.08);
}

.garden-redesign .group-toolbar {
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(215, 204, 183, 0.76);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.42), transparent 24%),
    linear-gradient(180deg, rgba(255, 250, 241, 0.92), rgba(244, 237, 220, 0.82));
  box-shadow: 0 18px 34px rgba(97, 84, 58, 0.1);
}

.garden-redesign.theme-tree .group-toolbar {
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.38), transparent 24%),
    linear-gradient(180deg, rgba(247, 250, 245, 0.92), rgba(232, 238, 226, 0.82));
}

.garden-redesign .scene-copy-banner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.garden-redesign .scene-copy-main {
  display: grid;
  gap: 5px;
  max-width: 56ch;
}

.garden-redesign .scene-copy-main strong {
  color: var(--forest-700);
  font-size: 1.08rem;
}

.garden-redesign .scene-copy-main span:last-child {
  color: color-mix(in srgb, var(--brown-600) 78%, white 22%);
  font-size: 0.84rem;
}

.garden-redesign .scene-copy-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 251, 243, 0.88);
  border: 1px solid rgba(222, 209, 184, 0.88);
  box-shadow: 0 10px 20px rgba(98, 83, 60, 0.08);
  color: var(--brown-400);
  white-space: nowrap;
}

.garden-redesign .class-banner {
  margin-bottom: 16px;
}

.garden-redesign .pixi-scene-frame {
  position: relative;
  padding: clamp(10px, 1.2vw, 14px);
  border-radius: 34px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.42), transparent 22%),
    linear-gradient(180deg, rgba(255, 247, 235, 0.84), rgba(239, 232, 213, 0.8));
  border: 1px solid rgba(216, 203, 178, 0.84);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.54),
    0 20px 34px rgba(100, 84, 59, 0.12);
}

.garden-redesign .scene-legend-strip {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) repeat(5, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.garden-redesign .scene-legend-class {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.garden-redesign .legend-card {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 252, 246, 0.94), rgba(247, 240, 224, 0.88));
  border: 1px solid rgba(221, 209, 185, 0.82);
  box-shadow: 0 10px 18px rgba(96, 82, 59, 0.08);
}

.garden-redesign .legend-card.primary {
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.38), transparent 28%),
    linear-gradient(180deg, rgba(238, 246, 230, 0.96), rgba(247, 239, 221, 0.92));
}

.garden-redesign .legend-card strong {
  color: var(--forest-700);
  font-size: 0.96rem;
}

.garden-redesign .legend-card span,
.garden-redesign .legend-card p {
  margin: 0;
  color: var(--brown-400);
  font-size: 0.76rem;
  line-height: 1.4;
}

@media (max-width: 1100px) {
  .garden-redesign .group-field-grid,
  .garden-redesign .class-field-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }

  .garden-redesign .group-field-grid > .estate-plot,
  .garden-redesign .class-field-grid > .estate-plot {
    grid-column: span 4;
  }

  .garden-redesign .scene-legend-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .garden-redesign .group-landscape {
    padding-top: 42px;
  }

  .garden-redesign .farm-horizon {
    height: 86px;
  }

  .garden-redesign .farm-board {
    padding: 18px 14px 20px;
    border-radius: 30px;
  }

  .garden-redesign .farm-board-copy {
    flex-direction: column;
    align-items: flex-start;
  }

  .garden-redesign .group-field-grid,
  .garden-redesign .class-field-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .garden-redesign .group-field-grid > .estate-plot,
  .garden-redesign .class-field-grid > .estate-plot {
    grid-column: auto;
  }

  .garden-redesign .group-estate-plot,
  .garden-redesign .class-estate-plot {
    clip-path: none;
    border-radius: 28px;
    transform: none;
  }

  .garden-redesign .group-estate-plot:hover,
  .garden-redesign .group-estate-plot.selected {
    transform: none;
  }

  .garden-redesign .estate-plot-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .garden-redesign .farm-board-water,
  .garden-redesign .farm-board-shed,
  .garden-redesign .farm-board-marker {
    display: none;
  }

  .garden-redesign .farm-board-path-a {
    right: 24px;
  }

  .garden-redesign .scene-copy-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .garden-redesign .pixi-scene-frame {
    padding: 8px;
    border-radius: 24px;
  }

  .garden-redesign .scene-legend-strip,
  .garden-redesign .scene-legend-class {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .garden-redesign .group-estate-plot,
  .garden-redesign .estate-plant-illustration {
    transition: none;
    animation: none;
  }
}

/* === Flat Field Card Override === */
.garden-redesign .group-landscape-panel,
.garden-redesign .class-panorama {
  padding: clamp(14px, 1.6vw, 20px);
  border-radius: 34px;
  border: 1px solid rgba(214, 203, 183, 0.82);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.42), transparent 26%),
    linear-gradient(180deg, rgba(248, 244, 235, 0.96), rgba(239, 232, 213, 0.92));
  box-shadow: 0 18px 36px rgba(97, 84, 58, 0.1);
}

.garden-redesign .group-landscape,
.garden-redesign .class-estate {
  display: grid;
  gap: 16px;
}

.garden-redesign .field-mosaic-board {
  display: grid;
  gap: 16px;
}

.garden-redesign .group-field-grid {
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
}

.garden-redesign .class-field-grid {
  grid-template-columns: minmax(0, 1fr);
}

.garden-redesign .field-plot-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid rgba(210, 198, 174, 0.88);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.22), transparent 24%),
    linear-gradient(180deg, rgba(241, 232, 199, 0.42), rgba(214, 220, 171, 0.32));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.54),
    0 14px 26px rgba(99, 84, 57, 0.08);
}

.garden-redesign .group-plot-card {
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.garden-redesign .group-plot-card:hover,
.garden-redesign .group-plot-card.selected {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.54),
    0 20px 32px rgba(99, 84, 57, 0.12);
}

.garden-redesign .group-plot-card.selected {
  border-color: rgba(136, 168, 87, 0.9);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.24), transparent 24%),
    linear-gradient(180deg, rgba(232, 241, 212, 0.52), rgba(211, 222, 173, 0.34));
}

.garden-redesign .field-plot-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.garden-redesign .field-plot-head strong {
  color: var(--forest-700);
  font-size: 1rem;
}

.garden-redesign .field-plot-head span {
  color: var(--brown-400);
  font-size: 0.76rem;
}

.garden-redesign .class-plot-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding-bottom: 6px;
}

.garden-redesign .class-plot-copy {
  display: grid;
  gap: 4px;
}

.garden-redesign .class-plot-copy span {
  font-size: 0.76rem;
  line-height: 1.45;
}

.garden-redesign .class-plot-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 248, 236, 0.8);
  border: 1px solid rgba(198, 181, 153, 0.82);
}

.garden-redesign .field-card-grid {
  display: grid;
  grid-template-columns: repeat(var(--field-columns, 5), minmax(0, 1fr));
  gap: 8px;
}

.garden-redesign .class-card-grid {
  gap: 10px 8px;
}

.garden-redesign .field-soil-card {
  position: relative;
  min-height: 118px;
  border-radius: 14px;
  overflow: visible;
  background:
    radial-gradient(circle at 18% 14%, rgba(255, 250, 240, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(156, 96, 54, 0.98), rgba(116, 66, 34, 1) 56%, rgba(97, 54, 28, 1));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 8px 16px rgba(82, 58, 32, 0.12);
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

.garden-redesign .field-soil-card::before {
  content: '';
  position: absolute;
  inset: 8px 8px auto;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 233, 208, 0.16), rgba(255, 233, 208, 0));
  opacity: 0.8;
}

.garden-redesign .field-soil-card::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 16px;
  border-radius: 0 0 14px 14px;
  background: linear-gradient(180deg, rgba(86, 46, 23, 0.98), rgba(66, 33, 16, 1));
}

.garden-redesign .field-soil-ridges {
  position: absolute;
  inset: 12px 8px 16px;
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 247, 232, 0.08), transparent 30%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 2px, transparent 2px 11px),
    repeating-linear-gradient(90deg, rgba(89, 49, 24, 0.22) 0 7px, rgba(124, 73, 38, 0.08) 7px 14px);
  opacity: 0.82;
}

.garden-redesign .field-soil-card.placeholder {
  filter: saturate(0.74) brightness(0.96);
}

.garden-redesign .field-soil-card.placeholder .field-soil-ridges {
  opacity: 0.38;
}

.garden-redesign .field-plant-emoji {
  position: absolute;
  left: 50%;
  bottom: 15px;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 1.2em;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  font-size: clamp(2.2rem, 1.7vw + 1.05rem, 2.9rem);
  line-height: 1;
  transform: translateX(-50%) translateY(0) scale(1);
  transform-origin: center bottom;
  pointer-events: none;
  filter: drop-shadow(0 6px 10px rgba(59, 42, 24, 0.2));
  text-shadow: 0 4px 10px rgba(59, 42, 24, 0.16);
  z-index: 2;
  user-select: none;
  -webkit-font-smoothing: antialiased;
  transition: transform var(--duration-fast) var(--ease-out), filter var(--duration-fast) var(--ease-out);
}

.garden-redesign .field-soil-card.featured .field-plant-emoji {
  transform: translateX(-50%) scale(1.06);
}

.garden-redesign .class-soil-card .field-plant-emoji {
  bottom: 14px;
  font-size: clamp(2.05rem, 1.35vw + 1.1rem, 2.7rem);
}

.garden-redesign .field-soil-card.stage-seed .field-plant-emoji {
  bottom: 14px;
  font-size: clamp(1.8rem, 1vw + 1rem, 2.15rem);
}

.garden-redesign .field-soil-card.stage-sprout .field-plant-emoji,
.garden-redesign .field-soil-card.stage-bud .field-plant-emoji {
  bottom: 14px;
  font-size: clamp(2rem, 1.2vw + 1rem, 2.4rem);
}

.garden-redesign .field-soil-card.stage-seedling .field-plant-emoji,
.garden-redesign .field-soil-card.stage-sapling .field-plant-emoji {
  bottom: 15px;
  font-size: clamp(2.25rem, 1.45vw + 1rem, 2.75rem);
}

.garden-redesign .field-soil-card.stage-flower .field-plant-emoji,
.garden-redesign .field-soil-card.stage-young_tree .field-plant-emoji {
  bottom: 12px;
  font-size: clamp(2.45rem, 1.55vw + 1.1rem, 2.95rem);
}

.garden-redesign .field-soil-card.stage-harvest .field-plant-emoji,
.garden-redesign .field-soil-card.stage-big_tree .field-plant-emoji {
  bottom: 12px;
  font-size: clamp(2.35rem, 1.45vw + 1.05rem, 2.85rem);
}

.garden-redesign .field-soil-card:hover,
.garden-redesign .field-soil-card:focus-within {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 12px 18px rgba(82, 58, 32, 0.16);
}

.garden-redesign .field-soil-card:hover .field-plant-emoji,
.garden-redesign .field-soil-card:focus-within .field-plant-emoji {
  transform: translateX(-50%) translateY(-2px) scale(1.04);
}

.garden-redesign .field-hover-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 8px);
  z-index: 5;
  display: grid;
  gap: 2px;
  min-width: 110px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(37, 45, 29, 0.94);
  color: rgba(255, 250, 240, 0.96);
  transform: translateX(-50%) translateY(6px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  box-shadow: 0 12px 22px rgba(33, 38, 24, 0.22);
}

.garden-redesign .field-hover-tooltip strong {
  color: inherit;
  font-size: 0.78rem;
}

.garden-redesign .field-hover-tooltip span {
  color: rgba(248, 240, 225, 0.84);
  font-size: 0.68rem;
  line-height: 1.35;
}

.garden-redesign .field-soil-card:hover .field-hover-tooltip,
.garden-redesign .field-soil-card:focus-within .field-hover-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 960px) {
  .garden-redesign .group-field-grid,
  .garden-redesign .class-field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .garden-redesign .field-plot-card {
    padding: 14px;
  }

  .garden-redesign .class-plot-head {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .garden-redesign .field-card-grid,
  .garden-redesign .class-card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .garden-redesign .field-soil-card {
    min-height: 102px;
  }

  .garden-redesign .field-plant-emoji {
    bottom: 12px;
    font-size: clamp(1.9rem, 6vw, 2.45rem);
  }
}
</style>
