@ListWorkflow @workflow-consumer @cross-feature-data
Feature: List Workflow — Phase 1: Add Shows
  As a signed-in user
  I want to add shows to my custom list from the show detail page
  So that the list reflects my curation choices

  Background:
    Given I am logged in
    Given I load predata from "listworkflow"
    When I navigate to "/home"

  @happy-path
  Scenario: Add two distinct shows to "My Top Shows"
    Then the element with test ID "show-grid" should be visible
    When I capture the title of show card number 1 as "show1Name"
    And I open show card number 1
    Then the element with test ID "page-show-detail" should be visible
    When I add the current show to the list "My Top Shows"
    Then the "My Top Shows" option in the Add to List menu should be marked as added
    When I navigate to "/home"
    Then the element with test ID "show-grid" should be visible
    When I capture the title of show card number 2 as "show2Name"
    Then the captured title "show2Name" should differ from "show1Name"
    When I open show card number 2
    Then the element with test ID "page-show-detail" should be visible
    When I add the current show to the list "My Top Shows"
    Then the "My Top Shows" option in the Add to List menu should be marked as added

  @edge-case
  Scenario: Add to List dropdown contains the created list
    When I navigate to "/show/169"
    Then the element with test ID "page-show-detail" should be visible
    When I open the Add to List dropdown
    Then the Add to List menu should show at least one list option

  @edge-case
  Scenario: Checkmark persists after closing and reopening the Add to List dropdown
    When I navigate to "/show/169"
    Then the element with test ID "page-show-detail" should be visible
    When I add the current show to the list "My Top Shows"
    Then the "My Top Shows" option in the Add to List menu should be marked as added
    When I close the Add to List dropdown
    And I open the Add to List dropdown
    Then the "My Top Shows" option in the Add to List menu should be marked as added
