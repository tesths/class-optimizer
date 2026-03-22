import { Page, Locator } from '@playwright/test'

export class ClassDetailPage {
  readonly page: Page
  readonly classInfo: Locator
  readonly enterGardenButton: Locator
  readonly studentManagementLink: Locator
  readonly groupManagementLink: Locator
  readonly statsLink: Locator

  constructor(page: Page) {
    this.page = page
    this.classInfo = page.locator('.class-info, .class-detail-header')
    this.enterGardenButton = page.locator('button:has-text("进入花园")')
    this.studentManagementLink = page.locator('text=学生管理, [href*="students"]')
    this.groupManagementLink = page.locator('text=小组管理, [href*="groups"]')
    this.statsLink = page.locator('text=统计分析, [href*="stats"]')
  }

  async goto(classId: string): Promise<void> {
    await this.page.goto(`/class/${classId}`)
    await this.page.waitForSelector('.class-info, .class-detail-header')
  }

  async enterGarden(): Promise<void> {
    await this.enterGardenButton.click()
    await this.page.waitForURL(/\/class\/\d+\/garden/)
  }

  async goToStudentManagement(): Promise<void> {
    await this.studentManagementLink.click()
    // Students tab - no URL change needed
  }

  async goToGroupManagement(): Promise<void> {
    await this.groupManagementLink.click()
    // Groups tab - no URL change needed
  }

  async goToStats(): Promise<void> {
    await this.statsLink.click()
    // Stats tab - no URL change needed
  }

  async getClassName(): Promise<string> {
    return this.classInfo.locator('h1, .class-name').textContent() || ''
  }
}
