@precondition @cross-feature-data @serial-execution @listworkflow
Feature: ListWorkflow Phase 0 — Create List

  Background:
    Given I am logged in
    When I navigate to "/lists"

  @prerequisite
  Scenario: Create a new list and save its ID for subsequent workflow phases
    When I create a new list named "My Top Shows"
    Then the new list card should appear for "My Top Shows"
    When I click the list card for "My Top Shows"
    Then the list detail page should show heading "My Top Shows"
    And the page URL should contain a list UUID
    And I save the list data as shared test data
