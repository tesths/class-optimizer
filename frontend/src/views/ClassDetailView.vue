<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getClass, getClassStats, createClass, updateClass } from '@/api/classes'
import { getStudents, createStudent, deleteStudent, scoreStudent } from '@/api/student'
import { getGroups, createGroup, deleteGroup, scoreGroup, addGroupMember, getGroupMembers, removeGroupMember } from '@/api/group'
import { getGroupScoreHistory, getStudentScoreHistory } from '@/api/scoring'
import { getScoreItems, createScoreItem, deleteScoreItem } from '@/api/student'
import { getStatsOverview, getStudentStats, getGroupStats } from '@/api/stats'
import ScoreDialog from '@/components/ScoreDialog.vue'
import GroupScoreDialog from '@/components/GroupScoreDialog.vue'
import {
  DEFAULT_GROUP_GROWTH_THRESHOLDS,
  getGrowthStageConfig,
  normalizeGrowthThresholds
} from '@/utils/growth'
import type { Class, GroupHistoryItem, StatsOverview, Student, StudentHistoryItem, StudentStats, GroupStats, StudentGroup, ScoreItem } from '@/types'

const route = useRoute()
const router = useRouter()
const rawId = computed(() => route.params.id as string)
const isNewMode = computed(() => rawId.value === 'new')
const classId = computed(() => {
  if (isNewMode.value) return null
  const id = Number(rawId.value)
  return isNaN(id) ? null : id
})
const cls = ref<Class | null>(null)
const stats = ref<StatsOverview | null>(null)
const activeTab = ref('students')
const loading = ref(true)
const saving = ref(false)
const error = ref('')

// Students state
const students = ref<Student[]>([])
const showAddForm = ref(false)
const newStudentForm = ref({
  name: '',
  student_no: '',
  gender: '',
  seat_no: ''
})

// Groups state
const groups = ref<StudentGroup[]>([])
const showAddGroupForm = ref(false)
const newGroupForm = ref({
  name: ''
})

// Group scoring state
const showGroupScoreDialog = ref(false)
const selectedGroup = ref<StudentGroup | null>(null)

// Group member management state
const showGroupMembersDialog = ref(false)
const groupMembers = ref<Student[]>([])
const availableStudents = ref<Student[]>([])
const selectedStudentForGroup = ref<number | null>(null)

// Score items state
const scoreItems = ref<ScoreItem[]>([])
const showAddScoreItemForm = ref(false)
const newScoreItemForm = ref({
  name: '',
  target_type: 'student' as 'student' | 'group',
  score_type: 'plus' as 'plus' | 'minus',
  score_value: 1
})

// Scoring state
const showScoreDialog = ref(false)
const selectedStudent = ref<Student | null>(null)

// New class form
const newClassForm = ref({
  name: '',
  grade: '',
  school_year: '',
  description: '',
  visual_theme: 'tree' as 'farm' | 'tree'
})

// Stats state
const studentStats = ref<StudentStats[]>([])
const groupStats = ref<GroupStats[]>([])
const statsOverview = ref<StatsOverview | null>(null)

const studentHistoryLogs = ref<StudentHistoryItem[]>([])
const groupHistoryLogs = ref<GroupHistoryItem[]>([])

// Edit state
const isEditMode = computed(() => route.path.endsWith('/edit'))
const editForm = ref({
  name: '',
  grade: '',
  school_year: '',
  description: '',
  visual_theme: 'tree' as 'farm' | 'tree',
  group_growth_thresholds: [...DEFAULT_GROUP_GROWTH_THRESHOLDS]
})

const groupThresholdStages = computed(() => getGrowthStageConfig(editForm.value.visual_theme).slice(1))

const tabs = [
  { key: 'students', label: '学生管理' },
  { key: 'groups', label: '小组管理' },
  { key: 'score-items', label: '积分项目' },
  { key: 'stats', label: '统计分析' },
  { key: 'history', label: '历史记录' }
]

const studentScoreItems = computed(() => scoreItems.value.filter(item => item.target_type === 'student'))
const groupScoreItems = computed(() => scoreItems.value.filter(item => item.target_type === 'group'))

async function loadStudents() {
  if (!classId.value) return
  try {
    students.value = await getStudents(classId.value)
  } catch (e) {
    console.error('Failed to load students:', e)
  }
}

async function handleCreateClass() {
  if (!newClassForm.value.name || !newClassForm.value.grade || !newClassForm.value.school_year) {
    error.value = '请填写必填项'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const created = await createClass(newClassForm.value)
    router.push(`/class/${created.id}`)
  } catch (e: any) {
    error.value = e.response?.data?.detail || '创建失败'
  } finally {
    saving.value = false
  }
}

async function handleAddStudent() {
  if (!newStudentForm.value.name || !newStudentForm.value.student_no) {
    error.value = '请填写姓名和学号'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await createStudent(classId.value!, newStudentForm.value)
    showAddForm.value = false
    newStudentForm.value = { name: '', student_no: '', gender: '', seat_no: '' }
    await loadStudents()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '添加失败'
  } finally {
    saving.value = false
  }
}

