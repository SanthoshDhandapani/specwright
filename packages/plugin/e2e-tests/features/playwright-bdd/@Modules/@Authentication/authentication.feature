@authentication @serial-execution
Feature: Authentication
  As a user of the application
  I want to be able to log in and log out
  So that I can securely access the application

  Background:
    Given I am on the sign-in page

  @login-form @smoke
  Scenario: Login form displays email input with submit button disabled when empty
    Then I should see the heading "Welcome to YourApp!"
    And the element with test ID "loginEmail" should be visible
    And the element with test ID "loginEmailSubmit" should be disabled

  @login-success @smoke @happy-path
  Scenario: Successful login — email, password, optional 2FA — redirects to home
    When I enter valid email
    And I click the email submit button
    Then the element with test ID "loginPassword" should be visible
    When I enter valid password
    And I click the login submit button
    And I handle 2FA if prompted
    Then I should be redirected to "/home"
    And the element with test ID "user-menu-button" should be visible

  @login-invalid-email @validation
  Scenario: Invalid email format shows inline validation error
    When I enter email "invalid-email"
    And I click the email submit button
    Then I should see the text "Enter a valid email address."

  @login-nonexistent-email @negative
  Scenario: Non-existent email proceeds to password step
    When I enter email "nonexistent@example.com"
    And I click the email submit button
    Then the element with test ID "loginPassword" should be visible

  @login-wrong-password @negative
  Scenario: Valid email but wrong password shows password error
    When I enter valid email
    And I click the email submit button
    Then the element with test ID "loginPassword" should be visible
    When I enter password "WrongPassword123"
    And I click the login submit button
    Then the element with test ID "password-error" should be visible

  @logout @smoke
  Scenario: Logout redirects user back to sign-in page
    When I enter valid email
    And I click the email submit button
    And I enter valid password
    And I click the login submit button
    And I handle 2FA if prompted
    Then I should be redirected to "/home"
    When I click the user menu button
    And I click the logout button
    Then I should be redirected to "/signin"

  @unauthenticated-access @security
  Scenario: Unauthenticated access to a protected route redirects to sign-in
    Given I clear browser storage
    When I navigate to "/home"
    Then I should be redirected to "/signin"
    And the element with test ID "loginEmail" should be visible
