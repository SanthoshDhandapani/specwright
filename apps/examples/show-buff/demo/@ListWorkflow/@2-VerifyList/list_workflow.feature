@ListWorkflow @workflow-consumer
Feature: List Workflow — Phase 2: Verify List
  As a signed-in user
  I want to verify the contents, rename, delete, and remove-show operations for my list
  So that I know list state is reflected and mutated correctly

  Background:
    Given I am logged in
    Given I load predata from "listworkflow"
    When I navigate to "/lists"

  @happy-path
  Scenario: "My Top Shows" list count badge and detail page are correct
    Then the element with test ID "page-lists" should be visible
    And the list card for "My Top Shows" should be visible
    And the list card for "My Top Shows" should display a show count badge
    When I open the list card for "My Top Shows"
    Then the element with test ID "page-list-detail" should be visible
    And the list detail heading should contain "My Top Shows"
    And the list detail count badge should be visible

  @edge-case
  Scenario: Rename list from detail page via inline input
    When I open the list card for "My Top Shows"
    Then the element with test ID "page-list-detail" should be visible
    When I click the list name heading to start renaming
    Then the element with test ID "rename-list-input" should be visible
    When I rename the list to "My Favourite Shows" and press Enter
    Then the list detail heading should contain "My Favourite Shows"

  @edge-case
  Scenario: Delete list from detail page navigates back to /lists
    When I create a custom list named "To Be Deleted"
    Then the element with test ID "lists-grid" should be visible
    When I open the list card for "To Be Deleted"
    Then the element with test ID "page-list-detail" should be visible
    When I click the delete list button
    Then the URL should end with "/lists"
    And the element with test ID "page-lists" should be visible
    And the list card for "To Be Deleted" should not be visible

  @edge-case
  Scenario: Removing a show from list detail decrements the count badge
    When I open the list card for "My Top Shows"
    Then the element with test ID "page-list-detail" should be visible
    When I capture the list detail count badge text as "beforeCount"
    And I click the first remove-show button
    Then the list detail count badge text should differ from "beforeCount"
