/**
 * Authentication test data — TEMPLATE
 *
 * Update the locators below to match YOUR app's login form.
 * Credentials are read from environment variables ONLY.
 * Set TEST_USER_EMAIL and TEST_USER_PASSWORD in your .env file.
 */

const getCredentials = () => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('E2E credentials not configured. Set TEST_USER_EMAIL and TEST_USER_PASSWORD in your .env file.');
  }

  return { email, password };
};

export const authenticationData = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',

  environment: process.env.BASE_ENV || '',

  validCredentials: getCredentials(),

  invalidCredentials: {
    email: 'invalid@email.com',
    password: 'invalid_password',
  },

  // ┌──────────────────────────────────────────────────────────────┐
  // │  UPDATE THESE LOCATORS to match your app's login form        │
  // │  The testId values should match data-testid attributes       │
  // │  in your login page components.                              │
  // └──────────────────────────────────────────────────────────────┘
  locators: {
    emailInput: {
      testId: 'loginEmail', // Update: your email input data-testid
      label: 'Email',
    },
    emailSubmitButton: {
      testId: 'loginEmailSubmit', // Update: your email submit button data-testid
      label: 'Continue',
    },
    passwordInput: {
      testId: 'loginPassword', // Update: your password input data-testid
      label: 'Password',
    },
    loginSubmitButton: {
      testId: 'loginSubmit', // Update: your login submit button data-testid
      label: 'Sign In',
    },
    errorMessage: {
      selector: '[data-testid="loginError"]', // Update: your error message selector
      errorText: 'invalid email or password',
    },
  },

  timeouts: {
    login: 60000,
    loadState: 50000,
    elementWait: 10000,
  },

  // Two-factor authentication (remove if your app doesn't use 2FA)
  twoFactor: {
    code: '99999999',
    locators: {
      codeInput: { testId: 'twoFactorCodeInput' },
      proceedButton: { testId: 'twfProceed' },
    },
  },
};

export default authenticationData;
