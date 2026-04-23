import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useTenantBranding } from '../../hooks/useTenant';
import { getStripeOnboardingLink } from '../../api/tenant';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const { data: branding } = useTenantBranding();
  const isSandbox = branding?.sandboxMode !== false;
  const needsStripeOnboarding = branding?.sandboxMode === false && branding?.stripeConnectOnboardingComplete === false;

  async function handleCompleteOnboarding() {
    setOnboardingLoading(true);
    try {
      const { url } = await getStripeOnboardingLink();
      window.location.href = url;
    } catch {
      setOnboardingLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {isSandbox && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-700 px-4 py-2 text-center text-xs font-medium text-yellow-800 dark:text-yellow-300">
            Sandbox mode — using Stripe test keys. No real payments will be processed.
          </div>
        )}
        {needsStripeOnboarding && (
          <div className="bg-orange-50 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-700 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
              Action required: complete your Stripe onboarding to start accepting live payments.
            </p>
            <button
              onClick={handleCompleteOnboarding}
              disabled={onboardingLoading}
              className="shrink-0 text-xs font-semibold bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              {onboardingLoading ? 'Loading…' : 'Complete Stripe Setup'}
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
