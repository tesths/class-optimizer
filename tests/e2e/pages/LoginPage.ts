import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly registerLink: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.usernameInput = page.getByRole('textbox', { name: '请输入用户名' })
    this.passwordInput = page.getByRole('textbox', { name: '请输入密码' })
    this.submitButton = page.getByRole('button', { name: '登 录' })
    this.registerLink = page.getByRole('link', { name: '立即注册' })
    this.errorMessage = page.locator('.error-message')
  }

  async goto(): Promise<void> {
    await this.page.goto('/login')
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
    await this.page.waitForURL('/', { timeout: 5000 })
  }

  async loginAsAdmin(): Promise<void> {
    await this.login('test_teacher_123', 'password123')
  }

  async goToRegister(): Promise<void> {
    await this.registerLink.click()
    await this.page.waitForURL('/register')
  }

  async getErrorMessage(): Promise<string> {
    await this.page.waitForSelector('.error-message', { timeout: 3000 })
    return this.errorMessage.textContent() || ''
  }
}
