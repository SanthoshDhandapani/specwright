export type Priority = 'Low' | 'Medium' | 'High';

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: string;
  dueDate: string | null; // ISO date string
  completed: boolean;
  createdAt: string; // ISO date string
}

export type FilterTab = 'all' | 'active' | 'completed';
