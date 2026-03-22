import { test, expect, type Page } from '@playwright/test'
import {
  createClass,
  createScoreItem,
  createStudent,
  createTeacherSession,
  scoreStudentByApi
} from './helpers/data.helper'

async function openStudentScoreDialogByName(page: Page, studentName: string) {
  await page.getByRole('button', { name: new RegExp(studentName) }).first().click()
  await expect(page.getByRole('heading', { name: new RegExp(`给\\s*${studentName}\\s*评分`) })).toBeVisible()
}

test.describe('成长可视化 UI 测试', () => {
  test('GROWTH-001: farm 主题学生初始显示种子阶段', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'farm' })
    await createStudent(request, token, cls.id, {
      name: '农场学生',
      student_no: '20264001'
    })

    await page.goto(`/class/${cls.id}/garden`)
    await openStudentScoreDialogByName(page, '农场学生')

    await expect(page.getByText('成长阶段')).toBeVisible()
    await expect(page.locator('.current-stage .stage-name')).toHaveText('种子')
    await expect(page.locator('.status-card .growth-visual').first()).toContainText('🌱')
  })

  test('GROWTH-002: farm 主题评分预览会提示升级到嫩芽', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'farm' })
    await createStudent(request, token, cls.id, {
      name: '农场升级学生',
      student_no: '20264002'
    })
    await createScoreItem(request, token, cls.id, {
      name: '大额加分',
      score_type: 'plus',
      score_value: 12
    })

    await page.goto(`/class/${cls.id}/garden`)
    await openStudentScoreDialogByName(page, '农场升级学生')
    await page.getByRole('button', { name: '大额加分 +12' }).click()

    await expect(page.locator('.preview-stage-change')).toContainText('即将升级到 嫩芽！')
  })

  test('GROWTH-003: tree 主题评分后会切换为萌芽阶段', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'tree' })
    const student = await createStudent(request, token, cls.id, {
      name: '树林学生',
      student_no: '20264003'
    })
    const scoreItem = await createScoreItem(request, token, cls.id, {
      name: '树苗加分',
      score_type: 'plus',
      score_value: 12
    })

    await scoreStudentByApi(request, token, student.id, {
      score_item_id: scoreItem.id,
      remark: '成长阶段切换'
    })

    await page.goto(`/class/${cls.id}/garden`)
    await openStudentScoreDialogByName(page, '树林学生')

    await expect(page.getByText('成长阶段')).toBeVisible()
    await expect(page.locator('.current-stage .stage-name')).toHaveText('萌芽')
  })

  test('GROWTH-004: tree 主题下仍可进入学生评分流', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'tree' })
    await createStudent(request, token, cls.id, {
      name: '树主题学生',
      student_no: '20264004'
    })

    await page.goto(`/class/${cls.id}/garden`)
    await expect(page.getByRole('button', { name: '学生列表' })).toBeVisible()
    await openStudentScoreDialogByName(page, '树主题学生')
    await expect(page.getByText('成长阶段')).toBeVisible()
  })
})