async function handleDeleteStudent(studentId: number) {
  if (!confirm('确定要删除该学生吗？')) return
  try {
    await deleteStudent(classId.value!, studentId)
    await loadStudents()
    if (classId.value) {
      stats.value = await getClassStats(classId.value)
    }
  } catch (e: any) {
    error.value = e.response?.data?.detail || '删除失败'
  }
}

async function loadGroups() {
  if (!classId.value) return
  try {
    groups.value = await getGroups(classId.value)
  } catch (e) {
    console.error('Failed to load groups:', e)
  }
}

async function handleAddGroup() {
  if (!newGroupForm.value.name) {
    error.value = '请填写小组名称'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await createGroup(classId.value!, { name: newGroupForm.value.name })
    showAddGroupForm.value = false
    newGroupForm.value = { name: '' }
    await loadGroups()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '添加失败'
  } finally {
    saving.value = false
  }
}

async function handleDeleteGroup(groupId: number) {
  if (!confirm('确定要删除该小组吗？')) return
  try {
    await deleteGroup(classId.value!, groupId)
    await loadGroups()
    if (classId.value) {
      stats.value = await getClassStats(classId.value)
    }
  } catch (e: any) {
    error.value = e.response?.data?.detail || '删除失败'
  }
}

function openGroupScoreDialog(group: StudentGroup) {
  selectedGroup.value = group
  showGroupScoreDialog.value = true
}

async function handleGroupScore(data: { score_item_id: number | null; score_delta: number; remark: string }) {
  if (!selectedGroup.value) return
  if (!data.score_item_id) {
    error.value = '请选择小组积分项目'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await scoreGroup(selectedGroup.value.id, {
      score_item_id: data.score_item_id,
      remark: data.remark
    })
    showGroupScoreDialog.value = false
    await Promise.all([loadGroups(), loadStats()])
    if (classId.value) {
      stats.value = await getClassStats(classId.value)
    }
  } catch (e: any) {
    error.value = e.response?.data?.detail || '评分失败'
  } finally {
    saving.value = false
  }
}

async function openGroupMembersDialog(group: StudentGroup) {
  selectedGroup.value = group
  showGroupMembersDialog.value = true
  await loadGroupMembers()
}

async function loadGroupMembers() {
  if (!classId.value || !selectedGroup.value) return
  try {
    const [memberRecords, allStudents] = await Promise.all([
      getGroupMembers(classId.value, selectedGroup.value.id),
      getStudents(classId.value)
    ])
    const memberIds = new Set(memberRecords.map(record => record.student_id))
    groupMembers.value = memberRecords.flatMap(record => record.student ? [record.student] : [])
    availableStudents.value = allStudents.filter(student => !student.group_id && !memberIds.has(student.id))
  } catch (e) {
    console.error('Failed to load group members:', e)
  }
}

async function handleAddMember() {
  if (!classId.value || !selectedGroup.value || !selectedStudentForGroup.value) return
  saving.value = true
  error.value = ''
  try {
    await addGroupMember(classId.value, selectedGroup.value.id, selectedStudentForGroup.value)
    selectedStudentForGroup.value = null
    await loadGroupMembers()
    await loadGroups()
    await loadStudents()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '添加失败'
  } finally {
    saving.value = false
  }
}

async function handleRemoveMember(studentId: number) {
  if (!classId.value || !selectedGroup.value) return
  try {
    await removeGroupMember(classId.value, selectedGroup.value.id, studentId)
    await loadGroupMembers()
    await loadGroups()
    await loadStudents()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '移除失败'
  }
}

async function loadScoreItems() {
  if (!classId.value) return
  try {
    scoreItems.value = await getScoreItems(classId.value, { enabledOnly: false })
  } catch (e) {
    console.error('Failed to load score items:', e)
  }
}

async function handleAddScoreItem() {
  if (!newScoreItemForm.value.name || newScoreItemForm.value.score_value <= 0) {
    error.value = '请填写正确的积分项目信息'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await createScoreItem(classId.value!, {
      name: newScoreItemForm.value.name,
      target_type: newScoreItemForm.value.target_type,
      score_type: newScoreItemForm.value.score_type,
      score_value: newScoreItemForm.value.score_value,
      enabled: true,
      sort_order: 0
    })
    showAddScoreItemForm.value = false
    newScoreItemForm.value = { name: '', target_type: 'student', score_type: 'plus', score_value: 1 }
    await loadScoreItems()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '添加失败'
  } finally {
    saving.value = false
  }
}

async function handleDeleteScoreItem(itemId: number) {
  if (!confirm('确定要删除该积分项目吗？')) return
  try {
    await deleteScoreItem(classId.value!, itemId)
    await loadScoreItems()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '删除失败'
  }
}

async function openScoreDialog(student: Student) {
  if (studentScoreItems.value.length === 0 && classId.value) {
    await loadScoreItems()
  }
  selectedStudent.value = student
  showScoreDialog.value = true
}

async function handleScore(data: { score_item_id: number | null; score_delta: number; remark: string }) {
  if (!selectedStudent.value || !data.score_item_id) {
    error.value = '请选择积分项目'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await scoreStudent(selectedStudent.value.id, {
      score_item_id: data.score_item_id,
      remark: data.remark
    })
    showScoreDialog.value = false
    await Promise.all([loadStudents(), loadStats()])
    if (classId.value) {
      stats.value = await getClassStats(classId.value)
    }
  } catch (e: any) {
    error.value = e.response?.data?.detail || '打分失败'
  } finally {
    saving.value = false
  }
}

