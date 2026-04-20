@precondition @cross-feature-data @serial-execution @todoworkflow
Feature: Todo Workflow Precondition
  Creates a todo with a generated title, High priority, and Work category.
  Saves the todo title and localStorage snapshot as shared predata under
  scope "todoworkflow" for all consumer phases to restore.

  Background:
    Given I am logged in
    When I navigate to "NewTodo"

  @prerequisite
  Scenario: Create todo and save as shared predata
    When I fill the todo form with:
      | Field Name | Value           | Type            |
      | Todo Title | <gen_test_data> | SharedGenerated |
      | Priority   | High            | Static          |
      | Category   | Work            | Static          |
    And I submit the create todo form
    Then I should be on the todos list page
    And the todo with the generated title should appear in the list
    Then I save the todo data as predata under scope "todoworkflow"
