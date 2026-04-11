@favoritesworkflow @1-VerifyFavorites @workflow-consumer
Feature: Favorites Workflow — Verify: Show Appears in Favorites
  As an authenticated user
  I want to verify that a show I favorited appears on the favorites page
  So that I can confirm the end-to-end favorites workflow works correctly

  @verify-favorites
  Scenario: Favorited show appears in favorites page with correct title and count
    Given I load predata from "favoritesworkflow"
    When I navigate to "/favorites"
    Then the favorites page is loaded
    And the favorites grid is visible with show cards
    And the favorited show appears in the grid with the correct title
    And the favorites count badge shows a non-zero number