watch(activeTab, async (newTab) => {
  if (newTab === 'students' && classId.value) {
    await loadStudents()
  } else if (newTab === 'groups' && classId.value) {
    await loadGroups()
  } else if (newTab === 'score-items' && classId.value) {
    await loadScoreItems()
  }
})

function resetPageState() {
  cls.value = null
  stats.value = null
  students.value = []
  groups.value = []
  scoreItems.value = []
  statsOverview.value = null
  studentStats.value = []
  groupStats.value = []
  studentHistoryLogs.value = []
  groupHistoryLogs.value = []
  activeTab.value = 'students'
  error.value = ''
  showAddForm.value = false
  showAddGroupForm.value = false
  showAddScoreItemForm.value = false
  showScoreDialog.value = false
  showGroupScoreDialog.value = false
  showGroupMembersDialog.value = false
  selectedStudent.value = null
  selectedGroup.value = null
}

async function loadPageData() {
  resetPageState()

  if (isNewMode.value) {
    loading.value = false
    return
  }
  if (!classId.value) {
    await router.push('/')
    return
  }

  loading.value = true

  try {
    const [classData, classStats, studentList, classScoreItems] = await Promise.all([
      getClass(classId.value),
      getClassStats(classId.value),
      getStudents(classId.value),
      getScoreItems(classId.value, { enabledOnly: false })
    ])

    cls.value = classData
    stats.value = classStats
    students.value = studentList
    scoreItems.value = classScoreItems

    editForm.value = {
      name: classData.name || '',
      grade: classData.grade || '',
      school_year: classData.school_year || '',
      description: classData.description || '',
      visual_theme: classData.visual_theme || 'tree',
      group_growth_thresholds: [...(classData.group_growth_thresholds || DEFAULT_GROUP_GROWTH_THRESHOLDS)]
    }
  } finally {
    loading.value = false
  }
}

watch(() => route.fullPath, () => {
  void loadPageData()
}, { immediate: true })

// Watch activeTab to load data
watch(activeTab, async (tab) => {
  if (!classId.value) return
  if (tab === 'stats') {
    await loadStats()
  } else if (tab === 'history') {
    await loadHistory()
  }
})

