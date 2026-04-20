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

### Home Page

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Submit button | submit-btn | testid | primary CTA |
| Email input | email | label | login form |
| Page heading | Welcome | text | h1 |
