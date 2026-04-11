@listworkflow @create-list @precondition @cross-feature-data
Feature: List Workflow — Create List: Create a New List and Verify Card Navigation
  As an authenticated user
  I want to create a new TV show list named "My Top Shows"
  So that I can add shows to it in subsequent workflow steps

  @create-new-list
  Scenario: Create a new list and verify list card navigation
    Given I am logged in
    And I navigate to the lists page
    Then the lists page is loaded
    When I create a new list with the following details:
      | Field Name | Value        | Type   |
      | List Name  | My Top Shows | Static |
    Then the new list card appears in the grid
    And the list card count badge shows "0 shows"
    When I click the "My Top Shows" list card
    Then I am on the list detail page for "My Top Shows"
    And I save the list workflow data for subsequent steps
