@workflow-consumer @favoritesworkflow
Feature: FavoritesWorkflow Phase 1 — Verify Favorites

  Background:
    Given I am logged in
    Given I load predata from "favoritesworkflow"
    When I navigate to "/favorites"

  Scenario: Added show appears in the favorites grid with correct title
    Then the favorites page should be displayed
    And the show from predata should appear in the favorites grid
    And the show title in the grid should match the saved show name

  Scenario: Favorites count badge shows a positive count
    Then the favorites page should be displayed
    And the favorites count badge should be visible
    And the favorites count badge should show a positive number
