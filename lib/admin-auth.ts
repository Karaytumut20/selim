import { getChatGPTUser, chatGPTSignInPath } from "../app/chatgpt-auth";

function allowedAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminAccess() {
  const allowlist = allowedAdminEmails();
  const user = await getChatGPTUser();

  if (!allowlist.length) {
    return { allowed: process.env.NODE_ENV !== "production", user, configured: false };
  }

  return {
    allowed: Boolean(user && allowlist.includes(user.email.toLowerCase())),
    user,
    configured: true,
  };
}

export async function requireAdminApiAccess() {
  const access = await getAdminAccess();
  if (access.allowed) return access;

  return {
    response: Response.json(
      { error: access.user ? "This account is not authorized for Content Studio." : "Admin authentication is required." },
      { status: access.user ? 403 : 401 },
    ),
  };
}

export function adminSignInPath() {
  return chatGPTSignInPath("/admin");
}
