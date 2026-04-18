@ListWorkflow @precondition @cross-feature-data @serial-execution
Feature: List Workflow — Phase 0: Create List
  As a signed-in user
  I want to create a named custom list
  So that later workflow phases can add shows to it and verify its contents

  Background:
    Given I am logged in
    When I navigate to "/lists"

  @happy-path
  Scenario: Create "My Top Shows" list and navigate to its detail page
    Then the element with test ID "page-lists" should be visible
    When I create a custom list named "My Top Shows"
    Then the element with test ID "lists-grid" should be visible
    And the list card for "My Top Shows" should be visible
    And the list card for "My Top Shows" should display a show count badge
    When I open the list card for "My Top Shows"
    Then the element with test ID "page-list-detail" should be visible
    And the list detail heading should contain "My Top Shows"
    And the URL should match the list detail pattern

  @edge-case
  Scenario: Empty list name is rejected — form does not submit
    Then the element with test ID "page-lists" should be visible
    When I submit the create list form with an empty name
    Then the URL should end with "/lists"

  @edge-case
  Scenario: Empty state or existing lists grid is present on page load
    Then the element with test ID "page-lists" should be visible
    And the lists empty state or grid should be present
