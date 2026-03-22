import { Page, Locator } from '@playwright/test'

export class StatsPage {
  readonly page: Page
  readonly timeDimensionButtons: Locator
  readonly rankingChart: Locator
  readonly exportButton: Locator

  constructor(page: Page) {
    this.page = page
    this.timeDimensionButtons = page.locator('button:has-text("周"), button:has-text("月"), button:has-text("学期")')
    this.rankingChart = page.locator('.student-ranking-chart, .ranking-chart')
    this.exportButton = page.locator('button:has-text("导出")')
  }

  async goto(classId: string): Promise<void> {
    await this.page.goto(`/classes/${classId}/stats`)
    await this.page.waitForSelector('.stats-content, .stats-container')
  }

  async switchTimeDimension(dimension: 'week' | 'month' | 'term'): Promise<void> {
    const buttonMap = {
      week: '周',
      month: '月',
      term: '学期'
    }
    await this.page.locator(`button:has-text("${buttonMap[dimension]}")`).click()
    await this.page.waitForTimeout(500)
  }

  async isChartVisible(): Promise<boolean> {
    return this.rankingChart.isVisible().catch(() => false)
  }
}
