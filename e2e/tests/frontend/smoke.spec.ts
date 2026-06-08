import { test, expect } from '@playwright/test';

test('loads the member portal', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Member Portal/i);
});
