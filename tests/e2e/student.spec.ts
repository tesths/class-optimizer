import { test, expect } from '@playwright/test'
import { createClass, createScoreItem, createStudent, createTeacherSession, uniqueName } from './helpers/data.helper'

test.describe('学生管理 UI 测试', () => {
  test('STUDENT-001: 可以添加学生', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { name: uniqueName('学生班级') })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '添加学生' }).click()
    const addForm = page.locator('.add-form')
    await addForm.locator('input').nth(0).fill('张三')
    await addForm.locator('input').nth(1).fill('20260001')
    await addForm.locator('select').selectOption('男')
    await addForm.locator('input').nth(2).fill('1')
    await page.getByRole('button', { name: '确认添加' }).click()

    await expect(page.getByRole('heading', { name: '学生列表 (1)' })).toBeVisible()
    await expect(page.locator('tbody tr')).toContainText('张三')
  })

  test('STUDENT-002: 重复学号会显示错误', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, {
      name: '已存在学生',
      student_no: '20260002'
    })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '添加学生' }).click()
    const addForm = page.locator('.add-form')
    await addForm.locator('input').nth(0).fill('重复学号学生')
    await addForm.locator('input').nth(1).fill('20260002')
    await page.getByRole('button', { name: '确认添加' }).click()

    await expect(page.locator('.error')).toContainText('学号已存在')
  })

  test('STUDENT-003: 点击学生行可打开评分弹窗并提交评分', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const student = await createStudent(request, token, cls.id, {
      name: '待评分学生',
      student_no: '20260003'
    })
    await createScoreItem(request, token, cls.id, {
      name: '课堂发言',
      score_type: 'plus',
      score_value: 2
    })

    await page.goto(`/class/${cls.id}`)
    await page.locator('tbody tr').filter({ hasText: student.name }).click()

    await expect(page.getByRole('heading', { name: `给 ${student.name} 评分` })).toBeVisible()
    await page.getByRole('button', { name: '课堂发言 +2' }).click()
    await page.locator('.dialog input[placeholder="可选备注"]').fill('学生评分测试')
    await page.getByRole('button', { name: '确认评分' }).click()

    await expect(page.locator('tbody tr').filter({ hasText: student.name })).toContainText(student.student_no)
    await page.getByRole('button', { name: '历史记录' }).click()
    const studentHistory = page.locator('.history-section').filter({ hasText: '学生评分历史' })
    await expect(studentHistory.locator('tbody tr').filter({ hasText: student.name })).toContainText('课堂发言')
  })

  test('STUDENT-004: 可以删除学生', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, {
      name: '待删除学生',
      student_no: '20260004'
    })

    await page.goto(`/class/${cls.id}`)
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('tbody tr').filter({ hasText: '待删除学生' }).getByRole('button', { name: '删除' }).click()

    await expect(page.locator('tbody tr').filter({ hasText: '待删除学生' })).toHaveCount(0)
  })

  test('STUDENT-005: 移动端学生表格仍可浏览', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, {
      name: '移动端学生',
      student_no: '20260005'
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/class/${cls.id}`)

    await expect(page.locator('.data-table')).toBeVisible()
    await expect(page.locator('tbody tr').filter({ hasText: '移动端学生' })).toBeVisible()
  })

  test('STUDENT-006: 缺少姓名和学号时会显示前端校验提示', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '添加学生' }).click()
    const addForm = page.locator('.add-form')
    const nameInput = addForm.locator('input').nth(0)
    const studentNoInput = addForm.locator('input').nth(1)
    await page.getByRole('button', { name: '确认添加' }).click()

    expect(await nameInput.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
    expect(await studentNoInput.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
  })

  test('STUDENT-007: 未选择积分项目时阻止提交评分', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const student = await createStudent(request, token, cls.id, {
      name: '未选项目学生',
      student_no: '20260007'
    })
    await createScoreItem(request, token, cls.id, {
      name: '作业认真',
      score_type: 'plus',
      score_value: 3
    })

    await page.goto(`/class/${cls.id}`)
    await page.locator('tbody tr').filter({ hasText: student.name }).click()
    const confirmButton = page.getByRole('button', { name: '确认评分' })

    await expect(confirmButton).toBeDisabled()
    await expect(page.getByRole('heading', { name: `给 ${student.name} 评分` })).toBeVisible()
  })
})
