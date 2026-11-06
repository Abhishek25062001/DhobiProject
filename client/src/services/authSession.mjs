export class SessionConfirmationError extends Error {
  constructor() {
    super('Your sign-in session could not be confirmed. Please try again.');
    this.name = 'SessionConfirmationError';
  }
}

// A successful credentials response alone is not a usable browser session.
// Confirm the HttpOnly cookie works before showing success or opening a dashboard.
export async function confirmAuthSession(result, getMe) {
  if (!result?.success) return result;
  if (result.session !== true || !result.user?._id) throw new SessionConfirmationError();
  let verified;
  try { verified = await getMe(); }
  catch { throw new SessionConfirmationError(); }
  if (!verified?.success || verified.user?._id !== result.user._id || verified.user?.isActive === false) {
    throw new SessionConfirmationError();
  }
  return { ...result, user: verified.user };
}
