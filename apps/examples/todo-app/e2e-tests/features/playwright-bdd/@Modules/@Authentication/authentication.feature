@authentication
Feature: Authentication
  Sign-in and logout flows for the Specwright Todo app

  Background:
    Given I am on the sign-in page

  Scenario: Sign-in page displays all required form elements
    Then the sign-in form should be visible
    And the email input should be visible
    And the password input should be visible
    And the sign-in button should be visible

  Scenario: Successful login with valid credentials redirects to todos
    When I sign in with valid credentials
    Then I should be redirected to "/todos"
    And the todos page should be visible

  Scenario: Login with invalid email format shows error alert
    When I enter "notanemail" as the email address
    And I enter "anypassword" as the password
    And I submit the sign-in form
    Then a sign-in error alert should be visible
    And I should remain on the sign-in page

  Scenario: Login with wrong password shows error alert
    When I enter my registered email address
    And I enter "wrongpassword123" as the password
    And I submit the sign-in form
    Then a sign-in error alert should be visible
    And I should remain on the sign-in page

  Scenario: Logout from todos page redirects back to sign-in
    Given I am signed in to the todo app
    When I click the logout button
    Then I should be redirected to "/signin"
    And the sign-in form should be visible
