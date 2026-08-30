import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api';

/**
 * Custom hook to enforce authentication and onboarding lock check across protected pages.
 * - Redirects to /onboarding if an onboarding process is active.
 * - Redirects to /login if unauthenticated.
 * - Calls onSuccess callback when authorization checks pass.
 */
export function useAuthGuard(onSuccess?: () => void) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_in_progress') === 'true') {
      router.push('/onboarding');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    if (onSuccess) {
      onSuccess();
    }
  }, [router]);
}
