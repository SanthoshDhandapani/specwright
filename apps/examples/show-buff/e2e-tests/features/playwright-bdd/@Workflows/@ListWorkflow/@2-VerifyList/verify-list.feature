@listworkflow @verify-list @serial-execution @workflow-consumer
Feature: List Workflow — Verify List: Verify Both Shows in 'My Top Shows' List
  As an authenticated user
  I want to verify that both added shows appear in "My Top Shows" with the correct count
  So that I can confirm the end-to-end list workflow works correctly

  @verify-list-contents
  Scenario: Verify both shows appear in 'My Top Shows' list with correct count badge
    Given I load predata from "listworkflow"
    And I navigate to the lists page for verification
    And the "My Top Shows" list card is visible in the grid
    And the list card count badge for "My Top Shows" shows "2 shows"
    When I click the "My Top Shows" list card
    Then I am on the list detail page for "My Top Shows"
    And the list detail page shows the following data:
      | Field Name        | Value              | Type            |
      | List Name         | My Top Shows       | Static          |
      | Expected Count    | 2                  | Static          |
      | First Show Title  | <from_test_data>   | SharedGenerated |
      | Second Show Title | <from_test_data>   | SharedGenerated |
    And the list contains exactly 2 shows
    And the count text on the detail page shows "2 shows"
