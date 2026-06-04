import { test, expect } from '@playwright/test';

test('loads the landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Paymat/i);
});
