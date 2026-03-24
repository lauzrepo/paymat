import { apiClient } from '../lib/axios';

export interface BillingRunResult {
  invoicesCreated: number;
  autoCharged: number;
  errors: number;
}

export const runBilling = (): Promise<BillingRunResult> =>
  apiClient.post('/billing/run').then((r) => r.data.data);
