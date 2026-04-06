import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { UserMenu } from '../auth/UserMenu';

export function Header() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const navLink = (to: string, label: string, testId: string) => (
    <Link
      to={to}
      data-testid={testId}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'bg-brand-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header data-testid="header" className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" data-testid="header-logo" className="text-xl font-bold text-brand-500">
            📺 ShowBuff
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLink('/', 'Home', 'header-nav-home')}
            {isAuthenticated && navLink('/favorites', 'Favorites', 'header-nav-favorites')}
            {isAuthenticated && navLink('/watchlist', 'Watchlist', 'header-nav-watchlist')}
            {isAuthenticated && navLink('/lists', 'My Lists', 'header-nav-lists')}
          </nav>
        </div>
        <div>
          {isAuthenticated ? <UserMenu /> : <GoogleSignInButton />}
        </div>
      </div>
    </header>
  );
}
