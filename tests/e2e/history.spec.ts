import { test, expect } from '@playwright/test'
import {
  createClass,
  createGroup,
  createScoreItem,
  createStudent,
  createTeacherSession,
  getGroupScoreLogsByApi,
  getStudentScoreLogsByApi,
  revokeGroupScoreLogByApi,
  revokeStudentScoreLogByApi,
  scoreGroupByApi,
  scoreStudentByApi
} from './helpers/data.helper'

test.describe('历史记录与回写一致性 UI 测试', () => {
  test('HISTORY-001: 学生评分被撤销后历史记录标记为已撤销且概览回写归零', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const student = await createStudent(request, token, cls.id, {
      name: '撤销学生',
      student_no: 'HISTORY001'
    })
    const item = await createScoreItem(request, token, cls.id, {
      name: '待撤销学生评分',
      target_type: 'student',
      score_type: 'plus',
      score_value: 3
    })

    await scoreStudentByApi(request, token, student.id, { score_item_id: item.id, remark: '待撤销学生评分' })
    const logs = await getStudentScoreLogsByApi(request, token, student.id)
    await revokeStudentScoreLogByApi(request, token, logs[0].id)

    await page.goto(`/class/${cls.id}`)
    await expect(page.getByText('本周加分').locator('..')).toContainText('+0')
    await page.getByRole('button', { name: '历史记录' }).click()

    const revokedRow = page.locator('.history-section').filter({ hasText: '学生评分历史' }).locator('tbody tr').filter({ hasText: student.name }).first()
    await expect(revokedRow).toContainText('已撤销')
    await expect(revokedRow).toContainText('待撤销学生评分')
  })

  test('HISTORY-002: 小组评分被撤销后历史记录标记为已撤销且概览回写归零', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const group = await createGroup(request, token, cls.id, { name: '撤销小组' })
    const item = await createScoreItem(request, token, cls.id, {
      name: '小组撤销项',
      target_type: 'group',
      score_type: 'plus',
      score_value: 4
    })

    await scoreGroupByApi(request, token, group.id, { score_item_id: item.id, remark: '待撤销小组评分' })
    const logs = await getGroupScoreLogsByApi(request, token, group.id)
    await revokeGroupScoreLogByApi(request, token, logs[0].id)

    await page.goto(`/class/${cls.id}`)
    await expect(page.getByText('本周加分').locator('..')).toContainText('+0')
    await page.getByRole('button', { name: '历史记录' }).click()

    const revokedRow = page.locator('.history-section').filter({ hasText: '小组评分历史' }).locator('tbody tr').filter({ hasText: group.name }).first()
    await expect(revokedRow).toContainText('已撤销')
    await expect(revokedRow).toContainText('小组撤销项')
  })

  test('HISTORY-003: 删除已评分学生后统计与历史记录保持一致', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const student = await createStudent(request, token, cls.id, {
      name: '删除后回写学生',
      student_no: 'HISTORY003'
    })
    const item = await createScoreItem(request, token, cls.id, {
      name: '删除前学生评分',
      target_type: 'student',
      score_type: 'plus',
      score_value: 5
    })

    await scoreStudentByApi(request, token, student.id, { score_item_id: item.id, remark: '删除前学生评分' })

    await page.goto(`/class/${cls.id}`)
    await expect(page.getByText('本周加分').locator('..')).toContainText('+5')

    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('tbody tr').filter({ hasText: student.name }).getByRole('button', { name: '删除' }).click()

    await expect(page.getByText('本周加分').locator('..')).toContainText('+0')
    await page.getByRole('button', { name: '历史记录' }).click()
    await expect(page.getByText('暂无学生评分记录')).toBeVisible()
  })

  test('HISTORY-004: 删除已评分小组后统计与历史记录保持一致', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const group = await createGroup(request, token, cls.id, { name: '删除后回写小组' })
    const item = await createScoreItem(request, token, cls.id, {
      name: '删除前小组评分',
      target_type: 'group',
      score_type: 'plus',
      score_value: 6
    })

    await scoreGroupByApi(request, token, group.id, { score_item_id: item.id, remark: '删除前小组评分备注' })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await expect(page.getByText('本周加分').locator('..')).toContainText('+6')

    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.group-card').filter({ hasText: group.name }).getByRole('button', { name: '删除' }).click()

    await expect(page.getByText('本周加分').locator('..')).toContainText('+0')
    await page.getByRole('button', { name: '历史记录' }).click()
    await expect(page.getByText('暂无小组评分记录')).toBeVisible()
  })
})
