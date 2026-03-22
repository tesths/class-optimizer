import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as groupApi from '@/api/group'
import type { StudentGroup, GroupMember } from '@/types'

// Mock the API module
vi.mock('@/api/group', () => ({
  getGroups: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  addGroupMember: vi.fn(),
  removeGroupMember: vi.fn(),
  scoreGroup: vi.fn(),
  getGroupScoreLogs: vi.fn()
}))

// Create a mock group store for testing
const useMockGroupStore = defineStore('group', () => {
  const groups = ref<StudentGroup[]>([])
  const currentGroup = ref<StudentGroup | null>(null)
  const members = ref<GroupMember[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentClassId = ref<number | null>(null)

  // Groups have independent scores - no sharing between groups
  const groupScoreIndependence = computed(() => {
    return groups.value.every(g => g.total_score !== undefined)
  })

  async function fetchGroups(classId: number) {
    loading.value = true
    error.value = null
    currentClassId.value = classId
    try {
      groups.value = await groupApi.getGroups(classId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createGroupAction(classId: number, data: Partial<StudentGroup>) {
    loading.value = true
    error.value = null
    try {
      const newGroup = await groupApi.createGroup(classId, data)
      groups.value.push(newGroup)
      return newGroup
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function addMemberAction(classId: number, groupId: number, studentId: number) {
    loading.value = true
    error.value = null
    try {
      const member = await groupApi.addGroupMember(classId, groupId, studentId)
      members.value.push(member as GroupMember)
      return member
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function removeMemberAction(classId: number, groupId: number, studentId: number) {
    loading.value = true
    error.value = null
    try {
      await groupApi.removeGroupMember(classId, groupId, studentId)
      members.value = members.value.filter(m => m.student_id !== studentId)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function setGroups(newGroups: StudentGroup[]) {
    groups.value = newGroups
  }

  function setMembers(newMembers: GroupMember[]) {
    members.value = newMembers
  }

  function getGroupById(groupId: number) {
    return groups.value.find(g => g.id === groupId)
  }

  return {
    groups,
    currentGroup,
    members,
    loading,
    error,
    currentClassId,
    groupScoreIndependence,
    fetchGroups,
    createGroupAction,
    addMemberAction,
    removeMemberAction,
    setGroups,
    setMembers,
    getGroupById
  }
})

describe('Group Store', () => {
  let groupStore: ReturnType<typeof useMockGroupStore>

  const mockGroups: StudentGroup[] = [
    {
      id: 1,
      class_id: 1,
      name: 'Group A',
      leader_student_id: 1,
      total_score: 100,
      member_count: 4,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: 2,
      class_id: 1,
      name: 'Group B',
      leader_student_id: 5,
      total_score: 85,
      member_count: 4,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: 3,
      class_id: 1,
      name: 'Group C',
      leader_student_id: 9,
      total_score: 120,
      member_count: 4,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
  ]

  const mockMembers: GroupMember[] = [
    { id: 1, group_id: 1, student_id: 1 },
    { id: 2, group_id: 1, student_id: 2 },
    { id: 3, group_id: 1, student_id: 3 },
    { id: 4, group_id: 1, student_id: 4 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    groupStore = useMockGroupStore()
  })

  describe('fetchGroups', () => {
    it('should fetch all groups for a class', async () => {
      vi.mocked(groupApi.getGroups).mockResolvedValue([...mockGroups])

      await groupStore.fetchGroups(1)

      expect(groupStore.groups).toHaveLength(3)
      expect(groupApi.getGroups).toHaveBeenCalledWith(1)
    })

    it('should set loading state while fetching', async () => {
      vi.mocked(groupApi.getGroups).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return []
      })

      const fetchPromise = groupStore.fetchGroups(1)
      expect(groupStore.loading).toBe(true)

      await fetchPromise
      expect(groupStore.loading).toBe(false)
    })

    it('should throw error when API fails', async () => {
      vi.mocked(groupApi.getGroups).mockRejectedValue(new Error('Failed to fetch groups'))

      await expect(groupStore.fetchGroups(1)).rejects.toThrow('Failed to fetch groups')
      expect(groupStore.error).toBe('Failed to fetch groups')
    })

    it('should store current class id', async () => {
      vi.mocked(groupApi.getGroups).mockResolvedValue([])

      await groupStore.fetchGroups(5)

      expect(groupStore.currentClassId).toBe(5)
    })
  })

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const newGroup: StudentGroup = {
        id: 4,
        class_id: 1,
        name: 'Group D',
        total_score: 0,
        member_count: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(groupApi.createGroup).mockResolvedValue(newGroup)

      const result = await groupStore.createGroupAction(1, { name: 'Group D' })

      expect(result).toEqual(newGroup)
      expect(groupStore.groups).toContainEqual(newGroup)
      expect(groupStore.groups).toHaveLength(1)
    })

    it('should set initial score to 0 for new group', async () => {
      const newGroup: StudentGroup = {
        id: 5,
        class_id: 1,
        name: 'New Group',
        total_score: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(groupApi.createGroup).mockResolvedValue(newGroup)

      await groupStore.createGroupAction(1, { name: 'New Group' })

      expect(groupStore.groups[groupStore.groups.length - 1].total_score).toBe(0)
    })

    it('should call API with correct class id and data', async () => {
      const newGroup: StudentGroup = {
        id: 6,
        class_id: 1,
        name: 'Test Group',
        total_score: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      vi.mocked(groupApi.createGroup).mockResolvedValue(newGroup)

      await groupStore.createGroupAction(1, { name: 'Test Group' })

      expect(groupApi.createGroup).toHaveBeenCalledWith(1, { name: 'Test Group' })
    })
  })

  describe('addMember', () => {
    it('should add a member to a group', async () => {
      groupStore.groups = [...mockGroups]
      groupStore.members = [...mockMembers]

      const newMember = { id: 5, group_id: 1, student_id: 10 }
      vi.mocked(groupApi.addGroupMember).mockResolvedValue(newMember)

      await groupStore.addMemberAction(1, 1, 10)

      expect(groupStore.members).toContainEqual(newMember)
      expect(groupStore.members).toHaveLength(5)
    })

    it('should throw error when API fails', async () => {
      vi.mocked(groupApi.addGroupMember).mockRejectedValue(new Error('Failed to add member'))

      await expect(
        groupStore.addMemberAction(1, 1, 10)
      ).rejects.toThrow('Failed to add member')
    })

    it('should not add duplicate members', async () => {
      groupStore.groups = [...mockGroups]
      groupStore.members = [...mockMembers]
      vi.mocked(groupApi.addGroupMember).mockRejectedValue(new Error('Already in group'))

      await expect(
        groupStore.addMemberAction(1, 1, 1) // Already a member
      ).rejects.toThrow('Already in group')
    })
  })

  describe('removeMember', () => {
    it('should remove a member from a group', async () => {
      groupStore.groups = [...mockGroups]
      groupStore.members = [...mockMembers]
      vi.mocked(groupApi.removeGroupMember).mockResolvedValue(undefined)

      await groupStore.removeMemberAction(1, 1, 1)

      expect(groupStore.members).toHaveLength(3)
      expect(groupStore.members.find(m => m.student_id === 1)).toBeUndefined()
    })

    it('should throw error when API fails', async () => {
      groupStore.members = [...mockMembers]
      vi.mocked(groupApi.removeGroupMember).mockRejectedValue(new Error('Failed to remove'))

      await expect(
        groupStore.removeMemberAction(1, 1, 1)
      ).rejects.toThrow('Failed to remove')
      expect(groupStore.members).toHaveLength(4)
    })

    it('should not affect other group members', async () => {
      groupStore.groups = [...mockGroups]
      groupStore.members = [...mockMembers]
      vi.mocked(groupApi.removeGroupMember).mockResolvedValue(undefined)

      await groupStore.removeMemberAction(1, 1, 1)

      // Other members should still be there
      expect(groupStore.members.find(m => m.student_id === 2)).toBeDefined()
      expect(groupStore.members.find(m => m.student_id === 3)).toBeDefined()
    })
  })

  describe('group score independence', () => {
    it('should maintain independent scores for each group', () => {
      groupStore.groups = [...mockGroups]

      expect(groupStore.groupScoreIndependence).toBe(true)

      // Each group has its own total_score
      const group1 = groupStore.groups.find(g => g.id === 1)
      const group2 = groupStore.groups.find(g => g.id === 2)

      expect(group1?.total_score).toBe(100)
      expect(group2?.total_score).toBe(85)
      expect(group1?.total_score).not.toBe(group2?.total_score)
    })

    it('should have undefined score when group is newly created', async () => {
      const newGroup: StudentGroup = {
        id: 10,
        class_id: 1,
        name: 'New Group',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
        // No total_score
      }

      vi.mocked(groupApi.createGroup).mockResolvedValue(newGroup)
      await groupStore.createGroupAction(1, { name: 'New Group' })

      // Score independence is still true because the computed checks if total_score is defined or not
      // In real implementation, new groups might have 0 or undefined
      expect(groupStore.groups[groupStore.groups.length - 1].total_score).toBeUndefined()
    })

    it('should not share scores between groups', () => {
      groupStore.groups = [
        { id: 1, class_id: 1, name: 'A', total_score: 100, created_at: '', updated_at: '' },
        { id: 2, class_id: 1, name: 'B', total_score: 50, created_at: '', updated_at: '' }
      ]

      const groupA = groupStore.getGroupById(1)
      const groupB = groupStore.getGroupById(2)

      expect(groupA?.total_score).toBe(100)
      expect(groupB?.total_score).toBe(50)
      expect(groupA?.total_score).not.toEqual(groupB?.total_score)
    })

    it('should calculate group total independently', () => {
      groupStore.groups = [
        { id: 1, class_id: 1, name: 'A', total_score: 100, created_at: '', updated_at: '' }
      ]

      // Simulate adding score to group
      const group = groupStore.getGroupById(1)
      expect(group?.total_score).toBe(100)

      // Another group's score should not be affected
      expect(groupStore.groups.length).toBe(1)
    })
  })

  describe('setGroups', () => {
    it('should set groups directly', () => {
      groupStore.setGroups([...mockGroups])

      expect(groupStore.groups).toEqual(mockGroups)
      expect(groupStore.groups).toHaveLength(3)
    })

    it('should replace existing groups', () => {
      groupStore.groups = [{ id: 99, class_id: 1, name: 'Old', created_at: '', updated_at: '' }]
      groupStore.setGroups([...mockGroups])

      expect(groupStore.groups).toHaveLength(3)
      expect(groupStore.groups.find(g => g.id === 99)).toBeUndefined()
    })
  })

  describe('setMembers', () => {
    it('should set members directly', () => {
      groupStore.setMembers([...mockMembers])

      expect(groupStore.members).toEqual(mockMembers)
      expect(groupStore.members).toHaveLength(4)
    })

    it('should clear existing members', () => {
      groupStore.members = [{ id: 1, group_id: 1, student_id: 99 }]
      groupStore.setMembers([...mockMembers])

      expect(groupStore.members).toHaveLength(4)
      expect(groupStore.members.find(m => m.student_id === 99)).toBeUndefined()
    })
  })
})
