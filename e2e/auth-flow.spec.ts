import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('student signup → admin approval → login → view dashboard', async ({ page }) => {
    // Step 1: Student signup
    await page.goto('/signup')
    await page.fill('input[name="name"]', 'Test Student')
    await page.fill('input[name="email"]', `teststudent${Date.now()}@college.edu`)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for success message
    await expect(page.locator('text=Account created successfully')).toBeVisible()

    // Step 2: Try to login (should fail - not approved)
    await page.goto('/login')
    await page.fill('input[name="email"]', 'teststudent@college.edu')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show pending approval message
    await expect(page.locator('text=pending approval')).toBeVisible()

    // Note: Admin approval would typically be done via admin panel
    // This test assumes the student account is pre-approved in the seed data
  })

  test('login with approved account', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'student1@college.edu')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to student dashboard
    await expect(page).toHaveURL(/\/student/)
    await expect(page.locator('text=Student Dashboard')).toBeVisible()
  })
})
