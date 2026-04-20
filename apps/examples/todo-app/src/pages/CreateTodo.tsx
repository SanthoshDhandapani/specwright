import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import type { SelectChangeEvent } from '@mui/material/Select';
import Layout from '../components/Layout';
import { useTodoStore } from '../store/todoStore';
import type { Priority } from '../types';

const CATEGORY_OPTIONS = ['Work', 'Personal', 'Shopping', 'Health', 'Learning', 'Finance'];
const PRIORITY_OPTIONS: Priority[] = ['Low', 'Medium', 'High'];

export default function CreateTodo() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [titleError, setTitleError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const addTodo = useTodoStore((state) => state.addTodo);
  const navigate = useNavigate();

  const handlePriorityChange = (event: SelectChangeEvent<Priority>) => {
    setPriority(event.target.value as Priority);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');

    addTodo({
      title: title.trim(),
      description: description.trim(),
      priority,
      category: category.trim(),
      dueDate: dueDate ? dueDate.toISOString() : null,
    });

    setSnackbarOpen(true);
    setTimeout(() => {
      navigate('/todos');
    }, 800);
  };

  const handleCancel = () => {
    navigate('/todos');
  };

  return (
    <Layout>
      <Box data-testid="page-create-todo">
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Create New Todo
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <TextField
            label="Title"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!titleError}
            helperText={titleError}
            slotProps={{
              htmlInput: { 'data-testid': 'input-todo-title' },
            }}
            placeholder="What needs to be done?"
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            slotProps={{
              htmlInput: { 'data-testid': 'input-todo-description' },
            }}
            placeholder="Add more details..."
          />

          <FormControl fullWidth>
            <InputLabel id="priority-label">Priority</InputLabel>
            <Select
              labelId="priority-label"
              label="Priority"
              value={priority}
              onChange={handlePriorityChange}
              data-testid="select-priority"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            freeSolo
            options={CATEGORY_OPTIONS}
            value={category}
            onInputChange={(_, newValue) => setCategory(newValue)}
            onChange={(_, newValue) => setCategory(newValue ?? '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Category"
                placeholder="Select or type a category"
                inputProps={{
                  ...params.inputProps,
                  'data-testid': 'input-category',
                }}
              />
            )}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={(newValue) => setDueDate(newValue)}
              slotProps={{
                textField: {
                  inputProps: { 'data-testid': 'input-due-date' },
                },
              }}
            />
          </LocalizationProvider>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 1 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              data-testid="btn-cancel-todo"
              size="large"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              data-testid="btn-submit-todo"
              size="large"
            >
              Create Todo
            </Button>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          data-testid="snackbar-success"
          severity="success"
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: '100%' }}
        >
          Todo created successfully!
        </Alert>
      </Snackbar>
    </Layout>
  );
}
