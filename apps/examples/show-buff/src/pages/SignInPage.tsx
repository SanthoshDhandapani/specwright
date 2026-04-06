import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export function SignInPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      const returnTo = searchParams.get('returnTo') || '/';
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  return (
    <div data-testid="page-signin" className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h1 data-testid="signin-heading" className="mb-2 text-2xl font-bold text-white">
          Sign In
        </h1>
        <p data-testid="signin-info-text" className="mb-8 text-sm text-gray-400">
          Sign in to save your favorite shows and build your watchlist.
        </p>
        <div className="flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
