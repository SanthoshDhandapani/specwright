import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import TodoList from './pages/TodoList';
import CreateTodo from './pages/CreateTodo';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route
            path="/todos"
            element={
              <ProtectedRoute>
                <TodoList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/todos/new"
            element={
              <ProtectedRoute>
                <CreateTodo />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="*" element={<Navigate to="/todos" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
