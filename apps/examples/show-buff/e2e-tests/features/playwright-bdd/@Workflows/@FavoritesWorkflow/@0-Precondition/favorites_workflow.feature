@favoritesworkflow @0-Precondition @precondition @cross-feature-data @serial-execution
Feature: Favorites Workflow — Precondition: Add Show to Favorites
  As an authenticated user
  I want to add a TV show to my favorites from the show detail page
  So that the favorites data is available for the verification workflow

  @add-to-favorites
  Scenario: Add a show to favorites from the detail page
    Given I am logged in
    And the home page loads with the show grid visible
    When I click the first show card in the grid
    Then I am on the show detail page
    And I capture the show title from the detail page
    When I click the Add to Favorites button
    Then the button changes to Remove from Favorites confirming it was added
    And I save the favorited show data for workflow verification
