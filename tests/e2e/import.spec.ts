import path from 'path'
import { test, expect } from '@playwright/test'
import { createClass, createStudent, createTeacherSession } from './helpers/data.helper'
import { readWorkbookRows } from './helpers/workbook.helper'

const validImportFile = path.resolve(process.cwd(), 'backend/data/import_regression.xlsx')
const mixedImportFile = path.resolve(process.cwd(), 'backend/data/import_mixed_validation.xlsx')
const largeImportFile = path.resolve(process.cwd(), 'backend/data/import_large_batch.xlsx')
const invalidContentImportFile = path.resolve(process.cwd(), 'backend/data/import_invalid_content.xlsx')
const invalidImportFile = path.resolve(process.cwd(), 'README.md')

test.describe('Excel 导入 UI 测试', () => {
  test('IMPORT-001: 可以下载模板', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}/import`)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '下载 Excel 模板' }).click()
    ])

    expect(download.suggestedFilename()).toBe('student_import_template.xlsx')
    const downloadPath = await download.path()
    expect(downloadPath).not.toBeNull()

    const workbookRows = readWorkbookRows(downloadPath!)
    expect(workbookRows[0]).toEqual(['姓名', '学号', '性别', '座号', '小组名称', '备注'])
    expect(workbookRows[1]).toEqual(['张三', '001', '男', '1', '第一小组', ''])
  })

  test('IMPORT-002: 可以预览有效导入文件', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(validImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    await expect(page.getByRole('heading', { name: '预览导入数据' })).toBeVisible()
    await expect(page.getByText('有效: 1')).toBeVisible()
    await expect(page.locator('tbody tr')).toContainText('导入学生')
  })

  test('IMPORT-003: 可以确认导入并回到班级详情', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '导入' }).click()
    await expect(page).toHaveURL(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(validImportFile)
    await page.getByRole('button', { name: '预览' }).click()
    await page.getByRole('button', { name: '确认导入' }).click()

    await expect(page.getByRole('heading', { name: '导入完成' })).toBeVisible()
    await expect(page.getByText('成功: 1')).toBeVisible()

    await page.getByRole('button', { name: '完成' }).click()
    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.locator('tbody tr')).toContainText('导入学生')
  })

  test('IMPORT-004: 非 Excel 文件会显示错误', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(invalidImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    await expect(page.locator('.error')).toContainText('只支持 .xlsx 或 .xls 文件')
  })

  test('IMPORT-005: 混合脏数据会显示部分成功与错误报告', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)
    await createStudent(request, token, cls.id, {
      name: '已存在学生',
      student_no: 'EXISTS001'
    })

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '导入' }).click()
    await expect(page).toHaveURL(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(mixedImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    await expect(page.getByRole('heading', { name: '预览导入数据' })).toBeVisible()
    await expect(page.getByText('有效: 2')).toBeVisible()
    await expect(page.getByText('错误: 3')).toBeVisible()
    await expect(page.locator('tbody tr').filter({ hasText: 'MIX10002' })).toContainText('姓名为空')
    await expect(page.locator('tbody tr').filter({ hasText: 'EXISTS001' })).toContainText('学号 EXISTS001 已存在')
    await expect(page.locator('tbody tr').filter({ hasText: '批次重复二' })).toContainText('学号 MIX10003 在本批次中重复')

    await page.getByRole('button', { name: '确认导入' }).click()

    await expect(page.getByRole('heading', { name: '导入完成' })).toBeVisible()
    await expect(page.getByText('成功: 2')).toBeVisible()
    await expect(page.getByText('失败: 3')).toBeVisible()
    await expect(page.locator('.error-report')).toContainText('第3行: 姓名为空')
    await expect(page.locator('.error-report')).toContainText('第4行: 学号 EXISTS001 已存在')
    await expect(page.locator('.error-report')).toContainText('第6行: 学号 MIX10003 在本批次中重复')

    await page.getByRole('button', { name: '完成' }).click()
    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.locator('tbody tr').filter({ hasText: '导入有效' })).toBeVisible()
    await expect(page.locator('tbody tr').filter({ hasText: '批次重复一' })).toBeVisible()

    await page.getByRole('button', { name: '小组管理' }).click()
    await expect(page.locator('.group-card').filter({ hasText: '星火组' })).toBeVisible()
  })

  test('IMPORT-006: 扩展名正确但内容损坏时显示预览失败', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(invalidContentImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    await expect(page.locator('.error')).toContainText('预览失败')
    await expect(page.getByRole('heading', { name: '预览导入数据' })).toHaveCount(0)
  })

  test('IMPORT-007: 预览慢请求期间会显示加载状态', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.route(/\/api\/classes\/\d+\/students\/import\/preview$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await route.continue()
    })

    await page.goto(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(validImportFile)
    const previewPromise = page.getByRole('button', { name: '预览' }).click()

    await expect(page.getByRole('button', { name: '预览中...' })).toBeDisabled()
    await previewPromise
    await expect(page.getByRole('heading', { name: '预览导入数据' })).toBeVisible()
  })

  test('IMPORT-008: 确认导入慢请求期间会显示导入中状态', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.route(/\/api\/classes\/\d+\/students\/import\/commit$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await route.continue()
    })

    await page.goto(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(validImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    const importPromise = page.getByRole('button', { name: '确认导入' }).click()
    await expect(page.getByRole('button', { name: '导入中...' })).toBeDisabled()
    await importPromise

    await expect(page.getByRole('heading', { name: '导入完成' })).toBeVisible()
    await expect(page.getByText('成功: 1')).toBeVisible()
  })

  test('IMPORT-009: 大批量导入可以完成并创建对应小组', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token)

    await page.goto(`/class/${cls.id}`)
    await page.getByRole('button', { name: '导入' }).click()
    await expect(page).toHaveURL(`/class/${cls.id}/import`)
    await page.locator('input[type="file"]').setInputFiles(largeImportFile)
    await page.getByRole('button', { name: '预览' }).click()

    await expect(page.getByText('有效: 120')).toBeVisible()
    await expect(page.getByText('错误: 0')).toBeVisible()

    await page.getByRole('button', { name: '确认导入' }).click()
    await expect(page.getByRole('heading', { name: '导入完成' })).toBeVisible()
    await expect(page.getByText('成功: 120')).toBeVisible()
    await expect(page.getByText('失败: 0')).toBeVisible()

    await page.getByRole('button', { name: '完成' }).click()
    await expect(page).toHaveURL(`/class/${cls.id}`)
    await expect(page.getByRole('heading', { name: '学生列表 (120)' })).toBeVisible()

    await page.getByRole('button', { name: '小组管理' }).click()
    await expect(page.getByRole('heading', { name: '小组列表 (12)' })).toBeVisible()
  })
})
