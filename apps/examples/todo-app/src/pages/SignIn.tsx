import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/todos" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    const success = login(email, password);
    if (success) {
      navigate('/todos');
    } else {
      setError(true);
    }
  };

  return (
    <Box
      data-testid="page-signin"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card elevation={3} sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom color="primary">
            Specwright Todo
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to manage your todos
          </Typography>

          {error && (
            <Alert severity="error" data-testid="error-signin" sx={{ mb: 2 }}>
              Invalid credentials. Please try again.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              slotProps={{
                htmlInput: { 'data-testid': 'input-email' },
              }}
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                htmlInput: { 'data-testid': 'input-password' },
              }}
              sx={{ mb: 3 }}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              data-testid="btn-signin"
            >
              Sign In
            </Button>
          </Box>

          <Typography variant="caption" display="block" align="center" sx={{ mt: 2 }} color="text.secondary">
            Demo: demo@specwright.dev / Specwright2026!
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
