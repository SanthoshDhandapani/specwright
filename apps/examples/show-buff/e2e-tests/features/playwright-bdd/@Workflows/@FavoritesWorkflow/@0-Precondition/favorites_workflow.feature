@precondition @cross-feature-data @serial-execution @favoritesworkflow
Feature: FavoritesWorkflow Phase 0 — Add Show to Favorites

  Background:
    Given I am logged in
    When I navigate to "/home"

  @prerequisite
  Scenario: Add a show to favorites from its detail page
    When I click on the show card for "The Witcher"
    Then the show detail page should display "The Witcher"
    When I add the show to favorites
    Then the show should be marked as favorited
    And I save the show data as shared test data

  Scenario: Already-favorited show shows correct button state
    When I click on the show card for "The Witcher"
    Then the show detail page should display "The Witcher"
    And the show should be marked as favorited
    And the add to favorites button should not be visible
