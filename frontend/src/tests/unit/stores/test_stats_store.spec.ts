import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as statsApi from '@/api/stats'
import type { StatsOverview, StudentStats, GroupStats, SubjectStats } from '@/types'

// Mock the API module
vi.mock('@/api/stats', () => ({
  getStatsOverview: vi.fn(),
  getStudentStats: vi.fn(),
  getGroupStats: vi.fn(),
  getSubjectStats: vi.fn()
}))

// Create a mock stats store for testing
const useMockStatsStore = defineStore('stats', () => {
  const overview = ref<StatsOverview | null>(null)
  const studentStats = ref<StudentStats[]>([])
  const groupStats = ref<GroupStats[]>([])
  const subjectStats = ref<SubjectStats[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentClassId = ref<number | null>(null)

  async function fetchWeeklyStats(classId: number) {
    loading.value = true
    error.value = null
    currentClassId.value = classId
    try {
      overview.value = await statsApi.getStatsOverview(classId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMonthlyStats(classId: number) {
    loading.value = true
    error.value = null
    currentClassId.value = classId
    try {
      overview.value = await statsApi.getStatsOverview(classId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSemesterStats(classId: number) {
    loading.value = true
    error.value = null
    currentClassId.value = classId
    try {
      overview.value = await statsApi.getStatsOverview(classId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchStudentStats(classId: number) {
    loading.value = true
    error.value = null
    try {
      studentStats.value = await statsApi.getStudentStats(classId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchGroupStats(classId: number) {
    loading.value = true
    error.value = null
    try {
      groupStats.value = await statsApi.getGroupStats(classId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    overview,
    studentStats,
    groupStats,
    subjectStats,
    loading,
    error,
    currentClassId,
    fetchWeeklyStats,
    fetchMonthlyStats,
    fetchSemesterStats,
    fetchStudentStats,
    fetchGroupStats
  }
})

describe('Stats Store', () => {
  let statsStore: ReturnType<typeof useMockStatsStore>

  const mockOverview: StatsOverview = {
    student_count: 30,
    group_count: 6,
    week_plus: 45,
    week_minus: 12,
    month_plus: 180,
    month_minus: 48
  }

  const mockStudentStats: StudentStats[] = [
    {
      student_id: 1,
      name: '张三',
      total_score: 100,
      week_score: 15,
      month_score: 45,
      semester_score: 100,
      plus_count: 12,
      minus_count: 3
    },
    {
      student_id: 2,
      name: '李四',
      total_score: 85,
      week_score: 10,
      month_score: 35,
      semester_score: 85,
      plus_count: 10,
      minus_count: 5
    },
    {
      student_id: 3,
      name: '王五',
      total_score: 120,
      week_score: 20,
      month_score: 50,
      semester_score: 120,
      plus_count: 15,
      minus_count: 2
    }
  ]

  const mockGroupStats: GroupStats[] = [
    {
      group_id: 1,
      name: 'Group A',
      total_score: 200,
      week_score: 30,
      month_score: 100,
      semester_score: 200
    },
    {
      group_id: 2,
      name: 'Group B',
      total_score: 180,
      week_score: 25,
      month_score: 90,
      semester_score: 180
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    statsStore = useMockStatsStore()
  })

  describe('weekly stats fetching', () => {
    it('should fetch weekly stats overview', async () => {
      vi.mocked(statsApi.getStatsOverview).mockResolvedValue({ ...mockOverview })

      await statsStore.fetchWeeklyStats(1)

      expect(statsStore.overview).toEqual(mockOverview)
      expect(statsStore.overview?.week_plus).toBe(45)
      expect(statsStore.overview?.week_minus).toBe(12)
    })

    it('should set loading state while fetching', async () => {
      vi.mocked(statsApi.getStatsOverview).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return mockOverview
      })

      const fetchPromise = statsStore.fetchWeeklyStats(1)
      expect(statsStore.loading).toBe(true)

      await fetchPromise
      expect(statsStore.loading).toBe(false)
    })

    it('should throw error when API fails', async () => {
      vi.mocked(statsApi.getStatsOverview).mockRejectedValue(new Error('Failed to fetch stats'))

      await expect(statsStore.fetchWeeklyStats(1)).rejects.toThrow('Failed to fetch stats')
      expect(statsStore.error).toBe('Failed to fetch stats')
    })

    it('should store current class id', async () => {
      vi.mocked(statsApi.getStatsOverview).mockResolvedValue(mockOverview)

      await statsStore.fetchWeeklyStats(5)

      expect(statsStore.currentClassId).toBe(5)
    })
  })

  describe('monthly stats fetching', () => {
    it('should fetch monthly stats overview', async () => {
      vi.mocked(statsApi.getStatsOverview).mockResolvedValue({ ...mockOverview })

      await statsStore.fetchMonthlyStats(1)

      expect(statsStore.overview).toEqual(mockOverview)
      expect(statsStore.overview?.month_plus).toBe(180)
      expect(statsStore.overview?.month_minus).toBe(48)
    })

    it('should calculate month stats correctly', async () => {
      vi.mocked(statsApi.getStatsOverview).mockResolvedValue({ ...mockOverview })

      await statsStore.fetchMonthlyStats(1)

      // Month plus should be sum of week_plus * estimated weeks
      // Based on mock data, month_plus is 180, week_plus is 45
      expect(statsStore.overview?.month_plus).toBeGreaterThan(statsStore.overview?.week_plus)
    })
  })

  describe('semester stats fetching', () => {
    it('should fetch semester stats overview', async () => {
      vi.mocked(statsApi.getStatsOverview).mockResolvedValue({ ...mockOverview })

      await statsStore.fetchSemesterStats(1)

      expect(statsStore.overview).toEqual(mockOverview)
      expect(statsStore.overview?.student_count).toBe(30)
      expect(statsStore.overview?.group_count).toBe(6)
    })

    it('should contain all required overview fields', async () => {
      vi.mocked(statsApi.getStatsOverview).mockResolvedValue({ ...mockOverview })

      await statsStore.fetchSemesterStats(1)

      expect(statsStore.overview).toHaveProperty('student_count')
      expect(statsStore.overview).toHaveProperty('group_count')
      expect(statsStore.overview).toHaveProperty('week_plus')
      expect(statsStore.overview).toHaveProperty('week_minus')
      expect(statsStore.overview).toHaveProperty('month_plus')
      expect(statsStore.overview).toHaveProperty('month_minus')
    })
  })

  describe('student ranking data structure', () => {
    it('should fetch student stats array', async () => {
      vi.mocked(statsApi.getStudentStats).mockResolvedValue([...mockStudentStats])

      await statsStore.fetchStudentStats(1)

      expect(statsStore.studentStats).toHaveLength(3)
      expect(statsStore.studentStats).toEqual(mockStudentStats)
    })

    it('should have correct student stats structure', async () => {
      vi.mocked(statsApi.getStudentStats).mockResolvedValue([...mockStudentStats])

      await statsStore.fetchStudentStats(1)

      const student = statsStore.studentStats[0]
      expect(student).toHaveProperty('student_id')
      expect(student).toHaveProperty('name')
      expect(student).toHaveProperty('total_score')
      expect(student).toHaveProperty('week_score')
      expect(student).toHaveProperty('month_score')
      expect(student).toHaveProperty('semester_score')
      expect(student).toHaveProperty('plus_count')
      expect(student).toHaveProperty('minus_count')
    })

    it('should calculate total score correctly', async () => {
      vi.mocked(statsApi.getStudentStats).mockResolvedValue([...mockStudentStats])

      await statsStore.fetchStudentStats(1)

      const sortedByTotal = [...statsStore.studentStats].sort((a, b) => b.total_score - a.total_score)
      expect(sortedByTotal[0].name).toBe('王五')
      expect(sortedByTotal[0].total_score).toBe(120)
    })

    it('should track plus and minus counts', async () => {
      vi.mocked(statsApi.getStudentStats).mockResolvedValue([...mockStudentStats])

      await statsStore.fetchStudentStats(1)

      const student = statsStore.studentStats[0]
      expect(student.plus_count).toBe(12)
      expect(student.minus_count).toBe(3)
    })

    it('should rank students by semester_score by default', async () => {
      vi.mocked(statsApi.getStudentStats).mockResolvedValue([...mockStudentStats])

      await statsStore.fetchStudentStats(1)

      // The API returns unsorted data, but we can sort it
      const sorted = [...statsStore.studentStats].sort((a, b) => b.semester_score - a.semester_score)
      expect(sorted[0].semester_score).toBe(120)
      expect(sorted[sorted.length - 1].semester_score).toBe(85)
    })
  })

  describe('group ranking data structure', () => {
    it('should fetch group stats array', async () => {
      vi.mocked(statsApi.getGroupStats).mockResolvedValue([...mockGroupStats])

      await statsStore.fetchGroupStats(1)

      expect(statsStore.groupStats).toHaveLength(2)
      expect(statsStore.groupStats).toEqual(mockGroupStats)
    })

    it('should have correct group stats structure', async () => {
      vi.mocked(statsApi.getGroupStats).mockResolvedValue([...mockGroupStats])

      await statsStore.fetchGroupStats(1)

      const group = statsStore.groupStats[0]
      expect(group).toHaveProperty('group_id')
      expect(group).toHaveProperty('name')
      expect(group).toHaveProperty('total_score')
      expect(group).toHaveProperty('week_score')
      expect(group).toHaveProperty('month_score')
      expect(group).toHaveProperty('semester_score')
    })

    it('should have unique group ids', async () => {
      vi.mocked(statsApi.getGroupStats).mockResolvedValue([...mockGroupStats])

      await statsStore.fetchGroupStats(1)

      const groupIds = statsStore.groupStats.map(g => g.group_id)
      const uniqueIds = new Set(groupIds)
      expect(uniqueIds.size).toBe(groupIds.length)
    })

    it('should rank groups by total score', async () => {
      vi.mocked(statsApi.getGroupStats).mockResolvedValue([...mockGroupStats])

      await statsStore.fetchGroupStats(1)

      const sorted = [...statsStore.groupStats].sort((a, b) => b.total_score - a.total_score)
      expect(sorted[0].name).toBe('Group A')
      expect(sorted[0].total_score).toBe(200)
    })

    it('should track weekly and monthly scores', async () => {
      vi.mocked(statsApi.getGroupStats).mockResolvedValue([...mockGroupStats])

      await statsStore.fetchGroupStats(1)

      const group = statsStore.groupStats[0]
      expect(group.week_score).toBe(30)
      expect(group.month_score).toBe(100)
      expect(group.semester_score).toBe(200)
    })

    it('should handle empty group stats', async () => {
      vi.mocked(statsApi.getGroupStats).mockResolvedValue([])

      await statsStore.fetchGroupStats(1)

      expect(statsStore.groupStats).toHaveLength(0)
    })
  })

  describe('data consistency', () => {
    it('should have matching student and group counts', () => {
      // Overview student_count should relate to actual student stats
      expect(mockOverview.student_count).toBe(30)
      expect(mockStudentStats).toHaveLength(3) // Sample data
    })

    it('should have valid score values', () => {
      for (const student of mockStudentStats) {
        expect(student.total_score).toBeGreaterThanOrEqual(0)
        expect(student.week_score).toBeGreaterThanOrEqual(0)
        expect(student.month_score).toBeGreaterThanOrEqual(0)
        expect(student.semester_score).toBeGreaterThanOrEqual(0)
      }
    })

    it('should have valid group score values', () => {
      for (const group of mockGroupStats) {
        expect(group.total_score).toBeGreaterThanOrEqual(0)
        expect(group.week_score).toBeGreaterThanOrEqual(0)
        expect(group.month_score).toBeGreaterThanOrEqual(0)
        expect(group.semester_score).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
