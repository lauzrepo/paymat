import { test as base } from '@playwright/test';

// Extend this with shared fixtures (e.g. authenticated page, API client)
export const test = base;
export { expect } from '@playwright/test';