async function loadStats() {
  if (!classId.value) return
  try {
    [statsOverview.value, studentStats.value, groupStats.value] = await Promise.all([
      getStatsOverview(classId.value),
      getStudentStats(classId.value),
      getGroupStats(classId.value)
    ])
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

async function loadHistory() {
  if (!classId.value) return
  try {
    ;[studentHistoryLogs.value, groupHistoryLogs.value] = await Promise.all([
      getStudentScoreHistory(classId.value),
      getGroupScoreHistory(classId.value)
    ])
  } catch (e) {
    console.error('Failed to load history:', e)
  }
}

async function handleUpdateClass() {
  if (!classId.value) return
  if (!editForm.value.name || !editForm.value.grade || !editForm.value.school_year) {
    error.value = '请填写必填项'
    return
  }
  try {
    editForm.value.group_growth_thresholds = normalizeGrowthThresholds(editForm.value.group_growth_thresholds)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '请检查小组成长阈值'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await updateClass(classId.value, editForm.value)
    router.push(`/class/${classId.value}`)
  } catch (e: any) {
    error.value = e.response?.data?.detail || '更新失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="class-detail-page">
    <header class="header">
      <div class="header-left">
        <button @click="router.push('/')" class="page-back-button">返回</button>
        <h1>{{ cls?.name || '加载中...' }}</h1>
      </div>
      <div class="theme-badge">
        {{ cls?.visual_theme === 'farm' ? '🌱 种菜主题' : '🌲 树苗主题' }}
      </div>
    </header>

    <div v-if="loading" class="loading ui-empty-state ui-soft-panel is-loading" data-empty-icon="⏳">
      <p class="ui-empty-title">正在整理班级花园</p>
      <p class="ui-empty-copy">班级信息、小组和成长记录马上就位。</p>
    </div>
    <div v-else-if="isEditMode" class="new-class-form card">
      <h2>编辑班级</h2>
      <form @submit.prevent="handleUpdateClass">
        <div class="form-group">
          <label>班级名称 *</label>
          <input v-model="editForm.name" type="text" class="input" placeholder="如：初一(1)班" required />
        </div>
        <div class="form-group">
          <label>年级 *</label>
          <input v-model="editForm.grade" type="text" class="input" placeholder="如：初一" required />
        </div>
        <div class="form-group">
          <label>学年 *</label>
          <input v-model="editForm.school_year" type="text" class="input" placeholder="如：2025-2026" required />
        </div>
        <div class="form-group">
          <label>班级简介</label>
          <textarea v-model="editForm.description" class="input" rows="3" placeholder="可选"></textarea>
        </div>
        <div class="form-group">
          <label>视觉主题</label>
          <select v-model="editForm.visual_theme" class="input">
            <option value="tree">🌲 树苗主题</option>
            <option value="farm">🌱 种菜主题</option>
          </select>
        </div>
        <div class="form-group">
          <label>小组花园升级分数</label>
          <div class="card ui-soft-panel">
            <p class="ui-empty-copy">
              小组花园的升级分数独立于学生成长分数。第一档固定从 0 分开始。
            </p>
            <div class="form-row">
              <div class="form-group">
                <label>起始地块</label>
                <input :value="editForm.group_growth_thresholds[0]" type="number" class="input" disabled />
              </div>
              <div
                v-for="(stage, index) in groupThresholdStages"
                :key="stage.name"
                class="form-group"
              >
                <label>{{ stage.label }}</label>
                <input
                  v-model.number="editForm.group_growth_thresholds[index + 1]"
                  type="number"
                  min="1"
                  class="input"
                />
              </div>
            </div>
          </div>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? '保存中...' : '保存修改' }}
          </button>
          <button type="button" class="btn" @click="router.push(`/class/${classId}`)">取消</button>
        </div>
      </form>
    </div>
    <div v-else-if="isNewMode" class="new-class-form card">
      <h2>新建班级</h2>
      <form @submit.prevent="handleCreateClass">
        <div class="form-group">
          <label>班级名称 *</label>
          <input v-model="newClassForm.name" type="text" class="input" placeholder="如：初一(1)班" required />
        </div>
        <div class="form-group">
          <label>年级 *</label>
          <input v-model="newClassForm.grade" type="text" class="input" placeholder="如：初一" required />
        </div>
        <div class="form-group">
          <label>学年 *</label>
          <input v-model="newClassForm.school_year" type="text" class="input" placeholder="如：2025-2026" required />
        </div>
        <div class="form-group">
          <label>班级简介</label>
          <textarea v-model="newClassForm.description" class="input" rows="3" placeholder="可选"></textarea>
        </div>
        <div class="form-group">
          <label>视觉主题</label>
          <select v-model="newClassForm.visual_theme" class="input">
            <option value="tree">🌲 树苗主题</option>
            <option value="farm">🌱 种菜主题</option>
          </select>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? '创建中...' : '创建班级' }}
          </button>
          <button type="button" class="btn" @click="router.push('/')">取消</button>
        </div>
      </form>
    </div>
    <template v-else-if="cls">
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">学生数</span>
          <span class="stat-value">{{ stats?.student_count || 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">小组数</span>
          <span class="stat-value">{{ stats?.group_count || 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本周加分</span>
          <span class="stat-value positive">+{{ stats?.week_plus || 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本周减分</span>
          <span class="stat-value negative">-{{ stats?.week_minus || 0 }}</span>
        </div>
        <button class="btn btn-garden" @click="router.push(`/class/${classId}/garden`)">
          🌱 进入花园
        </button>
      </div>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <main class="content">
        <!-- 学生管理 Tab -->
        <div v-if="activeTab === 'students'" class="students-tab">
          <div class="tab-header">
            <h3>学生列表 ({{ students.length }})</h3>
            <div class="tab-actions">
              <button class="btn" @click="router.push(`/class/${classId}/import`)">
                导入
              </button>
              <button v-if="!showAddForm" class="btn btn-primary" @click="showAddForm = true">
                添加学生
              </button>
            </div>
          </div>

          <!-- 添加学生表单 -->
          <div v-if="showAddForm" class="card add-form">
            <h4>添加新学生</h4>
            <form @submit.prevent="handleAddStudent">
              <div class="form-row">
                <div class="form-group">
                  <label>姓名 *</label>
                  <input v-model="newStudentForm.name" type="text" class="input" required />
                </div>
                <div class="form-group">
                  <label>学号 *</label>
                  <input v-model="newStudentForm.student_no" type="text" class="input" required />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>性别</label>
                  <select v-model="newStudentForm.gender" class="input">
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>座位号</label>
                  <input v-model="newStudentForm.seat_no" type="text" class="input" />
                </div>
              </div>
              <p v-if="error" class="error">{{ error }}</p>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? '添加中...' : '确认添加' }}
                </button>
                <button type="button" class="btn" @click="showAddForm = false; error = ''">取消</button>
              </div>
            </form>
          </div>

          <!-- 学生列表 -->
          <div v-if="students.length === 0 && !showAddForm" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="🌱">
            <p class="ui-empty-title">学生园地还是空的</p>
            <p class="ui-empty-copy">点击上方按钮添加第一个学生，让成长记录开始发芽。</p>
          </div>
          <div v-else class="student-list">
            <table class="data-table ui-data-table">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>性别</th>
                  <th>座位号</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="student in students" :key="student.id" class="student-row" @click="openScoreDialog(student)">
                  <td>{{ student.student_no }}</td>
                  <td>{{ student.name }}</td>
                  <td>{{ student.gender || '-' }}</td>
                  <td>{{ student.seat_no || '-' }}</td>
                  <td @click.stop>
                    <button class="btn-text danger" @click="handleDeleteStudent(student.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 小组管理 Tab -->
        <div v-else-if="activeTab === 'groups'" class="groups-tab">
          <div class="tab-header">
            <h3>小组列表 ({{ groups.length }})</h3>
            <button v-if="!showAddGroupForm" class="btn btn-primary" @click="showAddGroupForm = true">
              添加小组
            </button>
          </div>

          <div v-if="showAddGroupForm" class="card add-form">
            <h4>添加新小组</h4>
            <form @submit.prevent="handleAddGroup">
              <div class="form-group">
                <label>小组名称 *</label>
                <input v-model="newGroupForm.name" type="text" class="input" placeholder="如：第1组" required />
              </div>
              <p v-if="error" class="error">{{ error }}</p>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? '添加中...' : '确认添加' }}
                </button>
                <button type="button" class="btn" @click="showAddGroupForm = false; error = ''">取消</button>
              </div>
            </form>
          </div>

          <div v-if="groups.length === 0 && !showAddGroupForm" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="👥">
            <p class="ui-empty-title">还没有小组花园</p>
            <p class="ui-empty-copy">先建立小组，再把同学分到各自的小花园里。</p>
          </div>
          <div v-else class="group-list">
            <div v-for="group in groups" :key="group.id" class="group-card card">
              <div class="group-info">
                <h4>{{ group.name }}</h4>
                <span class="member-count">{{ group.member_count || 0 }} 名成员</span>
                <span class="group-total-score">小组积分 {{ group.total_score || 0 }}</span>
              </div>
              <div class="group-actions">
                <button class="btn-text" @click="openGroupMembersDialog(group)">成员</button>
                <button class="btn-text" @click="openGroupScoreDialog(group)">评分</button>
                <button class="btn-text danger" @click="handleDeleteGroup(group.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 积分项目 Tab -->
        <div v-else-if="activeTab === 'score-items'" class="score-items-tab">
          <div class="tab-header">
            <h3>积分项目 ({{ scoreItems.length }})</h3>
            <button v-if="!showAddScoreItemForm" class="btn btn-primary" @click="showAddScoreItemForm = true">
              添加项目
            </button>
          </div>

          <div v-if="showAddScoreItemForm" class="card add-form">
            <h4>添加积分项目</h4>
            <form @submit.prevent="handleAddScoreItem">
              <div class="form-row">
                <div class="form-group">
                  <label>项目名称 *</label>
                  <input v-model="newScoreItemForm.name" type="text" class="input" placeholder="如：积极发言" required />
                </div>
                <div class="form-group">
                  <label>适用对象 *</label>
                  <select v-model="newScoreItemForm.target_type" class="input">
                    <option value="student">学生</option>
                    <option value="group">小组</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>类型 *</label>
                  <select v-model="newScoreItemForm.score_type" class="input">
                    <option value="plus">加分</option>
                    <option value="minus">减分</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>分值 *</label>
                  <input v-model.number="newScoreItemForm.score_value" type="number" class="input" min="1" required />
                </div>
              </div>
              <p v-if="error" class="error">{{ error }}</p>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? '添加中...' : '确认添加' }}
                </button>
                <button type="button" class="btn" @click="showAddScoreItemForm = false; error = ''">取消</button>
              </div>
            </form>
          </div>

          <div v-if="scoreItems.length === 0 && !showAddScoreItemForm" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="⭐">
            <p class="ui-empty-title">还没有成长项目</p>
            <p class="ui-empty-copy">添加奖励或提醒项目后，学生的园地变化才会更丰富。</p>
          </div>
          <div v-else class="score-item-sections">
            <section class="score-item-section">
              <div class="section-head">
                <h4>学生积分项目 ({{ studentScoreItems.length }})</h4>
                <p>学生评分弹窗只会显示这里的项目。</p>
              </div>
              <div v-if="studentScoreItems.length === 0" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="🎒">
                <p class="ui-empty-title">还没有学生积分项目</p>
                <p class="ui-empty-copy">先添加学生评分项，点击学生后才能直接选择项目评分。</p>
              </div>
              <div v-else class="score-item-list">
                <div v-for="item in studentScoreItems" :key="item.id" class="score-item-card card">
                  <div class="score-item-info">
                    <span :class="['score-badge', item.score_type]">
                      {{ item.score_type === 'plus' ? '+' : '-' }}{{ item.score_value }}
                    </span>
                    <span class="score-item-name">{{ item.name }}</span>
                  </div>
                  <button class="btn-text danger" @click="handleDeleteScoreItem(item.id)">删除</button>
                </div>
              </div>
            </section>

            <section class="score-item-section">
              <div class="section-head">
                <h4>小组积分项目 ({{ groupScoreItems.length }})</h4>
                <p>小组评分弹窗只会显示这里的项目。</p>
              </div>
              <div v-if="groupScoreItems.length === 0" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="👥">
                <p class="ui-empty-title">还没有小组积分项目</p>
                <p class="ui-empty-copy">先添加小组评分项，再给小组选择对应项目。</p>
              </div>
              <div v-else class="score-item-list">
                <div v-for="item in groupScoreItems" :key="item.id" class="score-item-card card">
                  <div class="score-item-info">
                    <span :class="['score-badge', item.score_type]">
                      {{ item.score_type === 'plus' ? '+' : '-' }}{{ item.score_value }}
                    </span>
                    <span class="score-item-name">{{ item.name }}</span>
                  </div>
                  <button class="btn-text danger" @click="handleDeleteScoreItem(item.id)">删除</button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <!-- 统计分析 Tab -->
        <div v-else-if="activeTab === 'stats'" class="stats-tab">
          <div class="stats-overview">
            <div class="stat-card">
              <h4>本周加分</h4>
              <p class="stat-value positive">+{{ statsOverview?.week_plus || 0 }}</p>
            </div>
            <div class="stat-card">
              <h4>本周减分</h4>
              <p class="stat-value negative">-{{ statsOverview?.week_minus || 0 }}</p>
            </div>
            <div class="stat-card">
              <h4>本月加分</h4>
              <p class="stat-value positive">+{{ statsOverview?.month_plus || 0 }}</p>
            </div>
            <div class="stat-card">
              <h4>本月减分</h4>
              <p class="stat-value negative">-{{ statsOverview?.month_minus || 0 }}</p>
            </div>
          </div>

          <h3>学生排名</h3>
          <div v-if="studentStats.length === 0" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="📈">
            <p class="ui-empty-title">还没有学生评分数据</p>
            <p class="ui-empty-copy">先完成几次评分，这里就会长出学生排行榜。</p>
          </div>
          <table v-else class="data-table ui-data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>总分</th>
                <th>本周</th>
                <th>本月</th>
                <th>加分次数</th>
                <th>减分次数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, index) in studentStats" :key="stat.student_id">
                <td>{{ index + 1 }}</td>
                <td>{{ stat.name }}</td>
                <td>{{ stat.total_score }}</td>
                <td :class="stat.week_score >= 0 ? 'positive' : 'negative'">{{ stat.week_score >= 0 ? '+' : '' }}{{ stat.week_score }}</td>
                <td :class="stat.month_score >= 0 ? 'positive' : 'negative'">{{ stat.month_score >= 0 ? '+' : '' }}{{ stat.month_score }}</td>
                <td>{{ stat.plus_count }}</td>
                <td>{{ stat.minus_count }}</td>
              </tr>
            </tbody>
          </table>

          <h3>小组排名</h3>
          <div v-if="groupStats.length === 0" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="🏡">
            <p class="ui-empty-title">还没有小组评分数据</p>
            <p class="ui-empty-copy">小组获得分数后，这里会显示整个花园的成长排名。</p>
          </div>
          <table v-else class="data-table ui-data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>小组名称</th>
                <th>总分</th>
                <th>本周</th>
                <th>本月</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, index) in groupStats" :key="stat.group_id">
                <td>{{ index + 1 }}</td>
                <td>{{ stat.name }}</td>
                <td>{{ stat.total_score }}</td>
                <td :class="stat.week_score >= 0 ? 'positive' : 'negative'">{{ stat.week_score >= 0 ? '+' : '' }}{{ stat.week_score }}</td>
                <td :class="stat.month_score >= 0 ? 'positive' : 'negative'">{{ stat.month_score >= 0 ? '+' : '' }}{{ stat.month_score }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 历史记录 Tab -->
        <div v-else-if="activeTab === 'history'" class="history-tab">
          <section class="history-section">
            <div class="section-head">
              <h3>学生评分历史</h3>
              <p>这里只显示学生个人评分记录。</p>
            </div>
            <div v-if="studentHistoryLogs.length === 0" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="🧑‍🎓">
              <p class="ui-empty-title">暂无学生评分记录</p>
              <p class="ui-empty-copy">第一次给学生评分后，这里会保留每一次成长变化。</p>
            </div>
            <table v-else class="data-table ui-data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>学生</th>
                  <th>项目</th>
                  <th>分值</th>
                  <th>备注</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in studentHistoryLogs" :key="`student-${log.id}`">
                  <td>{{ new Date(log.created_at).toLocaleString() }}</td>
                  <td>{{ log.student_name }}</td>
                  <td>{{ log.item_name_snapshot }}</td>
                  <td :class="log.score_delta >= 0 ? 'positive' : 'negative'">{{ log.score_delta >= 0 ? '+' : '' }}{{ log.score_delta }}</td>
                  <td>{{ log.remark || '-' }}</td>
                  <td>
                    <span v-if="log.is_revoked" class="badge revoked">已撤销</span>
                    <span v-else class="badge normal">正常</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="history-section">
            <div class="section-head">
              <h3>小组评分历史</h3>
              <p>这里只显示小组独立积分记录。</p>
            </div>
            <div v-if="groupHistoryLogs.length === 0" class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="🏡">
              <p class="ui-empty-title">暂无小组评分记录</p>
              <p class="ui-empty-copy">第一次给小组评分后，这里会记录小组协作的每次变化。</p>
            </div>
            <table v-else class="data-table ui-data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>小组</th>
                  <th>项目</th>
                  <th>分值</th>
                  <th>备注</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in groupHistoryLogs" :key="`group-${log.id}`">
                  <td>{{ new Date(log.created_at).toLocaleString() }}</td>
                  <td>{{ log.group_name }}</td>
                  <td>{{ log.item_name_snapshot }}</td>
                  <td :class="log.score_delta >= 0 ? 'positive' : 'negative'">{{ log.score_delta >= 0 ? '+' : '' }}{{ log.score_delta }}</td>
                  <td>{{ log.remark || '-' }}</td>
                  <td>
                    <span v-if="log.is_revoked" class="badge revoked">已撤销</span>
                    <span v-else class="badge normal">正常</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </main>

      <ScoreDialog
        :visible="showScoreDialog"
        :student="selectedStudent"
        :score-items="studentScoreItems"
        :theme="cls?.visual_theme || 'tree'"
        @close="showScoreDialog = false"
        @submit="handleScore"
      />

      <GroupScoreDialog
        :visible="showGroupScoreDialog"
        :group="selectedGroup"
        :score-items="groupScoreItems"
        @close="showGroupScoreDialog = false"
        @submit="handleGroupScore"
      />

      <!-- 小组成员管理对话框 -->
      <div v-if="showGroupMembersDialog" class="dialog-overlay" @click.self="showGroupMembersDialog = false">
        <div class="dialog dialog-wide">
          <h3>管理小组成员 - {{ selectedGroup?.name }}</h3>
          <div class="dialog-content">
            <div class="member-section">
              <h4>当前成员 ({{ groupMembers.length }})</h4>
              <div v-if="groupMembers.length === 0" class="empty-hint">暂无成员</div>
              <div v-else class="member-list">
                <div v-for="member in groupMembers" :key="member.id" class="member-item">
                  <span>{{ member.name }} ({{ member.student_no }})</span>
                  <button class="btn-text danger" @click="handleRemoveMember(member.id)">移除</button>
                </div>
              </div>
            </div>
            <div class="member-section">
              <h4>添加成员</h4>
              <div v-if="availableStudents.length === 0" class="empty-hint">没有可添加的学生（都已分配到其他小组）</div>
              <div v-else class="add-member-form">
                <select v-model="selectedStudentForGroup" class="input">
                  <option value="">选择学生</option>
                  <option v-for="s in availableStudents" :key="s.id" :value="s.id">{{ s.name }} ({{ s.student_no }})</option>
                </select>
                <button class="btn btn-primary" @click="handleAddMember" :disabled="!selectedStudentForGroup || saving">
                  添加
                </button>
              </div>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn" @click="showGroupMembersDialog = false">关闭</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.class-detail-page {
  min-height: 100vh;
  background: var(--cream-100);
  position: relative;
}

