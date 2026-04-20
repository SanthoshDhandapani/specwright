import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Fab,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import TodoItem from '../components/TodoItem';
import { useTodoStore } from '../store/todoStore';
import type { FilterTab } from '../types';

export default function TodoList() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const todos = useTodoStore((state) => state.todos);
  const navigate = useNavigate();

  const filteredTodos = todos.filter((todo) => {
    if (activeTab === 'active') return !todo.completed;
    if (activeTab === 'completed') return todo.completed;
    return true;
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: FilterTab) => {
    setActiveTab(newValue);
  };

  return (
    <Layout>
      <Box data-testid="page-todos">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Todos
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/todos/new')}
            data-testid="btn-create-todo"
          >
            New Todo
          </Button>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab
            label={`All (${todos.length})`}
            value="all"
            data-testid="filter-tab-all"
          />
          <Tab
            label={`Active (${todos.filter((t) => !t.completed).length})`}
            value="active"
            data-testid="filter-tab-active"
          />
          <Tab
            label={`Completed (${todos.filter((t) => t.completed).length})`}
            value="completed"
            data-testid="filter-tab-completed"
          />
        </Tabs>

        {filteredTodos.length === 0 ? (
          <Box
            data-testid="todos-empty-state"
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" gutterBottom>
              No todos here yet
            </Typography>
            <Typography variant="body2">
              {activeTab === 'all'
                ? 'Click "New Todo" to get started!'
                : activeTab === 'active'
                ? 'No active todos — great job!'
                : 'No completed todos yet.'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {filteredTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </Box>
        )}

        <Fab
          color="primary"
          aria-label="add todo"
          onClick={() => navigate('/todos/new')}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            display: { xs: 'flex', sm: 'none' },
          }}
        >
          <AddIcon />
        </Fab>
      </Box>
    </Layout>
  );
}
