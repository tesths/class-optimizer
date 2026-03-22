import { expect, type Locator, type Page } from '@playwright/test'

export class GardenPage {
  readonly page: Page
  readonly backButton: Locator
  readonly studentTab: Locator
  readonly groupTab: Locator
  readonly classTab: Locator
  readonly groupsPanel: Locator
  readonly classPanel: Locator
  readonly groupSceneRoots: Locator
  readonly classSceneRoots: Locator
  readonly groupSceneSurfaces: Locator
  readonly classSceneSurfaces: Locator

  constructor(page: Page) {
    this.page = page
    this.backButton = page.getByRole('button', { name: /返回/ }).first()
    this.studentTab = page.getByRole('button', { name: /学生(列表|卡片|园地)/ }).first()
    this.groupTab = page.getByRole('button', { name: /小组(列表|卡片|园地)/ }).first()
    this.classTab = page.getByRole('button', { name: /班级(列表|主景|花园|森林)/ }).first()
    this.groupsPanel = page.locator('.groups-panel, .garden-tab-panel.groups-panel').first()
    this.classPanel = page.locator('.class-panel, .garden-tab-panel.class-panel').first()
    this.groupSceneRoots = page.locator([
      '[data-testid=\"group-farm-scene\"]',
      '[data-testid=\"group-pixi-scene\"]',
      '.group-pixi-scene',
      '.pixi-group-scene',
      '.pixi-farm-scene[data-scene=\"groups\"]',
      '.group-field-scene',
      '.group-continuous-field',
      '.group-landscape',
      '.group-field-grid',
      '.group-farm-scene',
      '.group-farm-estate',
      '.group-continuous-farm'
    ].join(', '))
    this.classSceneRoots = page.locator([
      '[data-testid=\"class-farm-scene\"]',
      '[data-testid=\"class-pixi-scene\"]',
      '.class-pixi-scene',
      '.pixi-class-scene',
      '.pixi-farm-scene[data-scene=\"class\"]',
      '.class-estate',
      '.class-continuous-field',
      '.class-field-scene',
      '.class-panorama',
      '.class-garden-scene',
      '.class-farm-scene',
      '.class-farm-estate',
      '.class-continuous-farm'
    ].join(', '))
    this.groupSceneSurfaces = page.locator([
      '[data-testid=\"group-farm-scene\"] canvas',
      '[data-testid=\"group-farm-scene\"]',
      '[data-testid=\"group-pixi-scene\"] canvas',
      '[data-testid=\"group-pixi-scene\"]',
      '.group-pixi-scene canvas',
      '.group-pixi-scene',
      '.pixi-group-scene canvas',
      '.pixi-group-scene',
      '.pixi-farm-scene[data-scene=\"groups\"] canvas',
      '.pixi-farm-scene[data-scene=\"groups\"]',
      '.group-farm-scene canvas',
      '.group-field-grid',
      '.group-landscape'
    ].join(', '))
    this.classSceneSurfaces = page.locator([
      '[data-testid=\"class-farm-scene\"] canvas',
      '[data-testid=\"class-farm-scene\"]',
      '[data-testid=\"class-pixi-scene\"] canvas',
      '[data-testid=\"class-pixi-scene\"]',
      '.class-pixi-scene canvas',
      '.class-pixi-scene',
      '.pixi-class-scene canvas',
      '.pixi-class-scene',
      '.pixi-farm-scene[data-scene=\"class\"] canvas',
      '.pixi-farm-scene[data-scene=\"class\"]',
      '.class-farm-scene canvas',
      '.class-estate',
      '.class-panorama',
      '.class-field-grid',
      '.class-panel .field-mosaic-board'
    ].join(', '))
  }

  private tabLocator(tab: 'students' | 'groups' | 'class'): Locator {
    if (tab === 'groups') return this.groupTab
    if (tab === 'class') return this.classTab
    return this.studentTab
  }

  private static escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private async clickFirstVisible(candidates: Locator[], targetName: string): Promise<void> {
    for (const candidate of candidates) {
      if (await candidate.count()) {
        await candidate.first().click()
        return
      }
    }
    throw new Error(`Unable to find clickable target: ${targetName}`)
  }

