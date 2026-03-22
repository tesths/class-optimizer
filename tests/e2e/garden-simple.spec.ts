import { test, expect } from '@playwright/test'
import { createClass, createStudent, createTeacherSession } from './helpers/data.helper'

test.describe('班级花园烟雾测试', () => {
  test('GARDEN-SMOKE-001: 花园页双 Tab 与园地墙基础元素可见', async ({ page, request }) => {
    const { token } = await createTeacherSession(page, request)
    const cls = await createClass(request, token, { visual_theme: 'farm' })
    await createStudent(request, token, cls.id, {
      name: '烟雾学生',
      student_no: '20263008'
    })

    await page.goto(`/class/${cls.id}/garden`)

    await expect(page.getByRole('button', { name: '学生列表' })).toBeVisible()
    await expect(page.getByRole('button', { name: '小组列表' })).toBeVisible()
    await expect(page.getByText('我的园地墙')).toBeVisible()
    await expect(page.getByRole('button', { name: /返回/ }).first()).toBeVisible()
  })
})
