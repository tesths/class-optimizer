import { test, expect } from '@playwright/test'
import { addGroupMember, createClass, createGroup, createScoreItem, createStudent, createTeacherSession } from './helpers/data.helper'

test.describe('小组管理 UI 测试', () => {
  test('GROUP-001: 可以创建小组', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await page.getByRole('button', { name: '添加小组' }).click()
    await page.getByPlaceholder('如：第1组').fill('第一组')
    await page.getByRole('button', { name: '确认添加' }).click()

    await expect(page.getByRole('heading', { name: '小组列表 (1)' })).toBeVisible()
    await expect(page.locator('.group-card').filter({ hasText: '第一组' })).toBeVisible()
  })

  test('GROUP-002: 可以为小组添加成员', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const group = await createGroup(request, token, cls.id, { name: '第二组' })
    const student = await createStudent(request, token, cls.id, {
      name: '小组成员',
      student_no: '20261001'
    })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await page.locator('.group-card').filter({ hasText: group.name }).getByRole('button', { name: '成员' }).click()
    await page.locator('select').selectOption({ label: `${student.name} (${student.student_no})` })
    await page.getByRole('button', { name: '添加', exact: true }).click()

    await expect(page.getByText(`${student.name} (${student.student_no})`)).toBeVisible()
    await expect(page.locator('.group-card').filter({ hasText: group.name })).toContainText('1 名成员')
  })

  test('GROUP-003: 小组评分会进入历史记录', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const group = await createGroup(request, token, cls.id, { name: '第三组' })
    await createScoreItem(request, token, cls.id, {
      name: '小组协作',
      target_type: 'group',
      score_type: 'plus',
      score_value: 1
    })
    const student = await createStudent(request, token, cls.id, {
      name: '历史成员',
      student_no: '20261002'
    })
    await addGroupMember(request, token, cls.id, group.id, student.id)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await page.locator('.group-card').filter({ hasText: group.name }).getByRole('button', { name: '评分' }).click()
    await page.getByRole('button', { name: '小组协作 +1' }).click()
    await page.locator('.dialog input[placeholder="可选备注"]').fill('小组评分测试')
    await page.getByRole('button', { name: '确认评分' }).click()

    await expect(page.getByText('本周加分').locator('..')).toContainText('1')
    await page.getByRole('button', { name: '历史记录' }).click()
    const groupHistory = page.locator('.history-section').filter({ hasText: '小组评分历史' })
    await expect(groupHistory.locator('tbody tr').first()).toContainText(group.name)
    await expect(groupHistory.locator('tbody tr').first()).toContainText('小组协作')
  })

  test('GROUP-004: 可以删除小组', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const group = await createGroup(request, token, cls.id, { name: '待删小组' })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.group-card').filter({ hasText: group.name }).getByRole('button', { name: '删除' }).click()

    await expect(page.locator('.group-card').filter({ hasText: group.name })).toHaveCount(0)
  })

  test('GROUP-005: 小组名称为空时会显示前端校验提示', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await page.getByRole('button', { name: '添加小组' }).click()
    const groupNameInput = page.getByPlaceholder('如：第1组')
    await page.getByRole('button', { name: '确认添加' }).click()

    expect(await groupNameInput.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
  })

  test('GROUP-006: 重复小组名称会显示后端错误提示', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createGroup(request, token, cls.id, { name: '重复小组' })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await page.getByRole('button', { name: '添加小组' }).click()
    await page.getByPlaceholder('如：第1组').fill('重复小组')
    await page.getByRole('button', { name: '确认添加' }).click()

    await expect(page.locator('.add-form .error')).toContainText('小组名已存在')
  })

  test('GROUP-007: 没有小组积分项目时不能提交评分', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    const group = await createGroup(request, token, cls.id, { name: '默认评分组' })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '小组管理' }).click()
    await page.locator('.group-card').filter({ hasText: group.name }).getByRole('button', { name: '评分' }).click()
    await expect(page.getByText('还没有可用小组积分项目')).toBeVisible()
    await expect(page.getByRole('button', { name: '确认评分' })).toBeDisabled()
  })
})
