import { test, expect } from '@playwright/test'
import { createClass, createStudent, createTeacherSession, uniqueName } from './helpers/data.helper'

test.describe('班级管理 UI 测试', () => {
  test('CLASS-001: 可以通过 UI 创建班级', async ({ page, request }) => {
    await createTeacherSession(page, request)

    const className = uniqueName('UI班级')
    await page.getByRole('button', { name: /新建班级/ }).click()
    await expect(page).toHaveURL('/class/new')

    await page.getByPlaceholder('如：初一(1)班').fill(className)
    await page.getByRole('textbox', { name: '如：初一', exact: true }).fill('三年级')
    await page.getByPlaceholder('如：2025-2026').fill('2026')
    await page.getByPlaceholder('可选').fill('班级创建流程测试')
    await page.locator('select').selectOption('farm')
    await page.getByRole('button', { name: '创建班级' }).click()

    await expect(page).toHaveURL(/\/class\/\d+$/)
    await expect(page.getByRole('heading', { name: className })).toBeVisible()
    await expect(page.getByText('🌱 种菜主题')).toBeVisible()
  })

  test('CLASS-002: 首页班级卡片可以进入详情页', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { name: uniqueName('进入班级') })

    await page.goto('/')
    const card = page.locator('.class-card').filter({ hasText: cls.name }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: '进入班级' }).click()

    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.getByRole('heading', { name: cls.name })).toBeVisible()
    await expect(page.getByRole('button', { name: '学生管理' })).toBeVisible()
  })

  test('CLASS-003: 可以编辑班级信息', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, {
      name: uniqueName('待编辑班级'),
      description: '编辑前描述'
    })

    await page.goto('/')
    const card = page.locator('.class-card').filter({ hasText: cls.name }).first()
    await card.getByRole('button', { name: '编辑' }).click()

    await expect(page).toHaveURL(`/class/${cls.id}/edit`)
    await page.getByPlaceholder('如：初一(1)班').fill(`${cls.name}_已更新`)
    await page.getByPlaceholder('可选').fill('编辑后描述')
    await page.getByRole('button', { name: '保存修改' }).click()

    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.getByRole('heading', { name: `${cls.name}_已更新` })).toBeVisible()
  })

  test('CLASS-004: 可以切换班级视觉主题', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, {
      name: uniqueName('主题班级'),
      visual_theme: 'tree'
    })

    await page.goto(`/class/${cls.id}/edit`)
    await page.locator('select').selectOption('farm')
    await page.getByRole('button', { name: '保存修改' }).click()

    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.getByText('🌱 种菜主题')).toBeVisible()
    await expect(page.getByRole('button', { name: '🌱 进入花园' })).toBeVisible()
  })

  test('CLASS-005: 详情页统计会反映已创建的数据', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { name: uniqueName('统计班级') })
    await createStudent(request, token, cls.id, { name: uniqueName('学生甲'), student_no: uniqueName('100') })
    await createStudent(request, token, cls.id, { name: uniqueName('学生乙'), student_no: uniqueName('101') })

    await page.goto(`/class/${cls.id}`)

    await expect(page.getByText('学生数').locator('..')).toContainText('2')
    await expect(page.getByText('小组数').locator('..')).toContainText('0')
    await expect(page.getByRole('button', { name: '统计分析' })).toBeVisible()
  })

  test('CLASS-006: 移动端首页仍能看到班级卡片入口', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { name: uniqueName('移动端班级') })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const card = page.locator('.class-card').filter({ hasText: cls.name }).first()
    await expect(card).toBeVisible()
    await expect(card.getByRole('button', { name: '进入班级' })).toBeVisible()
    await expect(card.getByRole('button', { name: '编辑' })).toBeVisible()
  })
})
