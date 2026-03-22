import { Page, Locator } from '@playwright/test'

export class StudentPage {
  readonly page: Page
  readonly addStudentButton: Locator
  readonly studentCards: Locator
  readonly scoreDialog: Locator

  constructor(page: Page) {
    this.page = page
    this.addStudentButton = page.locator('button:has-text("新增学生"), button:has-text("添加学生")')
    this.studentCards = page.locator('.student-card')
    this.scoreDialog = page.locator('.score-dialog, .scoring-modal')
  }

  async goto(classId: string): Promise<void> {
    await this.page.goto(`/classes/${classId}/students`)
    await this.page.waitForSelector('.student-card, .student-list')
  }

  async addStudent(data: {
    name: string
    studentNo: string
    gender?: '男' | '女'
  }): Promise<void> {
    await this.addStudentButton.click()
    await this.page.waitForSelector('.student-form, .student-dialog')

    await this.page.fill('input[name="name"]', data.name)
    await this.page.fill('input[name="student_no"]', data.studentNo)

    if (data.gender) {
      await this.page.selectOption('select[name="gender"]', data.gender)
    }

    await this.page.click('button:has-text("确认"), button:has-text("保存")')
    await this.page.waitForSelector('.student-card', { timeout: 3000 })
  }

  async scoreStudent(studentIndex: number, itemIndex: number = 0): Promise<void> {
    await this.studentCards.nth(studentIndex).locator('button:has-text("评分")').click()
    await this.page.waitForSelector('.score-dialog, .scoring-modal')

    await this.page.locator('.quick-score-btn').nth(itemIndex).click()
    await this.page.click('button:has-text("提交"), button:has-text("确定")')
    await this.page.waitForSelector('.score-dialog', { state: 'hidden', timeout: 3000 })
  }

  async deleteStudent(studentIndex: number): Promise<void> {
    await this.studentCards.nth(studentIndex).locator('button:has-text("删除")').click()
    await this.page.waitForTimeout(500)
  }

  async getStudentCount(): Promise<number> {
    return this.studentCards.count()
  }

  async getStudentScore(studentIndex: number): Promise<string> {
    return this.studentCards.nth(studentIndex).locator('.score-value, .score').textContent() || '0'
  }
}
