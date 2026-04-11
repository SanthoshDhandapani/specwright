@HomePage @Modules
Feature: Home Page
  As an authenticated user
  I want to browse the ShowBuff home page
  So that I can discover and navigate to TV shows by year

  Background:
    Given I am on the home page

  @structure @smoke
  Scenario: Home page loads with header, year tabs, show grid, and footer
    Then the header is visible
    And the year pagination tabs are visible
    And the show grid is visible
    And the footer is visible with TVMaze attribution

  @navigation
  Scenario Outline: Navigation links point to correct routes
    Then the nav link "<testId>" has href "<expectedHref>" and text "<expectedText>"

    Examples:
      | testId                | expectedHref | expectedText |
      | header-nav-home       | /            | Home         |
      | header-nav-favorites  | /favorites   | Favorites    |
      | header-nav-watchlist  | /watchlist   | Watchlist    |
      | header-nav-lists      | /lists       | My Lists     |

  @user-menu
  Scenario: User menu opens and closes on trigger click
    When I click the user menu trigger
    Then the sign-out button is visible
    When I click the user menu trigger
    Then the sign-out button is not visible

  @year-tabs @smoke
  Scenario: Year filter shows 4 tabs with the current year active
    Then there are 4 year tabs displayed
    And the year tab "year-tab-2026" is active with brand-600 styling
    And the year tab "year-tab-2025" is inactive with gray styling
    And the year tab "year-tab-2024" is inactive with gray styling
    And the year tab "year-tab-2023" is inactive with gray styling

  @year-tabs
  Scenario: Clicking a year tab makes it active and updates the show grid
    When I click the year tab "year-tab-2024"
    Then the year tab "year-tab-2024" is active with brand-600 styling
    And the year tab "year-tab-2026" is inactive with gray styling
    And the show grid is visible

  @pagination @smoke
  Scenario: On page 1 the prev button is disabled and next is enabled
    When I click the year tab "year-tab-2024"
    Then the page indicator shows "Page 1 of 2"
    And the prev page button is disabled
    And the next page button is enabled

  @pagination
  Scenario: Navigating to next page updates indicator and enables prev
    When I click the year tab "year-tab-2024"
    And I click the next page button
    Then the page indicator shows "Page 2 of 2"
    And the prev page button is enabled
    And the next page button is disabled

  @pagination
  Scenario: Navigating back to page 1 disables the prev button again
    When I click the year tab "year-tab-2024"
    And I click the next page button
    And I click the prev page button
    Then the page indicator shows "Page 1 of 2"
    And the prev page button is disabled

  @show-card @smoke
  Scenario: Clicking a show card navigates to the show detail page
    When I click the first show card
    Then I am navigated to a show detail page

  @footer
  Scenario: Footer displays TVMaze attribution link that opens in a new tab
    Then the TVMaze link has href "https://www.tvmaze.com/"
    And the TVMaze link opens in a new tab
