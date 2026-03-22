import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()

  // Create test users for authentication tests
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Register a test teacher user
    const testUsername = `test_teacher_${Date.now()}`
    await page.goto(`${config.projects[0].use.baseURL}/register`)

    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirm_password"]', 'password123')
    await page.fill('input[name="real_name"]', '测试教师')
    await page.fill('input[name="subject"]', '语文')

    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      // User might already exist, continue anyway
    })

    // Store test credentials for later use in test config
    process.env.TEST_TEACHER_USERNAME = testUsername
    process.env.TEST_TEACHER_PASSWORD = 'password123'
  } catch (error) {
    console.log('Global setup: Test user creation skipped or failed')
  } finally {
    await context.close()
  }

  await browser.close()
}

export default globalSetup
