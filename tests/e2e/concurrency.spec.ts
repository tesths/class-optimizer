import { test, expect } from '@playwright/test'
import {
  addTeacherToClass,
  createClass,
  createGroup,
  createScoreItem,
  createStudent,
  getClassByApi,
  getGroupScoreLogsByApi,
  getStatsOverviewByApi,
  getStudentScoreLogsByApi,
  listGroupsByApi,
  listStudentsByApi,
  loginTeacher,
  registerTeacher,
  scoreGroupByApi,
  scoreStudentByApi,
  uniqueName
} from './helpers/data.helper'

test.describe('并发冲突 API 测试', () => {
  test('CONC-001: 两位管理员并发修改同一班级时最终状态保持可读', async ({ request }) => {
    const owner = await registerTeacher(request)
    const ownerToken = await loginTeacher(request, owner.username, owner.password)
    const cls = await createClass(request, ownerToken)
    const updateNameA = uniqueName('并发更新A')
    const updateNameB = uniqueName('并发更新B')

    const secondAdmin = await registerTeacher(request)
    const secondAdminToken = await loginTeacher(request, secondAdmin.username, secondAdmin.password)
    await addTeacherToClass(request, ownerToken, cls.id, secondAdmin.username, 'class_admin')

    const [firstResponse, secondResponse] = await Promise.all([
      request.put(`/api/classes/${cls.id}`, {
        data: { name: updateNameA },
        headers: { Authorization: `Bearer ${ownerToken}` }
      }),
      request.put(`/api/classes/${cls.id}`, {
        data: { name: updateNameB },
        headers: { Authorization: `Bearer ${secondAdminToken}` }
      })
    ])

    expect(firstResponse.ok()).toBeTruthy()
    expect(secondResponse.ok()).toBeTruthy()

    const currentClass = await getClassByApi(request, ownerToken, cls.id)
    expect([updateNameA, updateNameB]).toContain(currentClass.name)
    expect(currentClass.grade).toBe('初一')
    expect(currentClass.school_year).toBe('2025-2026')
  })

  test('CONC-002: 两位教师并发给同一学生评分时总分与历史记录保持一致', async ({ request }) => {
    const owner = await registerTeacher(request)
    const ownerToken = await loginTeacher(request, owner.username, owner.password)
    const cls = await createClass(request, ownerToken)
    const secondTeacher = await registerTeacher(request)
    const secondTeacherToken = await loginTeacher(request, secondTeacher.username, secondTeacher.password)
    await addTeacherToClass(request, ownerToken, cls.id, secondTeacher.username)

    const student = await createStudent(request, ownerToken, cls.id, {
      name: '并发评分学生',
      student_no: 'CONC1001'
    })
    const scoreItemA = await createScoreItem(request, ownerToken, cls.id, {
      name: '并发评分A',
      target_type: 'student',
      score_type: 'plus',
      score_value: 2
    })
    const scoreItemB = await createScoreItem(request, ownerToken, cls.id, {
      name: '并发评分B',
      target_type: 'student',
      score_type: 'plus',
      score_value: 3
    })

    await Promise.all([
      scoreStudentByApi(request, ownerToken, student.id, { score_item_id: scoreItemA.id, remark: '并发评分A' }),
      scoreStudentByApi(request, secondTeacherToken, student.id, { score_item_id: scoreItemB.id, remark: '并发评分B' })
    ])

    const students = await listStudentsByApi(request, ownerToken, cls.id)
    const currentStudent = students.find((item) => item.id === student.id)
    expect(currentStudent?.total_score).toBe(5)

    const logs = await getStudentScoreLogsByApi(request, ownerToken, student.id)
    expect(logs).toHaveLength(2)
    expect(logs.map((log: { remark?: string }) => log.remark)).toEqual(
      expect.arrayContaining(['并发评分A', '并发评分B'])
    )

    const overview = await getStatsOverviewByApi(request, ownerToken, cls.id)
    expect(overview.week_plus).toBe(5)
  })

  test('CONC-003: 两位教师并发给同一小组评分时总分与历史记录保持一致', async ({ request }) => {
    const owner = await registerTeacher(request)
    const ownerToken = await loginTeacher(request, owner.username, owner.password)
    const cls = await createClass(request, ownerToken)
    const secondTeacher = await registerTeacher(request)
    const secondTeacherToken = await loginTeacher(request, secondTeacher.username, secondTeacher.password)
    await addTeacherToClass(request, ownerToken, cls.id, secondTeacher.username)

    const group = await createGroup(request, ownerToken, cls.id, { name: '并发评分小组' })
    const groupItemA = await createScoreItem(request, ownerToken, cls.id, {
      name: '并发小组A',
      target_type: 'group',
      score_type: 'plus',
      score_value: 2
    })
    const groupItemB = await createScoreItem(request, ownerToken, cls.id, {
      name: '并发小组B',
      target_type: 'group',
      score_type: 'plus',
      score_value: 3
    })

    await Promise.all([
      scoreGroupByApi(request, ownerToken, group.id, { score_item_id: groupItemA.id, remark: '小组并发A' }),
      scoreGroupByApi(request, secondTeacherToken, group.id, { score_item_id: groupItemB.id, remark: '小组并发B' })
    ])

    const groups = await listGroupsByApi(request, ownerToken, cls.id)
    const currentGroup = groups.find((item) => item.id === group.id)
    expect(currentGroup?.total_score).toBe(5)

    const logs = await getGroupScoreLogsByApi(request, ownerToken, group.id)
    expect(logs).toHaveLength(2)
    expect(logs.map((log: { item_name_snapshot: string }) => log.item_name_snapshot)).toEqual(
      expect.arrayContaining(['并发小组A', '并发小组B'])
    )

    const overview = await getStatsOverviewByApi(request, ownerToken, cls.id)
    expect(overview.week_plus).toBe(5)
  })
})
