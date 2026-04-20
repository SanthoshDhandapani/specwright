import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Specwright Todo
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            data-testid="btn-logout"
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        {children}
      </Container>
    </Box>
  );
}
