import { test, expect } from '@playwright/test'
import {
  addGroupMember,
  createClass,
  createGroup,
  createScoreItem,
  createStudent,
  createTeacherSession,
  scoreGroupByApi,
  scoreStudentByApi
} from './helpers/data.helper'

test.describe('统计页面 UI 测试', () => {
  test('STATS-001: 概览会汇总学生和小组加分', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const student = await createStudent(request, token, cls.id, {
      name: '统计学生',
      student_no: '20262001'
    })
    const group = await createGroup(request, token, cls.id, { name: '统计小组' })
    const studentScoreItem = await createScoreItem(request, token, cls.id, {
      name: '统计加分',
      target_type: 'student',
      score_type: 'plus',
      score_value: 2
    })
    const groupScoreItem = await createScoreItem(request, token, cls.id, {
      name: '小组统计',
      target_type: 'group',
      score_type: 'plus',
      score_value: 1
    })

    await addGroupMember(request, token, cls.id, group.id, student.id)
    await scoreStudentByApi(request, token, student.id, {
      score_item_id: studentScoreItem.id,
      remark: '学生统计'
    })
    await scoreGroupByApi(request, token, group.id, {
      score_item_id: groupScoreItem.id,
      remark: '小组统计'
    })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '统计分析' }).click()

    const weekPlusCard = page.locator('.stats-tab .stat-card').filter({ hasText: '本周加分' })
    const weekMinusCard = page.locator('.stats-tab .stat-card').filter({ hasText: '本周减分' })
    const monthPlusCard = page.locator('.stats-tab .stat-card').filter({ hasText: '本月加分' })

    await expect(weekPlusCard).toContainText('+3')
    await expect(weekMinusCard).toContainText('-0')
    await expect(monthPlusCard).toContainText('+3')
  })

  test('STATS-002: 学生排名按总分展示', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const topStudent = await createStudent(request, token, cls.id, {
      name: '高分学生',
      student_no: '20262002'
    })
    const lowStudent = await createStudent(request, token, cls.id, {
      name: '低分学生',
      student_no: '20262003'
    })
    const topScoreItem = await createScoreItem(request, token, cls.id, {
      name: '课堂表现',
      target_type: 'student',
      score_value: 5
    })
    const lowScoreItem = await createScoreItem(request, token, cls.id, {
      name: '基础表现',
      target_type: 'student',
      score_value: 2
    })

    await scoreStudentByApi(request, token, topStudent.id, {
      score_item_id: topScoreItem.id,
      remark: '高分'
    })
    await scoreStudentByApi(request, token, lowStudent.id, {
      score_item_id: lowScoreItem.id,
      remark: '低分'
    })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '统计分析' }).click()

    const studentRows = page.locator('h3:has-text("学生排名") + table tbody tr')
    await expect(studentRows.nth(0)).toContainText('高分学生')
    await expect(studentRows.nth(0)).toContainText('5')
    await expect(studentRows.nth(1)).toContainText('低分学生')
  })

  test('STATS-003: 小组排名按总分展示', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const highGroup = await createGroup(request, token, cls.id, { name: '高分组' })
    const lowGroup = await createGroup(request, token, cls.id, { name: '低分组' })
    const highGroupItem = await createScoreItem(request, token, cls.id, {
      name: '高分协作',
      target_type: 'group',
      score_type: 'plus',
      score_value: 3
    })
    const lowGroupItem = await createScoreItem(request, token, cls.id, {
      name: '低分协作',
      target_type: 'group',
      score_type: 'plus',
      score_value: 1
    })

    await scoreGroupByApi(request, token, highGroup.id, {
      score_item_id: highGroupItem.id,
      remark: '高分组'
    })
    await scoreGroupByApi(request, token, lowGroup.id, {
      score_item_id: lowGroupItem.id,
      remark: '低分组'
    })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '统计分析' }).click()

    const groupRows = page.locator('h3:has-text("小组排名") + table tbody tr')
    await expect(groupRows.nth(0)).toContainText('高分组')
    await expect(groupRows.nth(0)).toContainText('3')
    await expect(groupRows.nth(1)).toContainText('低分组')
  })
})
