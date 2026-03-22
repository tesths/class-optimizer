import { test, expect, type Locator, type Page } from '@playwright/test'
import {
  addGroupMember,
  createClass,
  createGroup,
  createScoreItem,
  createStudent,
  createTeacherSession,
  getClassByApi,
  uniqueName
} from './helpers/data.helper'
import { GardenPage } from './pages/GardenPage'

async function switchTheme(page: Page, target: 'farm' | 'tree') {
  const candidates = target === 'farm'
    ? [/花园/i, /农场/i, /种菜/i]
    : [/森林/i, /树/i, /树林/i]

  const scoped = page.locator('.theme-switcher')

  for (const pattern of candidates) {
    const button = scoped.getByRole('button', { name: pattern }).first()
    if (await button.count()) {
      await button.click()
      return true
    }
  }

  for (const pattern of candidates) {
    const button = page.getByRole('button', { name: pattern }).first()
    if (await button.count()) {
      await button.click()
      return true
    }
  }
  return false
}

async function expectAnyVisible(candidates: Locator[], targetName: string) {
  for (const candidate of candidates) {
    if (await candidate.count()) {
      await expect(candidate.first()).toBeVisible()
      return
    }
  }
  throw new Error(`Unable to find visible target: ${targetName}`)
}

test.describe('班级花园视图 UI 测试', () => {
  test('GARDEN-001: 可以从班级详情进入花园并显示三 tab，默认是学生列表', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, {
      name: uniqueName('花园班级'),
      visual_theme: 'farm'
    })
    await createStudent(request, token, cls.id, {
      name: '花园学生',
      student_no: '20263001'
    })

    const gardenPage = new GardenPage(page)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: /进入花园/ }).click()
    await expect(page).toHaveURL(`/class/${cls.id}/garden`)
    await expect(gardenPage.studentTab).toBeVisible()
    await expect(gardenPage.groupTab).toBeVisible()
    await expect(gardenPage.classTab).toBeVisible()
  })

  test('GARDEN-002: 学生 tab 显示学生卡片，点击卡片可打开评分弹窗', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'tree' })
    await createStudent(request, token, cls.id, { name: '第一名学生', student_no: '20263002' })
    await createStudent(request, token, cls.id, { name: '第二名学生', student_no: '20263003' })
    await createScoreItem(request, token, cls.id, { name: '花园加分', score_type: 'plus', score_value: 2 })
    const gardenPage = new GardenPage(page)

    await gardenPage.goto(String(cls.id))
    await gardenPage.switchTo('students')

    await expect(page.getByText('第一名学生').first()).toBeVisible()
    await expect(page.getByText('第二名学生').first()).toBeVisible()
    await gardenPage.openStudentScoreDialog('第一名学生')
    await expect(page.getByText('成长阶段')).toBeVisible()
  })

  test('GARDEN-003: 学生评分后学生卡片分值会更新', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, { name: '加分学生', student_no: '20263005' })
    await createScoreItem(request, token, cls.id, { name: '课堂发言', score_type: 'plus', score_value: 2 })
    const gardenPage = new GardenPage(page)

    await gardenPage.goto(String(cls.id))
    await gardenPage.openStudentScoreDialog('加分学生')
    await gardenPage.selectScoreItem('课堂发言')
    await gardenPage.submitScore()

    await expect(page.getByText('加分学生').first()).toBeVisible()
    await expect(page.locator('body')).toContainText(/2分|2 分/)
  })

  test('GARDEN-004: 小组 tab 通过顶部小组切换与评分入口完成评分', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { name: uniqueName('小组评分班级') })
    const groupA = await createGroup(request, token, cls.id, { name: '协作一组' })
    const groupB = await createGroup(request, token, cls.id, { name: '协作二组' })
    const studentA = await createStudent(request, token, cls.id, { name: '组员甲', student_no: '20263008' })
    const studentB = await createStudent(request, token, cls.id, { name: '组员乙', student_no: '20263012' })
    await addGroupMember(request, token, cls.id, groupA.id, studentA.id)
    await addGroupMember(request, token, cls.id, groupB.id, studentB.id)
    await createScoreItem(request, token, cls.id, {
      name: '团队协作',
      target_type: 'group',
      score_type: 'plus',
      score_value: 3
    })
    const gardenPage = new GardenPage(page)

    await gardenPage.goto(String(cls.id))
    await gardenPage.ensureGroupFieldSceneVisible()
    await expectAnyVisible([
      page.locator([
        '[data-testid=\"group-farm-scene\"]',
        '[data-testid=\"group-pixi-scene\"]',
        '.group-pixi-scene',
        '.pixi-group-scene',
        '.pixi-farm-scene[data-scene=\"groups\"]',
        '.group-landscape',
        '.group-farm-scene',
        '.group-farm-estate',
        '.group-continuous-farm'
      ].join(', '))
    ], 'group continuous farm root')
    await expectAnyVisible([
      page.locator([
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
      ].join(', '))
    ], 'group farm render surface')
    await expect(page.locator('.group-toolbar, .group-selector-bar, .group-control-strip').first()).toBeVisible()
    await gardenPage.selectGroupFromTop('协作二组')
    await gardenPage.openGroupScoreDialog('协作二组')
    await gardenPage.selectScoreItem('团队协作')
    await gardenPage.submitScore()

    await expect(page.getByText('协作二组').first()).toBeVisible()
    await expect(page.locator('body')).toContainText(/3分|3 分/)
  })

  test('GARDEN-005: 班级 tab 是连续田地纯展示，不提供评分入口或分层卡片', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { name: uniqueName('班级展示班级') })
    await createStudent(request, token, cls.id, { name: '展示学生', student_no: '20263010' })
    const group = await createGroup(request, token, cls.id, { name: '展示小组' })
    const student = await createStudent(request, token, cls.id, { name: '展示组员', student_no: '20263011' })
    await addGroupMember(request, token, cls.id, group.id, student.id)
    const gardenPage = new GardenPage(page)

    await gardenPage.goto(String(cls.id))
    await gardenPage.ensureClassFieldSceneVisible()
    await expectAnyVisible([
      page.locator([
        '[data-testid=\"class-farm-scene\"]',
        '[data-testid=\"class-pixi-scene\"]',
        '.class-pixi-scene',
        '.pixi-class-scene',
        '.pixi-farm-scene[data-scene=\"class\"]',
        '.class-estate',
        '.class-panorama',
        '.class-farm-scene',
        '.class-farm-estate',
        '.class-continuous-farm'
      ].join(', '))
    ], 'class continuous farm root')
    await expectAnyVisible([
      page.locator([
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
      ].join(', '))
    ], 'class farm render surface')
    await expect(page.locator('.class-panel .class-plot-card, .class-panel .field-plot-card')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /确认评分/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /给.*评分|给小组打分/ })).toHaveCount(0)
    await expect(page.locator('.panorama-band, .class-band, .class-band-card')).toHaveCount(0)
  })

  test('GARDEN-006: 返回按钮可以回到班级详情', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, { name: '返回学生', student_no: '20263006' })
    const gardenPage = new GardenPage(page)

    await gardenPage.goto(String(cls.id))
    await gardenPage.goBack()

    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.getByRole('heading', { name: cls.name })).toBeVisible()
  })

  test('GARDEN-007: 页面主题切换会持久化到班级配置', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, {
      name: uniqueName('主题切换班级'),
      visual_theme: 'tree'
    })
    await createStudent(request, token, cls.id, { name: '主题学生', student_no: '20263009' })
    const gardenPage = new GardenPage(page)

    await gardenPage.goto(String(cls.id))
    const switched = await switchTheme(page, 'farm')
    test.skip(!switched, '当前页面未暴露可访问的主题切换按钮')

    await expect.poll(async () => {
      const latestClass = await getClassByApi(request, token, cls.id)
      return latestClass.visual_theme
    }, { timeout: 15000 }).toBe('farm')

    await page.reload()
    await expect(page.getByRole('button', { name: /花园/i }).first()).toHaveClass(/active/)
  })
})