  private async expectAnyVisible(candidates: Locator[], targetName: string): Promise<void> {
    for (const candidate of candidates) {
      if (await candidate.count()) {
        await expect(candidate.first()).toBeVisible()
        return
      }
    }
    throw new Error(`Unable to find visible target: ${targetName}`)
  }

  async goto(classId: string, tab: 'students' | 'groups' | 'class' = 'students'): Promise<void> {
    const query = tab === 'students' ? '' : `?tab=${tab}`
    await this.page.goto(`/class/${classId}/garden${query}`)
    await this.studentTab.waitFor({ state: 'visible' })
  }

  async switchTo(tab: 'students' | 'groups' | 'class'): Promise<void> {
    const target = this.tabLocator(tab)
    await expect(target).toBeVisible()
    const classes = await target.getAttribute('class')
    if (classes?.includes('active')) {
      return
    }
    await target.click()
  }

  async ensureGroupFieldSceneVisible(): Promise<void> {
    await this.switchTo('groups')
    await expect(this.groupsPanel).toBeVisible()
    await this.expectAnyVisible([this.groupSceneRoots], 'group field scene')
    await this.expectAnyVisible([this.groupSceneSurfaces], 'group scene surface')
  }

  async ensureClassFieldSceneVisible(): Promise<void> {
    await this.switchTo('class')
    await expect(this.classPanel).toBeVisible()
    await this.expectAnyVisible([this.classSceneRoots], 'class field scene')
    await this.expectAnyVisible([this.classSceneSurfaces], 'class scene surface')
  }

  async goBack(): Promise<string> {
    await this.backButton.click()
    await this.page.waitForURL(/\/class\/\d+$/)
    return this.page.url().match(/\/class\/(\d+)$/)?.[1] || ''
  }

  async openStudentScoreDialog(studentName: string): Promise<void> {
    await this.switchTo('students')
    const safeName = GardenPage.escapeRegex(studentName)
    await this.clickFirstVisible([
      this.page.locator('.student-list-grid').getByRole('button', { name: new RegExp(safeName) }),
      this.page.locator('.student-list-grid button').filter({ hasText: new RegExp(safeName) }),
      this.page.getByRole('button', { name: new RegExp(safeName) })
    ], `student card "${studentName}"`)
    await expect(this.page.getByRole('heading', { name: new RegExp(`给\\s*${safeName}\\s*评分`) })).toBeVisible()
  }

  async selectGroupFromTop(groupName: string): Promise<void> {
    await this.switchTo('groups')
    const safeName = GardenPage.escapeRegex(groupName)
    await this.clickFirstVisible([
      this.page.locator('.group-selector-bar').getByRole('button', { name: new RegExp(safeName) }),
      this.page.locator('.group-top-selector').getByRole('button', { name: new RegExp(safeName) }),
      this.page.locator('.group-control-strip').getByRole('button', { name: new RegExp(safeName) }),
      this.page.locator('.group-toolbar').getByRole('button', { name: new RegExp(safeName) }),
      this.groupsPanel.getByRole('button', { name: new RegExp(safeName) }),
      this.groupsPanel.getByText(groupName, { exact: true })
    ], `group selector "${groupName}"`)
    await expect(this.page.getByText(groupName).first()).toBeVisible()
  }

  async openGroupScoreDialog(groupName: string): Promise<void> {
    await this.selectGroupFromTop(groupName)

    const dialogHeading = this.page.getByRole('heading', { name: /给.*评分|给小组打分/ })
    if (await dialogHeading.count()) {
      await expect(dialogHeading.first()).toBeVisible()
      await expect(this.page.getByText(groupName).first()).toBeVisible()
      return
    }

    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /给当前小组评分/ }),
      this.page.getByRole('button', { name: /当前小组.*评分/ }),
      this.page.getByRole('button', { name: /小组.*评分/ }),
      this.page.getByRole('button', { name: /评分/ })
    ], 'group score entry')
    await expect(this.page.getByRole('heading', { name: /给.*评分|给小组打分/ })).toBeVisible()
    await expect(this.page.getByText(groupName).first()).toBeVisible()
  }

  async selectScoreItem(itemName: string): Promise<void> {
    const safeName = GardenPage.escapeRegex(itemName)
    await this.page.getByRole('button', { name: new RegExp(safeName) }).first().click()
  }

  async submitScore(): Promise<void> {
    await this.page.getByRole('button', { name: '确认评分' }).click()
  }
}
