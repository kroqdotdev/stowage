export function getLoginErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    const message = error.message;

    if (
      message.includes("InvalidSecret") ||
      message.includes("InvalidAccountId") ||
      message.includes("Invalid credentials")
    ) {
      return "Invalid email or password";
    }

    if (message.includes("TooManyFailedAttempts")) {
      return "Too many failed attempts. Try again later.";
    }

    if (message.includes("Authentication required")) {
      return "Your session expired. Sign in again.";
    }

    if (message.includes("Server Error")) {
      return "Sign in failed. Please try again.";
    }

    return message;
  }

  return "Sign in failed. Check your email and password and try again.";
}

export function getSetupErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    const message = error.message;

    if (message.includes("Setup is already complete")) {
      return "Setup is already complete. Sign in instead.";
    }

    if (message.includes("Password must be at least 8 characters")) {
      return "Password must be at least 8 characters";
    }

    if (message.includes("Enter a valid email address")) {
      return "Enter a valid email address";
    }

    if (message.includes("Server Error")) {
      return "Setup failed. Please try again.";
    }

    return message;
  }

  return "Setup failed. Check the form and try again.";
}
