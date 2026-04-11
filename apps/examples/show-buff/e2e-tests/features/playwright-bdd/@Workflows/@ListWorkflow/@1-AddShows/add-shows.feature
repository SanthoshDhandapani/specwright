@listworkflow @add-shows @precondition @cross-feature-data
Feature: List Workflow — Add Shows: Add Two Shows to 'My Top Shows' List
  As an authenticated user
  I want to add two TV shows to my "My Top Shows" list from the show detail page
  So that I can verify the list contents in the final workflow step

  @add-two-shows
  Scenario: Add two shows to 'My Top Shows' list via Add to List dropdown
    Given I load predata from "listworkflow"
    And the home page loads with the show grid visible
    When I click the first show card in the grid
    Then I am on the show detail page
    And I capture and store the first show title
    When I add the current show to the "My Top Shows" list
    Then the list option confirms the show was added
    When I go back to the home page
    And I click the second show card in the grid
    Then I am on the show detail page
    And I capture and store the second show title
    When I add the current show to the "My Top Shows" list
    Then the list option confirms the show was added
    And I save both show titles for workflow verification
