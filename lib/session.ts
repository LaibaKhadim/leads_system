import { auth } from "./auth";
import { getUserById } from "./users";

/**
 * A JWT session cookie can outlive the database it was issued against —
 * e.g. the project's leads.db was replaced/reset but the browser still
 * holds a signed session token referencing a user id from the old DB.
 * NextAuth's `auth()` only verifies the token's signature, not that the
 * user still exists, so code that trusts `session.user.id` for a foreign
 * key (upload_batches.uploadedBy, notes.authorId, tags.createdBy, ...)
 * can crash with SQLITE_CONSTRAINT_FOREIGNKEY instead of failing cleanly.
 *
 * Use this instead of `auth()` in any route that writes a row referencing
 * session.user.id. Returns null if there's no session OR if the session
 * refers to a user that no longer exists / has been deactivated.
 */
export async function getVerifiedSession() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const dbUser = await getUserById(session.user.id);
  if (!dbUser || !dbUser.active) return null;

  return session;
}

export const STALE_SESSION_RESPONSE = {
  error: "Your session refers to an account that no longer exists in the current database. Please log out and log back in.",
  code: "STALE_SESSION",
} as const;