/* Decorative background */
.class-detail-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background:
    radial-gradient(circle at 20% 10%, var(--sage-100) 0%, transparent 40%),
    radial-gradient(circle at 80% 90%, var(--terra-100) 0%, transparent 40%);
  z-index: 0;
}

.header {
  background: white;
  padding: var(--space-lg) var(--space-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.header h1 {
  font-size: 1.25rem;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--forest-700);
  letter-spacing: 0.02em;
  margin: 0;
}

.theme-badge {
  padding: 6px 14px;
  background: linear-gradient(135deg, var(--forest-500), var(--sage-500));
  color: white;
  border-radius: var(--radius-full);
  font-family: var(--font-accent);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: 0 2px 8px rgba(61, 122, 82, 0.25);
}

.loading {
  position: relative;
  z-index: 1;
}

.stats-bar {
  display: flex;
  background: white;
  padding: var(--space-lg) var(--space-xl);
  gap: var(--space-2xl);
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cream-200);
  position: relative;
  z-index: 1;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm) var(--space-lg);
  transition: transform var(--duration-fast) var(--ease-out);
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-label {
  font-family: var(--font-accent);
  font-size: 12px;
  color: var(--brown-400);
  margin-bottom: 4px;
  letter-spacing: 0.04em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  font-family: var(--font-number);
  font-variant-numeric: tabular-nums lining-nums;
}

