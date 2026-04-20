@workflow-consumer @todoworkflow
Feature: Todo Workflow — Verify in List
  Verifies the todo created by the precondition phase appears correctly in the
  list, can be marked as complete, and can be deleted via the confirmation dialog.
  Each scenario independently restores localStorage from the "todoworkflow" predata.

  Background:
    Given I am logged in
    Given I load predata from "todoworkflow"
    When I navigate to "TodoList"

  Scenario: Verify created todo appears with correct title and High priority
    Then the todo from predata should be visible in the list
    And the todo priority should display "High"

  Scenario: Mark todo as complete and verify in Completed tab
    When I click the complete checkbox on the todo from predata
    Then the todo checkbox should be checked
    When I click the "Completed" filter tab
    Then the todo from predata should be visible in the list

  Scenario: Delete todo with confirmation dialog and verify removal
    When I click the delete button on the todo from predata
    Then the delete confirmation dialog should appear
    When I confirm the deletion
    Then the todo from predata should no longer be visible
