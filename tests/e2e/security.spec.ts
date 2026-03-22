import path from 'path'
import { test, expect } from '@playwright/test'
import {
  createClass,
  createTeacherSession,
  loginTeacher,
  openAuthenticatedPage,
  registerTeacher
} from './helpers/data.helper'

const validImportFile = path.resolve(process.cwd(), 'backend/data/import_regression.xlsx')

test.describe('安全访问 UI 测试', () => {
  test('SEC-001: 未登录访问受保护页面会跳转到登录页', async ({ page }) => {
    await page.goto('/class/new')

    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('button', { name: '登 录' })).toBeVisible()
  })

  test('SEC-002: 无效 token 会被清理并重定向到登录页', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => window.localStorage.setItem('token', 'invalid-token'))

    await page.goto('/')

    await expect(page).toHaveURL('/login')
    expect(await page.evaluate(() => window.localStorage.getItem('token'))).toBeNull()
  })

  test('SEC-003: 非班级管理员预览导入时会收到权限提示', async ({ page, request }) => {
    const owner = await registerTeacher(request)
    const ownerToken = await loginTeacher(request, owner.username, owner.password)
    const cls = await createClass(request, ownerToken)

    const viewer = await registerTeacher(request)
    const viewerToken = await loginTeacher(request, viewer.username, viewer.password)
    await openAuthenticatedPage(page, viewerToken, `/class/${cls.id}/import`)

    await page.locator('input[type="file"]').setInputFiles(validImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    await expect(page.locator('.error')).toContainText('需要班级管理员权限')
    await expect(page.getByRole('heading', { name: '预览导入数据' })).toHaveCount(0)
  })

  test('SEC-004: 登录教师访问登录页时会被重定向到首页', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    await expect.poll(async () => {
      return await page.evaluate((value) => {
        const cookieToken = encodeURIComponent(value)
        return (
          window.localStorage.getItem('token') === value &&
          document.cookie.includes(`auth_token=${cookieToken}`)
        )
      }, token)
    }).toBe(true)
    await page.waitForLoadState('networkidle')
    await page.goto('/login')

    await expect(page).toHaveURL('/', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '我的班级' })).toBeVisible()
  })
})
