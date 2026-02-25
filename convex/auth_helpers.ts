type PasswordAuthCallbackArgs = {
  existingUserId: unknown
  type: unknown
  profile: Record<string, unknown>
}

export function normalizePasswordSignInError(error: unknown) {
  if (!(error instanceof Error)) {
    return error
  }

  if (error.message === "InvalidSecret" || error.message === "InvalidAccountId") {
    return new Error("Invalid credentials")
  }

  if (error.message === "TooManyFailedAttempts") {
    return new Error("Too many failed attempts. Try again later.")
  }

  return error
}

export function isFirstAdminBootstrapAttempt(
  args: PasswordAuthCallbackArgs,
): boolean {
  return (
    args.type === "credentials" &&
    args.existingUserId === null &&
    args.profile.role === "admin" &&
    args.profile.createdBy === null
  )
}
