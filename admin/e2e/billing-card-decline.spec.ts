/**
 * E2E: card decline during auto-charge writes a failed Payment row
 *
 * Prerequisites (set in .env.e2e):
 *   E2E_BASE_URL          Admin UI URL  (default: http://localhost:5173)
 *   E2E_API_URL           Backend API URL (default: http://localhost:5000)
 *   E2E_ORG_SLUG          Org slug (default: lauz)
 *   E2E_ADMIN_EMAIL       Org admin email
 *   E2E_ADMIN_PASSWORD    Org admin password
 *   E2E_DECLINE_PM_ID     Stripe test PM that always declines
 *
 * Strategy: create a test contact, attach a fake Stripe customer ID + the
 * declining test PM via the card/token endpoint, then trigger a billing run.
 * The billing service attempts to auto-charge, Stripe rejects (any error),
 * the catch block writes a Payment row with status='failed'. The UI tests
 * then verify the invoice detail page shows a red "failed" badge.
 *
 * Auth injection: instead of the login form (which can be disrupted by the
 * axios refresh-token flow on full-page navigations), tokens are written
 * directly into localStorage so the ProtectedRoute and axios interceptors
 * pick them up without a round-trip.
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';

const API      = process.env.E2E_API_URL      ?? 'http://localhost:5000';
const ORG_SLUG = process.env.E2E_ORG_SLUG     ?? 'lauz';
const EMAIL    = process.env.E2E_ADMIN_EMAIL   ?? '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const DECLINE_PM_ID = process.env.E2E_DECLINE_PM_ID ?? 'pm_card_chargeDeclined';

// Unique fake Stripe customer ID per run — billing service will try to charge
// it, Stripe throws "No such customer", catch block fires, failed Payment written.
const FAKE_STRIPE_CUSTOMER = `cus_e2e_decline_${Date.now()}`;

test.describe('billing card decline', () => {
  let accessToken: string;
  let refreshToken: string;
  let userJson: string;
  let contactId: string;
  let enrollmentId: string;
  let invoiceId: string;

  test.beforeAll(async () => {
    if (!EMAIL || !PASSWORD) {
      test.skip();
      return;
    }

    const orgHeader = { 'x-organization-slug': ORG_SLUG };
    const apiCtx = await playwrightRequest.newContext({ baseURL: API, extraHTTPHeaders: orgHeader });

    // ── 1. Log in ──────────────────────────────────────────────────────────
    const loginRes = await apiCtx.post('/api/auth/login', {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), `Login failed: ${await loginRes.text()}`).toBeTruthy();
    const loginBody = await loginRes.json();
    accessToken = loginBody.data.accessToken;
    refreshToken = loginBody.data.refreshToken ?? '';
    userJson = JSON.stringify(loginBody.data.user ?? {});

    const headers = { Authorization: `Bearer ${accessToken}`, ...orgHeader };

    // ── 2. Create a fresh test contact ─────────────────────────────────────
    const contactRes = await apiCtx.post('/api/contacts', {
      headers,
      data: {
        firstName: 'E2E',
        lastName: 'DeclineTest',
        email: `e2e-decline-${Date.now()}@example.com`,
        status: 'active',
      },
    });
    expect(contactRes.ok(), `Create contact: ${await contactRes.text()}`).toBeTruthy();
    const { data: contactData } = await contactRes.json();
    contactId = (contactData.contact ?? contactData).id;

    // ── 3. Attach fake Stripe customer + declining PM ──────────────────────
    // POST /api/contacts/:id/card/token just writes the fields directly —
    // billing will attempt to charge and Stripe will return an error, which
    // our catch block turns into a failed Payment row.
    const cardRes = await apiCtx.post(`/api/contacts/${contactId}/card/token`, {
      headers,
      data: { stripeCustomerId: FAKE_STRIPE_CUSTOMER, stripeDefaultPaymentMethodId: DECLINE_PM_ID },
    });
    expect(cardRes.ok(), `Attach card token: ${await cardRes.text()}`).toBeTruthy();

    // ── 4. Find a program ──────────────────────────────────────────────────
    const progRes = await apiCtx.get('/api/programs?limit=1', { headers });
    const { data: progData } = await progRes.json();
    const programId: string = (progData.programs ?? progData.items ?? [])[0]?.id;
    expect(programId, 'No program found — seed the lauz org first').toBeTruthy();

    // ── 5. Enroll the contact with a past nextBillingDate ──────────────────
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const enrollRes = await apiCtx.post('/api/enrollments', {
      headers,
      data: { contactId, programId, startDate: yesterday, nextBillingDate: yesterday },
    });
    expect(enrollRes.ok(), `Create enrollment: ${await enrollRes.text()}`).toBeTruthy();
    const { data: enrollData } = await enrollRes.json();
    enrollmentId = (enrollData.enrollment ?? enrollData).id;

    // ── 6. Trigger billing run ─────────────────────────────────────────────
    const billingRes = await apiCtx.post('/api/billing/run', { headers });
    expect(billingRes.ok(), `Billing run: ${await billingRes.text()}`).toBeTruthy();

    // ── 7. Locate the invoice created for this contact ─────────────────────
    const invRes = await apiCtx.get(`/api/invoices?contactId=${contactId}&limit=1`, { headers });
    const { data: invData } = await invRes.json();
    const invoiceList = invData.invoices ?? invData.items ?? [];
    expect(invoiceList.length, 'No invoice created for test contact').toBeGreaterThan(0);
    invoiceId = invoiceList[0].id;

    await apiCtx.dispose();
  });

  test.afterAll(async () => {
    if (!accessToken) return;
    const orgHeader = { 'x-organization-slug': ORG_SLUG };
    const apiCtx = await playwrightRequest.newContext({ baseURL: API, extraHTTPHeaders: orgHeader });
    const headers = { Authorization: `Bearer ${accessToken}`, ...orgHeader };

    if (invoiceId)   await apiCtx.post(`/api/invoices/${invoiceId}/void`, { headers }).catch(() => {});
    if (enrollmentId) await apiCtx.delete(`/api/enrollments/${enrollmentId}`, { headers, data: {} }).catch(() => {});
    if (contactId)   await apiCtx.delete(`/api/contacts/${contactId}`, { headers }).catch(() => {});

    await apiCtx.dispose();
  });

  // ── Auth helper ────────────────────────────────────────────────────────────
  // Injects session state directly into localStorage so the ProtectedRoute and
  // axios interceptor find a valid token without going through the login form.
  async function injectAuth(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
    await page.goto('/');
    await page.evaluate(
      ({ at, rt, user, slug }) => {
        localStorage.setItem('pp_access_token', at);
        if (rt) localStorage.setItem('pp_refresh_token', rt);
        if (user) localStorage.setItem('pp_user', user);
        localStorage.setItem('pp_org_slug', slug);
      },
      { at: accessToken, rt: refreshToken, user: userJson, slug: ORG_SLUG },
    );
  }

  test('invoice detail page shows a red "failed" badge for the declined charge', async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.getByText(/INV-/)).toBeVisible({ timeout: 10_000 });

    // Target the desktop table row (mobile view duplicates are md:hidden)
    const paymentsTable = page.locator('table');
    const failedBadge = paymentsTable.getByText('failed', { exact: true });
    await expect(failedBadge).toBeVisible({ timeout: 5_000 });
    await expect(failedBadge).toHaveClass(/red/);
  });

  test('failed payment row shows card method', async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.getByText(/INV-/)).toBeVisible({ timeout: 10_000 });

    // Target the desktop table (mobile view duplicates are md:hidden)
    await expect(page.locator('table').getByText('card', { exact: false }).first()).toBeVisible();
  });
});
