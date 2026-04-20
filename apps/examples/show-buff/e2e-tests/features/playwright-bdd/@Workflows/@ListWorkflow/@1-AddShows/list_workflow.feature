@workflow-consumer @cross-feature-data @listworkflow
Feature: ListWorkflow Phase 1 — Add Shows to List

  Background:
    Given I am logged in
    Given I load predata from "listworkflow"

  @prerequisite
  Scenario: Add Breaking Bad and Game of Thrones to the created list
    When I navigate to "/"
    And I click on the show "Breaking Bad"
    Then the show detail page should display "Breaking Bad"
    When I open the Add to List dropdown
    And I select the created list from the dropdown
    Then the created list option should show as added
    When I navigate to "/"
    And I click on the show "Game of Thrones"
    Then the show detail page should display "Game of Thrones"
    When I open the Add to List dropdown
    And I select the created list from the dropdown
    Then the created list option should show as added
    And I save the added shows as shared test data
