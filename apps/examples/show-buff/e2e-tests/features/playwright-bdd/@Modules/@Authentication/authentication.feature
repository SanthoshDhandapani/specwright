@authentication @serial-execution
Feature: Authentication
  As a user of the application
  I want to be able to log in and log out
  So that I can securely access the application

  @login-form
  Scenario: Verify login form displays email input
    Given I am on the sign-in page
    Then I should see the heading "Welcome to YourApp!"
    And the element with test ID "loginEmail" should be visible
    And the element with test ID "loginEmailSubmit" should be disabled

  @login-success
  Scenario: Successful login flow
    Given I am on the sign-in page
    When I enter valid email
    And I click the email submit button
    Then the element with test ID "loginPassword" should be visible
    When I enter valid password
    And I click the login submit button
    And I handle 2FA if prompted
    Then I should be redirected to "/home"

  @login-invalid-email
  Scenario: Login with invalid email format
    Given I am on the sign-in page
    When I enter email "invalid-email"
    And I click the email submit button
    Then I should see the text "Enter a valid email address."

  @login-invalid-credentials
  Scenario: Login with invalid credentials
    Given I am on the sign-in page
    When I enter email "nonexistent@example.com"
    And I click the email submit button
    Then the element with test ID "loginPassword" should be visible
    When I enter password "WrongPassword123"
    And I click the login submit button
    Then I should see the text "Email does not exist on YourApp"

  @login-empty-email
  Scenario: Empty email validation
    Given I am on the sign-in page
    Then the element with test ID "loginEmailSubmit" should be disabled

  @logout
  Scenario: Logout flow
    Given I am on the sign-in page
    When I enter valid email
    And I click the email submit button
    And I enter valid password
    And I click the login submit button
    And I handle 2FA if prompted
    Then I should be redirected to "/home"
    When I click the user menu button
    And I click the button "Logout"
    Then I should be redirected to "/signin"

  @unauthenticated-access
  Scenario: Unauthenticated access protection
    Given I clear browser storage
    When I navigate to "/home"
    Then I should be redirected to "/signin"
