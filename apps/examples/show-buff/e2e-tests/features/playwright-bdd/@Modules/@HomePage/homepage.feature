@Modules @HomePage
Feature: Home Page
  As a signed-in user
  I want to browse TV shows on the home page
  So that I can discover, filter, and navigate to show details

  Background:
    Given I am logged in

  @smoke @happy-path
  Scenario: Home page loads with all key UI regions
    Then the element with test ID "header" should be visible
    And the element with test ID "year-pagination" should be visible
    And the element with test ID "year-tab-2026" should be visible
    And the element with test ID "year-tab-2025" should be visible
    And the element with test ID "year-tab-2024" should be visible
    And the element with test ID "year-tab-2023" should be visible
    And the element with test ID "show-grid" should be visible
    And the show grid should contain at least one show card
    And the footer should be visible with the TVMaze attribution link

  @happy-path
  Scenario: Navigation links have correct hrefs
    Then the navigation link "header-nav-home" should have href "/"
    And the navigation link "header-nav-favorites" should have href "/favorites"
    And the navigation link "header-nav-watchlist" should have href "/watchlist"
    And the navigation link "header-nav-lists" should have href "/lists"

  @happy-path
  Scenario: User menu opens and closes on trigger click
    When I click the user menu trigger
    Then the user menu dropdown should be visible
    When I click the user menu trigger
    Then the user menu dropdown should not be visible

  @happy-path
  Scenario: Active year tab has brand-600 styling and inactive tabs have gray styling
    Then the active year tab should have brand-600 styling
    And the inactive year tabs should have gray styling

  @happy-path
  Scenario: Clicking a year tab switches the active tab and reloads the show grid
    When I click the button "2025"
    Then the year tab "2025" should be active
    And the year tab "2026" should not be active
    And the element with test ID "show-grid" should be visible

  @happy-path
  Scenario: Pagination on page 1 has prev disabled and next enabled
    When I click the button "2024"
    Then I should see the text "Page 1 of 2"
    And the element with test ID "page-prev" should be disabled
    And the element with test ID "page-next" should be enabled

  @happy-path
  Scenario: Navigating to next page updates indicator and enables prev
    When I click the button "2024"
    And I click the button "Next →"
    Then I should see the text "Page 2 of 2"
    And the element with test ID "page-prev" should be enabled
    And the element with test ID "page-next" should be disabled

  @happy-path
  Scenario: Navigating back to page 1 restores pagination state
    When I click the button "2024"
    And I click the button "Next →"
    And I click the button "← Prev"
    Then I should see the text "Page 1 of 2"
    And the element with test ID "page-prev" should be disabled

  @happy-path
  Scenario: Clicking a show card navigates to the show detail page
    When I click the first show card
    Then the URL should contain "/show/"

  @happy-path
  Scenario: Footer TVMaze attribution link opens in a new tab
    Then the TVMaze attribution link should be visible in the footer
    And the TVMaze attribution link should open in a new tab
