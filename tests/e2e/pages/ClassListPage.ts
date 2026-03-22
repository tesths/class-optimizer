import { Page, Locator } from '@playwright/test'

export class ClassListPage {
  readonly page: Page
  readonly createClassButton: Locator
  readonly classCards: Locator

  constructor(page: Page) {
    this.page = page
    this.createClassButton = page.locator('button:has-text("新建班级")')
    this.classCards = page.locator('.class-card')
  }

  async goto(): Promise<void> {
    await this.page.goto('/')
    await this.page.waitForSelector('.class-card, .class-list')
  }

  async createClass(data: {
    name: string
    grade: string
    schoolYear: string
    theme?: 'farm' | 'tree'
  }): Promise<string> {
    await this.createClassButton.click()
    await this.page.waitForSelector('.class-form, .class-dialog')

    await this.page.fill('input[name="name"]', data.name)
    await this.page.fill('input[name="grade"]', data.grade)
    await this.page.fill('input[name="school_year"]', data.schoolYear)

    if (data.theme) {
      await this.page.selectOption('select[name="visual_theme"]', data.theme)
    }

    await this.page.click('button:has-text("确认"), button:has-text("创建")')
    await this.page.waitForSelector('.class-card', { timeout: 3000 })

    // Return class ID from URL
    return this.page.url().match(/\/class\/(\d+)/)?.[1] || ''
  }

  async enterClass(classIndex: number = 0): Promise<string> {
    await this.classCards.nth(classIndex).locator('.enter-btn, >> text=进入').click()
    await this.page.waitForURL(/\/class\/\d+/)
    return this.page.url().match(/\/class\/(\d+)/)?.[1] || ''
  }

  async getClassCount(): Promise<number> {
    return this.classCards.count()
  }
}