.stat-value.positive { color: var(--forest-500); }
.stat-value.negative { color: var(--danger); }

.btn-garden {
  margin-left: auto;
  background: linear-gradient(135deg, var(--forest-500), var(--sage-500));
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: 0 4px 16px rgba(61, 122, 82, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-garden:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 24px rgba(61, 122, 82, 0.4);
}

.tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid var(--cream-200);
  overflow-x: auto;
  position: relative;
  z-index: 1;
}

.tab {
  padding: var(--space-md) var(--space-xl);
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-accent);
  font-size: 14px;
  font-weight: 500;
  color: var(--brown-400);
  border-bottom: 3px solid transparent;
  white-space: nowrap;
  letter-spacing: 0.04em;
  transition: all var(--duration-fast) var(--ease-out);
}

.tab:hover {
  color: var(--forest-700);
  background: var(--cream-100);
}

.tab.active {
  color: var(--forest-700);
  border-bottom-color: var(--forest-500);
  font-weight: 700;
}

.content {
  padding: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.tab-placeholder {
  text-align: center;
  padding: 80px 24px;
  color: var(--brown-400);
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.new-class-form {
  max-width: 600px;
  margin: var(--space-xl) auto;
  padding: var(--space-xl);
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.new-class-form h2 {
  margin-bottom: var(--space-lg);
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.02em;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-sm);
  font-family: var(--font-accent);
  font-weight: 600;
  color: var(--forest-700);
  font-size: 14px;
  letter-spacing: 0.04em;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
  border-radius: var(--radius-md);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.form-actions .btn {
  flex: 1;
  transition: all var(--duration-fast) var(--ease-spring);
}

.form-actions .btn:hover {
  transform: translateY(-2px);
}

.error {
  color: var(--danger);
  margin-bottom: var(--space-md);
  text-align: center;
  padding: var(--space-md);
  background: rgba(194, 84, 80, 0.1);
  border-radius: var(--radius-md);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.tab-header h3 {
  font-size: 1.1rem;
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.02em;
  margin: 0;
}

.add-form {
  margin-bottom: var(--space-xl);
  padding: var(--space-lg);
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  animation: fadeInUp 0.3s var(--ease-out);
}

.add-form h4 {
  margin-bottom: var(--space-md);
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.02em;
}

.form-row {
  display: flex;
  gap: var(--space-md);
}

.form-row .form-group {
  flex: 1;
}

.student-list {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.btn-text {
  background: none;
  border: none;
  color: var(--forest-500);
  cursor: pointer;
  padding: var(--space-xs) var(--space-sm);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-out);
}

.btn-text:hover {
  background: var(--forest-100);
  color: var(--forest-700);
}

.btn-text.danger {
  color: var(--danger);
}

.btn-text.danger:hover {
  background: rgba(194, 84, 80, 0.1);
}

.group-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.group-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  transition: all var(--duration-normal) var(--ease-out);
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.group-info h4 {
  margin: 0 0 var(--space-xs) 0;
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.015em;
}

.group-info {
  display: grid;
  gap: 4px;
}

.member-count {
  font-size: 13px;
  color: var(--brown-400);
}

.group-total-score {
  font-size: 13px;
  color: var(--forest-700);
  font-weight: 700;
}

.group-actions {
  display: flex;
  gap: var(--space-sm);
}

.score-item-sections,
.history-tab {
  display: grid;
  gap: var(--space-lg);
}

.score-item-section,
.history-section {
  display: grid;
  gap: var(--space-md);
}

.section-head {
  display: grid;
  gap: 4px;
}

.section-head h3,
.section-head h4 {
  margin: 0;
  color: var(--forest-700);
  font-family: var(--font-display);
}

.section-head p {
  margin: 0;
  color: var(--brown-400);
  font-size: 0.92rem;
}

.score-item-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.score-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  transition: all var(--duration-fast) var(--ease-out);
}

.score-item-card:hover {
  background: var(--cream-100);
}

.score-item-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.score-badge {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-accent);
  letter-spacing: 0.04em;
}

.score-badge.plus {
  background: var(--forest-100);
  color: var(--forest-700);
}

.score-badge.minus {
  background: rgba(194, 84, 80, 0.1);
  color: var(--danger);
}

.score-item-name {
  font-size: 15px;
  color: var(--brown-600);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
  }

  .stats-bar {
    justify-content: center;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
  }

  .btn-garden {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }

  .tabs {
    justify-content: flex-start;
  }

  .form-row {
    flex-direction: column;
  }

  .content {
    padding: var(--space-md);
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 58, 36, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s var(--ease-out);
}

.dialog {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  animation: fadeInScale 0.3s var(--ease-out);
}

.dialog h3 {
  margin: 0 0 var(--space-lg) 0;
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.02em;
}

.dialog-content {
  padding: var(--space-sm) 0;
}

.student-name {
  font-size: 1.25rem;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.02em;
  margin-bottom: var(--space-md);
  text-align: center;
}

.dialog-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.dialog-actions .btn {
  flex: 1;
  transition: all var(--duration-fast) var(--ease-spring);
}

.dialog-actions .btn:hover {
  transform: translateY(-2px);
}

.dialog-wide {
  max-width: 500px;
}

.member-section {
  margin-bottom: var(--space-lg);
}

.member-section h4 {
  font-size: 13px;
  color: var(--brown-400);
  font-family: var(--font-accent);
  margin: 0 0 var(--space-sm) 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-hint {
  color: var(--brown-400);
  font-size: 14px;
  padding: var(--space-md) 0;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--cream-100);
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-out);
}

.member-item:hover {
  background: var(--cream-200);
}

.add-member-form {
  display: flex;
  gap: var(--space-sm);
}

.add-member-form select {
  flex: 1;
  border-radius: var(--radius-md);
}

.student-row {
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.student-row:hover {
  background-color: var(--cream-100);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background: white;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--ease-out);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card h4 {
  margin: 0 0 var(--space-sm) 0;
  font-size: 13px;
  color: var(--brown-400);
  font-family: var(--font-accent);
  font-weight: 500;
  letter-spacing: 0.04em;
}

.stat-card .stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  font-family: var(--font-number);
  font-variant-numeric: tabular-nums lining-nums;
  margin: 0;
}

.stat-card .stat-value.positive {
  color: var(--forest-500);
}

.stat-card .stat-value.negative {
  color: var(--danger);
}

.stats-tab h3,
.history-tab > h3 {
  margin: var(--space-lg) 0 var(--space-md) 0;
  font-size: 1rem;
  font-family: var(--font-display);
  color: var(--forest-700);
  letter-spacing: 0.02em;
}

.positive {
  color: var(--forest-500);
  font-weight: 500;
}

.negative {
  color: var(--danger);
  font-weight: 500;
}

.badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: var(--font-accent);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.badge.normal {
  background: var(--forest-100);
  color: var(--forest-700);
}

.badge.revoked {
  background: var(--cream-200);
  color: var(--brown-400);
}
</style>
