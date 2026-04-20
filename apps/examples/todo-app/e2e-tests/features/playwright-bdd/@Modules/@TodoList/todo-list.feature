@todolist @todo-list
Feature: Todo List Page
  Tests for the main /todos page — heading, filter tabs, empty state messages,
  navigation buttons, and logout behaviour.

  Background:
    Given I am authenticated
    When I navigate to "TodoList"

  Scenario: Page loads with heading, New Todo button, and filter tabs
    Then I should see the todos page container
    And I should see the "My Todos" heading
    And I should see the "New Todo" button
    And I should see the All, Active, and Completed filter tabs

  Scenario: Empty state message shown when no todos exist
    Then I should see the empty state container
    And I should see the empty state heading "No todos here yet"
    And I should see the empty state message 'Click "New Todo" to get started!'

  Scenario: All tab is selected by default
    Then the All filter tab should be selected

  Scenario: Active tab filters to incomplete todos
    When I click the Active filter tab
    Then the Active filter tab should be selected
    And I should see the empty state message "No active todos — great job!"

  Scenario: Completed tab filters to completed todos
    When I click the Completed filter tab
    Then the Completed filter tab should be selected
    And I should see the empty state message "No completed todos yet."

  Scenario: New Todo button navigates to the create todo page
    When I click the "New Todo" button
    Then the URL should change to "/todos/new"

  Scenario: Logout button redirects to the sign-in page
    When I click the Logout button
    Then the URL should change to "/signin"
