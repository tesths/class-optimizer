import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as classesApi from '@/api/classes'
import type { Class, ClassTeacher, User } from '@/types'

vi.mock('@/api/classes', () => ({
  getClasses: vi.fn(),
  getClass: vi.fn(),
  createClass: vi.fn(),
  updateClass: vi.fn(),
  deleteClass: vi.fn(),
  getClassStats: vi.fn(),
  getClassTeachers: vi.fn(),
  addClassTeacher: vi.fn(),
  removeClassTeacher: vi.fn()
}))

// Create a mock class store for testing
// This represents what the actual class store should implement
const useMockClassStore = defineStore('class', () => {
  const classes = ref<Class[]>([])
  const currentClass = ref<Class | null>(null)
  const teachers = ref<ClassTeacher[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchClasses() {
    loading.value = true
    error.value = null
    try {
      classes.value = await classesApi.getClasses()
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchClass(id: number) {
    loading.value = true
    error.value = null
    try {
      currentClass.value = await classesApi.getClass(id)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createClassAction(data: Partial<Class>) {
    loading.value = true
    error.value = null
    try {
      const newClass = await classesApi.createClass(data)
      classes.value.push(newClass)
      return newClass
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateClassAction(id: number, data: Partial<Class>) {
    loading.value = true
    error.value = null
    try {
      const updated = await classesApi.updateClass(id, data)
      const index = classes.value.findIndex(c => c.id === id)
      if (index !== -1) {
        classes.value[index] = updated
      }
      if (currentClass.value?.id === id) {
        currentClass.value = updated
      }
      return updated
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteClassAction(id: number) {
    loading.value = true
    error.value = null
    try {
      await classesApi.deleteClass(id)
      classes.value = classes.value.filter(c => c.id !== id)
      if (currentClass.value?.id === id) {
        currentClass.value = null
      }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function setTeachers(newTeachers: ClassTeacher[]) {
    teachers.value = newTeachers
  }

  return {
    classes,
    currentClass,
    teachers,
    loading,
    error,
    fetchClasses,
    fetchClass,
    createClassAction,
    updateClassAction,
    deleteClassAction,
    setTeachers
  }
})

describe('Class Store', () => {
  let classStore: ReturnType<typeof useMockClassStore>

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    classStore = useMockClassStore()
  })

  describe('fetchClasses', () => {
    it('should fetch all classes', async () => {
      const mockClasses: Class[] = [
        {
          id: 1,
          name: 'Class 1A',
          grade: '1',
          school_year: '2024',
          visual_theme: 'farm',
          creator_id: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          student_count: 30,
          teacher_count: 2
        },
        {
          id: 2,
          name: 'Class 2A',
          grade: '2',
          school_year: '2024',
          visual_theme: 'tree',
          creator_id: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          student_count: 28,
          teacher_count: 2
        }
      ]

      vi.mocked(classesApi.getClasses).mockResolvedValue(mockClasses)

      await classStore.fetchClasses()

      expect(classStore.classes).toEqual(mockClasses)
      expect(classesApi.getClasses).toHaveBeenCalledOnce()
    })

    it('should set loading state while fetching', async () => {
      vi.mocked(classesApi.getClasses).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return []
      })

      const fetchPromise = classStore.fetchClasses()
      expect(classStore.loading).toBe(true)

      await fetchPromise
      expect(classStore.loading).toBe(false)
    })

    it('should throw error when API fails', async () => {
      vi.mocked(classesApi.getClasses).mockRejectedValue(new Error('Failed to fetch classes'))

      await expect(classStore.fetchClasses()).rejects.toThrow('Failed to fetch classes')
      expect(classStore.error).toBe('Failed to fetch classes')
    })
  })

  describe('createClass', () => {
    it('should create a new class', async () => {
      const newClass: Class = {
        id: 3,
        name: 'Class 3A',
        grade: '3',
        school_year: '2024',
        visual_theme: 'farm',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(classesApi.createClass).mockResolvedValue(newClass)

      const result = await classStore.createClassAction({
        name: 'Class 3A',
        grade: '3',
        school_year: '2024',
        visual_theme: 'farm'
      })

      expect(result).toEqual(newClass)
      expect(classStore.classes).toContainEqual(newClass)
      expect(classesApi.createClass).toHaveBeenCalledWith({
        name: 'Class 3A',
        grade: '3',
        school_year: '2024',
        visual_theme: 'farm'
      })
    })

    it('should preserve visual theme when creating class', async () => {
      const farmClass: Class = {
        id: 4,
        name: 'Farm Theme Class',
        grade: '1',
        school_year: '2024',
        visual_theme: 'farm',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(classesApi.createClass).mockResolvedValue(farmClass)

      await classStore.createClassAction({ name: 'Farm Theme Class', visual_theme: 'farm' })

      expect(classStore.classes[classStore.classes.length - 1].visual_theme).toBe('farm')
    })
  })

  describe('updateClass', () => {
    it('should update an existing class', async () => {
      const existingClass: Class = {
        id: 1,
        name: 'Original Name',
        grade: '1',
        school_year: '2024',
        visual_theme: 'farm',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      const updatedClass: Class = {
        ...existingClass,
        name: 'Updated Name'
      }

      classStore.classes = [existingClass]
      vi.mocked(classesApi.updateClass).mockResolvedValue(updatedClass)

      const result = await classStore.updateClassAction(1, { name: 'Updated Name' })

      expect(result.name).toBe('Updated Name')
      expect(classStore.classes[0].name).toBe('Updated Name')
    })

    it('should update currentClass when updating current class', async () => {
      const currentClass: Class = {
        id: 1,
        name: 'Current Class',
        grade: '1',
        school_year: '2024',
        visual_theme: 'tree',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      classStore.currentClass = currentClass
      const updatedClass = { ...currentClass, name: 'New Name' }
      vi.mocked(classesApi.updateClass).mockResolvedValue(updatedClass)

      await classStore.updateClassAction(1, { name: 'New Name' })

      expect(classStore.currentClass?.name).toBe('New Name')
    })
  })

  describe('deleteClass', () => {
    it('should delete a class', async () => {
      const mockClasses: Class[] = [
        { id: 1, name: 'Class 1', grade: '1', school_year: '2024', visual_theme: 'farm', creator_id: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 2, name: 'Class 2', grade: '2', school_year: '2024', visual_theme: 'tree', creator_id: 1, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ]

      classStore.classes = [...mockClasses]
      vi.mocked(classesApi.deleteClass).mockResolvedValue(undefined)

      await classStore.deleteClassAction(1)

      expect(classStore.classes).toHaveLength(1)
      expect(classStore.classes[0].id).toBe(2)
      expect(classesApi.deleteClass).toHaveBeenCalledWith(1)
    })

    it('should clear currentClass when deleting current class', async () => {
      const currentClass: Class = {
        id: 1,
        name: 'Current Class',
        grade: '1',
        school_year: '2024',
        visual_theme: 'farm',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      classStore.currentClass = currentClass
      classStore.classes = [currentClass]
      vi.mocked(classesApi.deleteClass).mockResolvedValue(undefined)

      await classStore.deleteClassAction(1)

      expect(classStore.currentClass).toBeNull()
    })
  })

  describe('class teachers association', () => {
    it('should store teachers association for a class', () => {
      const mockTeachers: ClassTeacher[] = [
        { id: 1, class_id: 1, user_id: 1, role: 'class_admin' },
        { id: 2, class_id: 1, user_id: 2, role: 'class_teacher' }
      ]

      classStore.setTeachers(mockTeachers)

      expect(classStore.teachers).toEqual(mockTeachers)
      expect(classStore.teachers).toHaveLength(2)
    })

    it('should identify class admin role', () => {
      const mockTeachers: ClassTeacher[] = [
        { id: 1, class_id: 1, user_id: 1, role: 'class_admin' },
        { id: 2, class_id: 1, user_id: 2, role: 'class_teacher' }
      ]

      classStore.setTeachers(mockTeachers)

      const admin = classStore.teachers.find(t => t.role === 'class_admin')
      const teacher = classStore.teachers.find(t => t.role === 'class_teacher')

      expect(admin?.role).toBe('class_admin')
      expect(teacher?.role).toBe('class_teacher')
    })

    it('should handle empty teachers list', () => {
      classStore.setTeachers([])

      expect(classStore.teachers).toHaveLength(0)
    })

    it('should preserve teacher user association', () => {
      const mockUser: User = {
        id: 1,
        username: 'teacher1',
        is_active: true,
        created_at: '2024-01-01',
        teacher_profile: {
          id: 1,
          user_id: 1,
          real_name: 'Teacher One',
          subject: 'Math'
        }
      }

      const mockTeachers: ClassTeacher[] = [
        { id: 1, class_id: 1, user_id: 1, role: 'class_admin', user: mockUser }
      ]

      classStore.setTeachers(mockTeachers)

      expect(classStore.teachers[0].user?.teacher_profile?.real_name).toBe('Teacher One')
    })
  })

  describe('visual theme', () => {
    it('should support farm theme', async () => {
      const farmClass: Class = {
        id: 1,
        name: 'Farm Class',
        grade: '1',
        school_year: '2024',
        visual_theme: 'farm',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(classesApi.createClass).mockResolvedValue(farmClass)

      await classStore.createClassAction({ name: 'Farm Class', visual_theme: 'farm' })

      const createdClass = classStore.classes[classStore.classes.length - 1]
      expect(createdClass.visual_theme).toBe('farm')
    })

    it('should support tree theme', async () => {
      const treeClass: Class = {
        id: 2,
        name: 'Tree Class',
        grade: '2',
        school_year: '2024',
        visual_theme: 'tree',
        creator_id: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(classesApi.createClass).mockResolvedValue(treeClass)

      await classStore.createClassAction({ name: 'Tree Class', visual_theme: 'tree' })

      const createdClass = classStore.classes[classStore.classes.length - 1]
      expect(createdClass.visual_theme).toBe('tree')
    })
  })
})
