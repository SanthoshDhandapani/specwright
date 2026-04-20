@workflow-consumer @listworkflow
Feature: ListWorkflow Phase 2 — Verify List Contents

  Background:
    Given I am logged in
    Given I load predata from "listworkflow-complete"

  Scenario: Verify the created list shows correct count and contains both added shows
    When I navigate to "/lists"
    Then the list card for the created list should be visible
    And the show count badge should read "2 shows" for the created list
    When I click the created list card
    Then the list detail page should show the created list heading
    And both added shows should be visible in the list
