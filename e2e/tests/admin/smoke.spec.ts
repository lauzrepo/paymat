import { test, expect } from '@playwright/test';

test('loads the admin dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Paymat/i);
});
