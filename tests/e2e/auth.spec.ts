import { test, expect } from '@playwright/test'
import { registerTeacher, uniqueName } from './helpers/data.helper'

test.describe('认证流程 UI 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('AUTH-001: 注册成功后跳转登录页', async ({ page }) => {
    const username = uniqueName('auth_register')

    await page.getByRole('link', { name: '立即注册' }).click()
    await expect(page).toHaveURL('/register')

    await page.getByRole('textbox', { name: '设置用户名' }).fill(username)
    await page.getByRole('textbox', { name: '您的真实姓名' }).fill('测试教师')
    await page.getByRole('textbox', { name: '设置密码' }).fill('password123')
    await page.getByRole('textbox', { name: '再次输入密码' }).fill('password123')
    await page.getByRole('textbox', { name: '如：语文、数学、英语' }).fill('语文')
    await page.getByRole('button', { name: '立即注册' }).click()

    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('button', { name: '登 录' })).toBeVisible()
  })

  test('AUTH-002: 已注册教师可以正常登录', async ({ page, request }) => {
    const teacher = await registerTeacher(request)

    await page.getByRole('textbox', { name: '请输入用户名' }).fill(teacher.username)
    await page.getByRole('textbox', { name: '请输入密码' }).fill(teacher.password)
    await page.getByRole('button', { name: '登 录' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: '我的班级' })).toBeVisible()
    await expect(page.getByText(`欢迎，${teacher.realName}`)).toBeVisible()
  })

  test('AUTH-003: 错误密码显示提示', async ({ page, request }) => {
    const teacher = await registerTeacher(request)

    await page.getByRole('textbox', { name: '请输入用户名' }).fill(teacher.username)
    await page.getByRole('textbox', { name: '请输入密码' }).fill('wrong-password')
    await page.getByRole('button', { name: '登 录' }).click()

    await expect(page.locator('.error-message')).toContainText('用户名或密码错误')
    await expect(page).toHaveURL('/login')
  })

  test('AUTH-004: 注册时密码不一致阻止提交', async ({ page }) => {
    await page.getByRole('link', { name: '立即注册' }).click()
    await expect(page).toHaveURL('/register')

    await page.getByRole('textbox', { name: '设置用户名' }).fill(uniqueName('auth_mismatch'))
    await page.getByRole('textbox', { name: '您的真实姓名' }).fill('测试教师')
    await page.getByRole('textbox', { name: '设置密码' }).fill('password123')
    await page.getByRole('textbox', { name: '再次输入密码' }).fill('password456')
    await page.getByRole('textbox', { name: '如：语文、数学、英语' }).fill('语文')
    await page.getByRole('button', { name: '立即注册' }).click()

    await expect(page.locator('.error-message')).toContainText('两次密码不一致')
    await expect(page).toHaveURL('/register')
  })

  test('AUTH-005: 重复用户名返回后端提示', async ({ page, request }) => {
    const teacher = await registerTeacher(request, {
      username: uniqueName('auth_duplicate')
    })

    await page.getByRole('link', { name: '立即注册' }).click()
    await expect(page).toHaveURL('/register')

    await page.getByRole('textbox', { name: '设置用户名' }).fill(teacher.username)
    await page.getByRole('textbox', { name: '您的真实姓名' }).fill('测试教师')
    await page.getByRole('textbox', { name: '设置密码' }).fill('password123')
    await page.getByRole('textbox', { name: '再次输入密码' }).fill('password123')
    await page.getByRole('textbox', { name: '如：语文、数学、英语' }).fill('语文')
    await page.getByRole('button', { name: '立即注册' }).click()

    await expect(page.locator('.error-message')).toContainText('用户名已存在')
  })

  test('AUTH-006: 登录后可以退出', async ({ page, request }) => {
    const teacher = await registerTeacher(request)

    await page.getByRole('textbox', { name: '请输入用户名' }).fill(teacher.username)
    await page.getByRole('textbox', { name: '请输入密码' }).fill(teacher.password)
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('button', { name: '退出' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('AUTH-007: 登录状态刷新后仍然有效', async ({ page, request }) => {
    const teacher = await registerTeacher(request)

    await page.getByRole('textbox', { name: '请输入用户名' }).fill(teacher.username)
    await page.getByRole('textbox', { name: '请输入密码' }).fill(teacher.password)
    await page.getByRole('button', { name: '登 录' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: '我的班级' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const token = window.localStorage.getItem('token')
        return Boolean(token) && document.cookie.includes(`auth_token=${encodeURIComponent(token)}`)
      })
    }).toBe(true)

    await page.reload()
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '我的班级' })).toBeVisible()
  })
})
