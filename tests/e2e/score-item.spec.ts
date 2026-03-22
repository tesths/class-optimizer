import { test, expect, type Page } from '@playwright/test'
import { createClass, createTeacherSession } from './helpers/data.helper'

async function openScoreItemForm(page: Page) {
  await page.getByRole('button', { name: '积分项目' }).click()
  await page.getByRole('button', { name: '添加项目' }).click()
  return page.locator('.add-form')
}

async function fillScoreItemForm(
  page: Page,
  params: {
    name: string
    targetType?: 'student' | 'group'
    scoreType?: 'plus' | 'minus'
    scoreValue: number
  }
) {
  const addForm = await openScoreItemForm(page)
  await addForm.locator('.form-group').filter({ hasText: '项目名称' }).locator('input').fill(params.name)
  await addForm.locator('.form-group').filter({ hasText: '适用对象' }).locator('select').selectOption(params.targetType ?? 'student')
  await addForm.locator('.form-group').filter({ hasText: '类型' }).locator('select').selectOption(params.scoreType ?? 'plus')
  await addForm.locator('.form-group').filter({ hasText: '分值' }).locator('input').fill(String(params.scoreValue))
  await page.getByRole('button', { name: '确认添加' }).click()
}

function scoreItemSection(page: Page, title: string) {
  return page.locator('.score-item-section').filter({ hasText: title })
}

test.describe('积分项目 UI 测试', () => {
  test('SCORE-ITEM-001: 可以创建小组减分项目并展示在对应分区', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await fillScoreItemForm(page, { name: '迟到', targetType: 'group', scoreType: 'minus', scoreValue: 2 })

    await expect(scoreItemSection(page, '小组积分项目').locator('.score-item-card').filter({ hasText: '迟到' })).toContainText('-2')
    await expect(scoreItemSection(page, '学生积分项目').locator('.score-item-card').filter({ hasText: '迟到' })).toHaveCount(0)
  })

  test('SCORE-ITEM-002: 非法分值会触发前端校验', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    const addForm = await openScoreItemForm(page)
    await addForm.locator('.form-group').filter({ hasText: '项目名称' }).locator('input').fill('非法项目')
    const scoreInput = addForm.locator('.form-group').filter({ hasText: '分值' }).locator('input')
    await scoreInput.fill('0')
    await page.getByRole('button', { name: '确认添加' }).click()

    expect(await scoreInput.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
    await expect(page.locator('.score-item-card')).toHaveCount(0)
  })

  test('SCORE-ITEM-003: 学生和小组积分项目会分开展示', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await fillScoreItemForm(page, { name: '积极发言', targetType: 'student', scoreType: 'plus', scoreValue: 3 })
    await fillScoreItemForm(page, { name: '团队协作', targetType: 'group', scoreType: 'plus', scoreValue: 4 })

    const studentSection = scoreItemSection(page, '学生积分项目')
    const groupSection = scoreItemSection(page, '小组积分项目')

    await expect(studentSection.locator('.score-item-card').filter({ hasText: '积极发言' })).toContainText('+3')
    await expect(studentSection.locator('.score-item-card').filter({ hasText: '团队协作' })).toHaveCount(0)
    await expect(groupSection.locator('.score-item-card').filter({ hasText: '团队协作' })).toContainText('+4')
    await expect(groupSection.locator('.score-item-card').filter({ hasText: '积极发言' })).toHaveCount(0)
  })
})
