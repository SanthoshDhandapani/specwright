import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppRouter } from './routes';
import { useAuthStore } from './store/authStore';
import { useMovieStore } from './store/movieStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateMovies = useMovieStore((s) => s.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateMovies();
  }, [hydrateAuth, hydrateMovies]);

  // Skip GoogleOAuthProvider when client ID is not configured
  if (!GOOGLE_CLIENT_ID) {
    return <AppRouter />;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppRouter />
    </GoogleOAuthProvider>
  );
}
