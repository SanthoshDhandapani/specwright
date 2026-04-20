# User-Provided Selector Hints

The planner agent reads this file after its first browser snapshot.
Add known selectors here — from design specs, component docs, or Storybook.
Each selector is treated as a high-confidence hint and located in the live page first.
The agent still confirms each one resolves before writing it to seed.spec.js.

---

## Format

### Module or Page Name

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Element description | selector value | testid / role / text / label | optional note |

---

## Example

### Lists Page

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Create list button | create-list-btn | testid | opens create modal |
| List name input | list-name-input | testid | inside create modal |
| Save button | save-list-btn | testid | submits form |
| List card | list-card | testid | repeating, use .nth() |

### Navigation

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| User avatar | user-avatar | testid | top right, click to open menu |
| Sign out button | Sign out | text | inside user menu |
