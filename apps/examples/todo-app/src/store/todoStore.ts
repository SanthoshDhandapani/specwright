import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Todo, Priority } from '../types';

interface CreateTodoData {
  title: string;
  description: string;
  priority: Priority;
  category: string;
  dueDate: string | null;
}

interface UpdateTodoData {
  title?: string;
  description?: string;
  priority?: Priority;
  category?: string;
  dueDate?: string | null;
  completed?: boolean;
}

interface TodoState {
  todos: Todo[];
  addTodo: (data: CreateTodoData) => Todo;
  updateTodo: (id: string, data: UpdateTodoData) => void;
  deleteTodo: (id: string) => void;
  toggleComplete: (id: string) => void;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],

      addTodo: (data: CreateTodoData): Todo => {
        const newTodo: Todo = {
          id: crypto.randomUUID(),
          title: data.title,
          description: data.description,
          priority: data.priority,
          category: data.category,
          dueDate: data.dueDate,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        set({ todos: [...get().todos, newTodo] });
        return newTodo;
      },

      updateTodo: (id: string, data: UpdateTodoData): void => {
        set({
          todos: get().todos.map((todo) =>
            todo.id === id ? { ...todo, ...data } : todo
          ),
        });
      },

      deleteTodo: (id: string): void => {
        set({ todos: get().todos.filter((todo) => todo.id !== id) });
      },

      toggleComplete: (id: string): void => {
        set({
          todos: get().todos.map((todo) =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          ),
        });
      },
    }),
    {
      name: 'todo-app-todos',
    }
  )
);
