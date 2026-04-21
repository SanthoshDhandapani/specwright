/**
 * instructions.example.js — Todo App Demo
 *
 * A simple todo management app built with Material UI v6, Zustand, and React Router.
 * Demonstrates email + password auth and the @specwright/plugin-mui overlay.
 *
 * App URL:  http://localhost:5174
 * Auth:     Email + Password (demo@specwright.dev / Specwright2026!)
 * Plugin:   @specwright/plugin-mui
 *
 * Copy any entry below into instructions.js to generate BDD tests.
 * Run with: /e2e-automate (Claude Code skill)
 *
 * After generation:
 *   pnpm bddgen        # regenerate .features-gen/
 *   pnpm test:bdd      # run all BDD tests
 */

export default [

  // ─────────────────────────────────────────────────────────────
  // MODULE 1: Authentication — Sign In / Sign Out
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@Authentication',
    category: '@Modules',
    subModuleName: [],
    fileName: 'authentication',
    instructions: [
      'Verify sign-in page loads with email input, password input, and Sign In button',
      'Successful login with valid credentials — verify redirect to /todos',
      'Login with invalid email format — verify error alert is shown',
      'Login with wrong password — verify error alert is shown',
      'Logout — click Logout button on todo list page, verify redirect to /signin',
    ],
    pageURL: 'http://localhost:5174/signin',
    inputs: {},
    explore: true,
    autoApprove: false,       // true = skip Phase 6 approval prompt and generate immediately
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 2: TodoList — Browse and Filter Todos
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@TodoList',
    category: '@Modules',
    subModuleName: [],
    fileName: 'todo_list',
    instructions: [
      'Verify /todos page loads with Create Todo button and filter tabs (All, Active, Completed)',
      'When no todos exist, verify the empty state message is shown',
      'Click All tab — verify it is active and all todos are shown',
      'Click Active tab — verify only incomplete todos are shown',
      'Click Completed tab — verify only completed todos are shown',
      'Click Create Todo button — verify redirect to /todos/new',
      'Click Logout button — verify redirect back to /signin',
    ],
    pageURL: 'http://localhost:5174/todos',
    inputs: {},
    explore: true,
    autoApprove: false,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 3: CreateTodo — New Todo Form
  // MUI components: TextField, Select (Priority), Autocomplete (Category), DatePicker
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@CreateTodo',
    category: '@Modules',
    subModuleName: [],
    fileName: 'create_todo',
    instructions: [
      'Verify /todos/new form loads with Title, Description, Priority Select, Category Autocomplete, Due Date, Submit, and Cancel',
      'Submit with empty Title — verify inline error "Title is required" appears',
      'Fill Title only and submit — verify todo is created and success snackbar appears',
      'Fill all fields: Title, Description, set Priority to High via MUI Select dropdown, type "Work" in Category Autocomplete, set a Due Date — verify submit creates the todo and snackbar appears',
      'Click Cancel — verify redirect back to /todos without creating a todo',
    ],
    pageURL: 'http://localhost:5174/todos/new',
    inputs: {},
    explore: true,
    autoApprove: false,
    runExploredCases: false,
    runGeneratedCases: false,
  },

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 1: Create Todo → Verify in List
  // Demonstrates: MUI Select, cross-phase localStorage persistence
  // ─────────────────────────────────────────────────────────────
  {
    filePath: '',
    moduleName: '@TodoWorkflow',
    category: '@Workflows',
    subModuleName: ['@0-Precondition', '@1-VerifyInList'],
    fileName: 'todo_workflow',
    instructions: [
      '@0-Precondition (precondition @cross-feature-data): Navigate to /todos/new. Fill Title with <gen_test_data>. Set Priority to High using the MUI Select dropdown. Type "Work" in Category Autocomplete and select it. Click Create Todo. Verify success snackbar appears. Capture the todo title and save as predata under scope "todoworkflow". Also snapshot the todo-app-todos localStorage key.',
      '@1-VerifyInList (workflow-consumer): Load predata from "todoworkflow". Navigate to /todos. Verify the created todo appears in the list with the correct title from predata. Verify the Priority chip shows "High".',
      '@1-VerifyInList (workflow-consumer): Load predata from "todoworkflow". Navigate to /todos. Click the complete checkbox on the created todo — verify it is checked. Switch to Completed filter tab — verify the todo appears there.',
      '@1-VerifyInList (workflow-consumer): Load predata from "todoworkflow". Navigate to /todos. Click the delete button on the created todo — verify a MUI confirmation dialog appears. Click Confirm — verify the todo is removed from the list.',
    ],
    pageURL: 'http://localhost:5174/todos/new',
    inputs: {},
    explore: true,
    autoApprove: false,
    runExploredCases: false,
    runGeneratedCases: false,
  },

];

/**
 * Field Reference:
 *
 * filePath          — Source file (CSV, Excel, PDF). Leave "" for instruction-based.
 * moduleName        — Target module directory (e.g. "@Authentication", "@TodoList").
 * category          — "@Modules" or "@Workflows".
 * subModuleName     — Workflow phase directories (e.g. ["@0-Precondition", "@1-VerifyInList"]).
 * fileName          — Output filename stem (e.g. "todo_workflow" → todo_workflow.feature).
 * instructions      — Test scenario descriptions. One entry = one scenario area.
 * pageURL           — Starting URL for browser exploration.
 * explore           — Enable live browser exploration for selector discovery (Phase 4).
 * autoApprove       — Skip the Phase 6 user approval prompt and proceed to BDD generation
 *                     automatically. Useful for CI or trusted runs. Default: false.
 * runExploredCases  — Run seed tests before BDD generation (Phase 5).
 * runGeneratedCases — Run generated BDD tests after creation (Phase 8).
 *
 * Todo App Key Selectors:
 *   Sign In:     page-signin, input-email, input-password, btn-signin, error-signin
 *   Todo List:   page-todos, btn-create-todo, btn-logout
 *                filter-tab-all, filter-tab-active, filter-tab-completed
 *                todos-empty-state
 *                todo-item-{id}, todo-title-{id}, todo-priority-{id}
 *                todo-complete-{id} (checkbox input), btn-delete-{id}
 *   Create Todo: page-create-todo, input-todo-title, input-todo-description
 *                select-priority (MUI Select root)
 *                input-category (Autocomplete combobox input)
 *                input-due-date (DatePicker input)
 *                btn-submit-todo, btn-cancel-todo
 *                snackbar-success (or getByRole('alert'))
 *   Delete Dialog: getByRole('dialog'), btn-confirm-delete, btn-cancel-delete
 *
 * MUI-specific notes (handled by @specwright/plugin-mui):
 *   - MUI Select:      click root → listbox appears → click option (never page.selectOption())
 *   - MUI Autocomplete: fill input → click option from dropdown
 *   - MUI DatePicker:  type directly in MM/DD/YYYY format
 *   - MUI Checkbox:    data-testid on native <input> via inputProps
 *   - MUI Dialog:      renders in Portal — use getByRole('dialog'), not a testId wrapper
 *   - MUI Snackbar:    assert getByRole('alert') immediately after the triggering action
 */
