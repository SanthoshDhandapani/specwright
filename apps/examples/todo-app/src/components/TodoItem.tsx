import { useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { Todo } from '../types';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { useTodoStore } from '../store/todoStore';

interface TodoItemProps {
  todo: Todo;
}

const priorityColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  Low: 'success',
  Medium: 'warning',
  High: 'error',
};

export default function TodoItem({ todo }: TodoItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const toggleComplete = useTodoStore((state) => state.toggleComplete);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);

  const handleDeleteConfirm = () => {
    deleteTodo(todo.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Paper
        elevation={0}
        data-testid={`todo-item-${todo.id}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          mb: 1.5,
          border: '1px solid',
          borderColor: todo.completed ? 'divider' : 'primary.light',
          borderRadius: 2,
          opacity: todo.completed ? 0.75 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <Checkbox
          checked={todo.completed}
          onChange={() => toggleComplete(todo.id)}
          inputProps={{ 'data-testid': `todo-complete-${todo.id}` } as React.InputHTMLAttributes<HTMLInputElement>}
          color="primary"
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            data-testid={`todo-title-${todo.id}`}
            sx={{
              fontWeight: 500,
              textDecoration: todo.completed ? 'line-through' : 'none',
              color: todo.completed ? 'text.secondary' : 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {todo.title}
          </Typography>
          {todo.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {todo.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
            {todo.category && (
              <Chip label={todo.category} size="small" variant="outlined" />
            )}
            {todo.dueDate && (
              <Chip
                label={`Due: ${new Date(todo.dueDate).toLocaleDateString()}`}
                size="small"
                variant="outlined"
                color="default"
              />
            )}
          </Box>
        </Box>

        <Chip
          label={todo.priority}
          size="small"
          color={priorityColors[todo.priority]}
          data-testid={`todo-priority-${todo.id}`}
          sx={{ fontWeight: 600, minWidth: 64 }}
        />

        <Tooltip title="Delete todo">
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            data-testid={`btn-delete-${todo.id}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
        todoTitle={todo.title}
      />
    </>
  );
}
