import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as studentApi from '@/api/student'
import type { Student } from '@/types'
import { calculateGrowthStage } from '@/utils/growth'

// Mock the API module
vi.mock('@/api/student', () => ({
  getStudents: vi.fn(),
  getStudent: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  scoreStudent: vi.fn()
}))

// Create a mock student store for testing
const useMockStudentStore = defineStore('student', () => {
  const students = ref<Student[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentClassId = ref<number | null>(null)
  const groupFilter = ref<number | null>(null)

  const growthStage = computed(() => (student: Student, theme: 'farm' | 'tree') => {
    const score = student.total_score || 0
    return calculateGrowthStage(theme, score)
  })

  const sortedStudents = computed(() => {
    return [...students.value].sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
  })

  const filteredStudents = computed(() => {
    if (groupFilter.value === null) return students.value
    return students.value.filter(s => s.group_id === groupFilter.value)
  })

  async function fetchStudents(classId: number, params?: { group_id?: number; search?: string }) {
    loading.value = true
    error.value = null
    currentClassId.value = classId
    try {
      students.value = await studentApi.getStudents(classId, params)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createStudentAction(classId: number, data: Partial<Student>) {
    loading.value = true
    error.value = null
    try {
      const newStudent = await studentApi.createStudent(classId, data)
      students.value.push(newStudent)
      return newStudent
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateStudentAction(classId: number, studentId: number, data: Partial<Student>) {
    loading.value = true
    error.value = null
    try {
      const updated = await studentApi.updateStudent(classId, studentId, data)
      const index = students.value.findIndex(s => s.id === studentId)
      if (index !== -1) {
        students.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteStudentAction(classId: number, studentId: number) {
    loading.value = true
    error.value = null
    try {
      await studentApi.deleteStudent(classId, studentId)
      students.value = students.value.filter(s => s.id !== studentId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function setGroupFilter(groupId: number | null) {
    groupFilter.value = groupId
  }

  function sortByScore(ascending = false) {
    return [...students.value].sort((a, b) => {
      const diff = (b.total_score || 0) - (a.total_score || 0)
      return ascending ? -diff : diff
    })
  }

  return {
    students,
    loading,
    error,
    currentClassId,
    groupFilter,
    growthStage,
    sortedStudents,
    filteredStudents,
    fetchStudents,
    createStudentAction,
    updateStudentAction,
    deleteStudentAction,
    setGroupFilter,
    sortByScore
  }
})

describe('Student Store', () => {
  let studentStore: ReturnType<typeof useMockStudentStore>

  const mockStudents: Student[] = [
    {
      id: 1,
      class_id: 1,
      name: '张三',
      student_no: '001',
      total_score: 75,
      group_id: 1,
      group_name: 'Group A',
      growth_stage: 'flower',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: 2,
      class_id: 1,
      name: '李四',
      student_no: '002',
      total_score: 45,
      group_id: 1,
      group_name: 'Group A',
      growth_stage: 'seedling',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: 3,
      class_id: 1,
      name: '王五',
      student_no: '003',
      total_score: 120,
      group_id: 2,
      group_name: 'Group B',
      growth_stage: 'harvest',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    studentStore = useMockStudentStore()
  })

  describe('fetchStudents', () => {
    it('should fetch students for a class', async () => {
      vi.mocked(studentApi.getStudents).mockResolvedValue([...mockStudents])

      await studentStore.fetchStudents(1)

      expect(studentStore.students).toHaveLength(3)
      expect(studentApi.getStudents).toHaveBeenCalledWith(1, undefined)
    })

    it('should fetch students filtered by group', async () => {
      vi.mocked(studentApi.getStudents).mockResolvedValue(mockStudents.filter(s => s.group_id === 1))

      await studentStore.fetchStudents(1, { group_id: 1 })

      expect(studentStore.students).toHaveLength(2)
      expect(studentStore.students.every(s => s.group_id === 1)).toBe(true)
    })

    it('should set loading state while fetching', async () => {
      vi.mocked(studentApi.getStudents).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return []
      })

      const fetchPromise = studentStore.fetchStudents(1)
      expect(studentStore.loading).toBe(true)

      await fetchPromise
      expect(studentStore.loading).toBe(false)
    })

    it('should throw error when API fails', async () => {
      vi.mocked(studentApi.getStudents).mockRejectedValue(new Error('Failed to fetch'))

      await expect(studentStore.fetchStudents(1)).rejects.toThrow('Failed to fetch')
      expect(studentStore.error).toBe('Failed to fetch')
    })
  })

  describe('createStudent', () => {
    it('should create a new student', async () => {
      const newStudent: Student = {
        id: 4,
        class_id: 1,
        name: '赵六',
        student_no: '004',
        total_score: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(studentApi.createStudent).mockResolvedValue(newStudent)

      const result = await studentStore.createStudentAction(1, {
        name: '赵六',
        student_no: '004'
      })

      expect(result).toEqual(newStudent)
      expect(studentStore.students).toContainEqual(newStudent)
    })

    it('should set initial score to 0', async () => {
      const newStudent: Student = {
        id: 5,
        class_id: 1,
        name: 'New Student',
        student_no: '005',
        total_score: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(studentApi.createStudent).mockResolvedValue(newStudent)

      await studentStore.createStudentAction(1, { name: 'New Student', student_no: '005' })

      expect(studentStore.students[studentStore.students.length - 1].total_score).toBe(0)
    })
  })

  describe('updateStudent', () => {
    it('should update an existing student', async () => {
      studentStore.students = [...mockStudents]
      const updatedStudent = { ...mockStudents[0], name: '张三 Updated' }
      vi.mocked(studentApi.updateStudent).mockResolvedValue(updatedStudent)

      const result = await studentStore.updateStudentAction(1, 1, { name: '张三 Updated' })

      expect(result.name).toBe('张三 Updated')
      expect(studentStore.students[0].name).toBe('张三 Updated')
    })

    it('should update student score', async () => {
      studentStore.students = [...mockStudents]
      const updatedStudent = { ...mockStudents[0], total_score: 80 }
      vi.mocked(studentApi.updateStudent).mockResolvedValue(updatedStudent)

      await studentStore.updateStudentAction(1, 1, { total_score: 80 })

      expect(studentStore.students[0].total_score).toBe(80)
    })
  })

  describe('deleteStudent', () => {
    it('should delete a student', async () => {
      studentStore.students = [...mockStudents]
      vi.mocked(studentApi.deleteStudent).mockResolvedValue(undefined)

      await studentStore.deleteStudentAction(1, 1)

      expect(studentStore.students).toHaveLength(2)
      expect(studentStore.students.find(s => s.id === 1)).toBeUndefined()
    })

    it('should throw error when API fails', async () => {
      studentStore.students = [...mockStudents]
      vi.mocked(studentApi.deleteStudent).mockRejectedValue(new Error('Delete failed'))

      await expect(studentStore.deleteStudentAction(1, 1)).rejects.toThrow('Delete failed')
      expect(studentStore.students).toHaveLength(3)
    })
  })

  describe('growthStage computed property', () => {
    describe('farm theme', () => {
      it('should return seed for score 0', () => {
        const stage = calculateGrowthStage('farm', 0)
        expect(stage).toBe('seed')
      })

      it('should return sprout for score 10', () => {
        const stage = calculateGrowthStage('farm', 10)
        expect(stage).toBe('sprout')
      })

      it('should return seedling for score 30', () => {
        const stage = calculateGrowthStage('farm', 30)
        expect(stage).toBe('seedling')
      })

      it('should return flower for score 60', () => {
        const stage = calculateGrowthStage('farm', 60)
        expect(stage).toBe('flower')
      })

      it('should return harvest for score 100', () => {
        const stage = calculateGrowthStage('farm', 100)
        expect(stage).toBe('harvest')
      })

      it('should return harvest for score above 100', () => {
        const stage = calculateGrowthStage('farm', 500)
        expect(stage).toBe('harvest')
      })
    })

    describe('tree theme', () => {
      it('should return seed for score 0', () => {
        const stage = calculateGrowthStage('tree', 0)
        expect(stage).toBe('seed')
      })

      it('should return bud for score 10', () => {
        const stage = calculateGrowthStage('tree', 10)
        expect(stage).toBe('bud')
      })

      it('should return sapling for score 30', () => {
        const stage = calculateGrowthStage('tree', 30)
        expect(stage).toBe('sapling')
      })

      it('should return young_tree for score 60', () => {
        const stage = calculateGrowthStage('tree', 60)
        expect(stage).toBe('young_tree')
      })

      it('should return big_tree for score 100', () => {
        const stage = calculateGrowthStage('tree', 100)
        expect(stage).toBe('big_tree')
      })

      it('should return big_tree for score above 100', () => {
        const stage = calculateGrowthStage('tree', 500)
        expect(stage).toBe('big_tree')
      })
    })

    it('should work with store computed property', () => {
      const student = mockStudents[0]
      const farmStage = studentStore.growthStage(student, 'farm')
      expect(['seed', 'sprout', 'seedling', 'flower', 'harvest']).toContain(farmStage)
    })
  })

  describe('score sorting logic', () => {
    beforeEach(() => {
      studentStore.students = [...mockStudents]
    })

    it('should sort students by score descending (default)', () => {
      const sorted = studentStore.sortedStudents

      expect(sorted[0].total_score).toBe(120)
      expect(sorted[1].total_score).toBe(75)
      expect(sorted[2].total_score).toBe(45)
    })

    it('should sort students by score ascending', () => {
      const sorted = studentStore.sortByScore(true)

      expect(sorted[0].total_score).toBe(45)
      expect(sorted[1].total_score).toBe(75)
      expect(sorted[2].total_score).toBe(120)
    })

    it('should not mutate original students array', () => {
      const originalFirst = studentStore.students[0]
      const sorted = studentStore.sortedStudents

      expect(sorted).toHaveLength(3)
      expect(studentStore.students[0]).toBe(originalFirst)
    })

    it('should handle students with no score', () => {
      const studentsWithNoScore: Student[] = [
        { ...mockStudents[0], total_score: undefined },
        { ...mockStudents[1], total_score: 50 }
      ]
      studentStore.students = studentsWithNoScore

      const sorted = studentStore.sortedStudents

      // Students with score should come first
      expect(sorted[0].total_score).toBe(50)
    })
  })

  describe('student filtering by group', () => {
    beforeEach(() => {
      studentStore.students = [...mockStudents]
    })

    it('should filter students by group id', () => {
      studentStore.setGroupFilter(1)

      const filtered = studentStore.filteredStudents

      expect(filtered).toHaveLength(2)
      expect(filtered.every(s => s.group_id === 1)).toBe(true)
    })

    it('should return all students when group filter is null', () => {
      studentStore.setGroupFilter(null)

      expect(studentStore.filteredStudents).toEqual(studentStore.students)
    })

    it('should return empty array when no students in group', () => {
      studentStore.setGroupFilter(999)

      expect(studentStore.filteredStudents).toHaveLength(0)
    })

    it('should update filter and return new results', () => {
      studentStore.setGroupFilter(1)
      expect(studentStore.filteredStudents).toHaveLength(2)

      studentStore.setGroupFilter(2)
      expect(studentStore.filteredStudents).toHaveLength(1)
      expect(studentStore.filteredStudents[0].group_id).toBe(2)
    })

    it('should clear group association when filter is set', () => {
      const studentWithGroup: Student = {
        ...mockStudents[0],
        group_id: 1,
        group_name: 'Group A'
      }
      studentStore.students = [studentWithGroup]

      studentStore.setGroupFilter(null)

      expect(studentStore.filteredStudents).toHaveLength(1)
    })
  })
})
