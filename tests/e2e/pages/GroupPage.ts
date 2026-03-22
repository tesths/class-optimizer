import { Page, Locator } from '@playwright/test'

export class GroupPage {
  readonly page: Page
  readonly createGroupButton: Locator
  readonly groupCards: Locator
  readonly groupScoreDialog: Locator

  constructor(page: Page) {
    this.page = page
    this.createGroupButton = page.locator('button:has-text("新增小组"), button:has-text("创建小组")')
    this.groupCards = page.locator('.group-card')
    this.groupScoreDialog = page.locator('.group-score-dialog, .scoring-modal')
  }

  async goto(classId: string): Promise<void> {
    await this.page.goto(`/classes/${classId}/groups`)
    await this.page.waitForSelector('.group-card, .group-list')
  }

  async createGroup(name: string): Promise<void> {
    await this.createGroupButton.click()
    await this.page.waitForSelector('.group-form, .group-dialog')

    await this.page.fill('input[name="name"]', name)

    await this.page.click('button:has-text("确认"), button:has-text("创建")')
    await this.page.waitForSelector('.group-card', { timeout: 3000 })
  }

  async scoreGroup(groupIndex: number, itemIndex: number = 0): Promise<void> {
    await this.groupCards.nth(groupIndex).locator('button:has-text("打分"), button:has-text("评分")').click()
    await this.page.waitForSelector('.group-score-dialog, .scoring-modal')

    await this.page.locator('.quick-score-btn').nth(itemIndex).click()
    await this.page.click('button:has-text("提交"), button:has-text("确定")')
    await this.page.waitForSelector('.group-score-dialog', { state: 'hidden', timeout: 3000 })
  }

  async getGroupCount(): Promise<number> {
    return this.groupCards.count()
  }
}
