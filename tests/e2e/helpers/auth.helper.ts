import { Page } from '@playwright/test'

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByRole('textbox', { name: '请输入用户名' }).fill('admin')
  await page.getByRole('textbox', { name: '请输入密码' }).fill('admin123')
  await page.getByRole('button', { name: '登 录' }).click()
  await page.waitForURL('/', { timeout: 5000 })
}

export async function loginAsTeacher(page: Page, username?: string, password?: string): Promise<void> {
  await page.goto('/login')
  await page.getByRole('textbox', { name: '请输入用户名' }).fill(username || 'test_teacher')
  await page.getByRole('textbox', { name: '请输入密码' }).fill(password || 'password123')
  await page.getByRole('button', { name: '登 录' }).click()
  await page.waitForURL('/', { timeout: 5000 })
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: '退出' }).click()
  await page.waitForURL('/login', { timeout: 5000 })
}

export async function registerUser(
  page: Page,
  username: string,
  password: string,
  realName: string,
  subject: string
): Promise<void> {
  await page.goto('/register')
  await page.getByRole('textbox', { name: '设置用户名' }).fill(username)
  await page.getByRole('textbox', { name: '您的真实姓名' }).fill(realName)
  await page.getByRole('textbox', { name: '设置密码' }).fill(password)
  await page.getByRole('textbox', { name: '再次输入密码' }).fill(password)
  await page.getByRole('textbox', { name: '如：语文、数学、英语' }).fill(subject)
  await page.getByRole('button', { name: '立即注册' }).click()
  await page.waitForURL('/', { timeout: 5000 })
}
