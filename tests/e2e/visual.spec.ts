import { test, expect, type Page } from '@playwright/test'
import {
  createClass,
  createGroup,
  createStudent,
  createTeacherSession,
  uniqueName
} from './helpers/data.helper'

async function prepareStablePage(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `
  })
}

async function expectAnyVisible(page: Page, selector: string, targetName: string) {
  const candidate = page.locator(selector)
  if (!(await candidate.count())) {
    throw new Error(`Unable to find target: ${targetName}`)
  }
  await expect(candidate.first()).toBeVisible()
}

test.describe('视觉回归快照测试', () => {
  test.beforeEach(async ({ browserName }, testInfo) => {
    test.skip(
      browserName !== 'chromium' || /Mobile/i.test(testInfo.project.name),
      '视觉快照只在桌面 Chromium 上维护基线'
    )
  })

  test('VISUAL-001: 登录页主卡片保持稳定', async ({ page }) => {
    await page.goto('/login')
    await prepareStablePage(page)

    await expect(page.locator('.login-container')).toHaveScreenshot('login-page.png', {
      animations: 'disabled'
    })
  })

  test('VISUAL-002: 班级列表卡片布局保持稳定', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'tree' })

    await page.goto('/')
    await expect(page.locator('.class-card')).toHaveCount(1)
    await page.locator('.class-card .class-name').evaluate((element) => {
      element.textContent = '视觉回归班级'
    })
    await prepareStablePage(page)

    await expect(page.locator('.class-grid')).toHaveScreenshot('class-list.png', {
      animations: 'disabled'
    })
  })

  test('VISUAL-003: 班级详情学生页保持稳定', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, { name: '张三', student_no: 'VISUAL001', seat_no: '1' })
    await createStudent(request, token, cls.id, { name: '李四', student_no: 'VISUAL002', seat_no: '2' })

    await page.goto(`/class/${cls.id}`)
    await expect(page.locator('.student-row')).toHaveCount(2)
    await page.locator('.header h1').evaluate((element) => {
      element.textContent = '视觉班级详情'
    })
    await prepareStablePage(page)

    await expect(page.locator('.class-detail-page')).toHaveScreenshot('class-detail-students.png', {
      animations: 'disabled'
    })
  })

  test('VISUAL-004: 花园视图布局保持稳定', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, {
      visual_theme: 'tree',
      name: uniqueName('视觉花园班级')
    })
    await createStudent(request, token, cls.id, { name: '苗苗', student_no: 'VISUAL101' })
    await createStudent(request, token, cls.id, { name: '果果', student_no: 'VISUAL102' })
    await createGroup(request, token, cls.id, { name: '视觉分组' })

    await page.goto(`/class/${cls.id}/garden`)
    await expect(page.getByRole('button', { name: '学生列表' })).toBeVisible()
    await expect(page.getByRole('button', { name: '小组列表' })).toBeVisible()
    await expect(page.getByRole('button', { name: '班级列表' })).toBeVisible()
    await prepareStablePage(page)

    const gardenRoot = page.locator('.garden-redesign, .garden-view, .garden-page, .garden-shell').first()
    await expect(gardenRoot).toBeVisible()
    await expect(gardenRoot.getByRole('button', { name: '学生列表' })).toBeVisible()
    await expect(gardenRoot.getByRole('button', { name: '小组列表' })).toBeVisible()
    await expect(gardenRoot.getByRole('button', { name: '班级列表' })).toBeVisible()

    await page.getByRole('button', { name: '小组列表' }).click()
    await expectAnyVisible(
      page,
      [
        '[data-testid=\"group-farm-scene\"]',
        '[data-testid=\"group-pixi-scene\"]',
        '.group-pixi-scene',
        '.pixi-group-scene',
        '.pixi-farm-scene[data-scene=\"groups\"]',
        '.group-landscape',
        '.group-field-scene',
        '.group-continuous-field',
        '.group-farm-scene',
        '.group-farm-estate',
        '.group-continuous-farm'
      ].join(', '),
      'group farm scene'
    )
    await expectAnyVisible(
      page,
      [
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
        '.group-field-grid'
      ].join(', '),
      'group farm render surface'
    )

    await page.getByRole('button', { name: '班级列表' }).click()
    await expectAnyVisible(
      page,
      [
        '[data-testid=\"class-farm-scene\"]',
        '[data-testid=\"class-pixi-scene\"]',
        '.class-pixi-scene',
        '.pixi-class-scene',
        '.pixi-farm-scene[data-scene=\"class\"]',
        '.class-estate',
        '.class-panorama',
        '.class-field-scene',
        '.class-continuous-field',
        '.class-farm-scene',
        '.class-farm-estate',
        '.class-continuous-farm'
      ].join(', '),
      'class farm scene'
    )
    await expectAnyVisible(
      page,
      [
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
        '.class-field-grid'
      ].join(', '),
      'class farm render surface'
    )
    await expect(page.locator('.class-panel .class-plot-card, .class-panel .field-plot-card')).toHaveCount(1)
  })
})
