// Demo-grade client-side authentication for the prototype. The static
// export has no server, so the session lives in localStorage; swap this
// module for the bank's SSO/OAuth flow when integrating the sandbox.

export type UserRole = "Relationship Manager" | "Branch Manager";

export interface Session {
  name: string;
  email: string;
  role: UserRole;
  signedInAt: string;
}

const KEY = "alpha-fin-session";

// Two demo personas. Same access password for the judge/demo flow; the email
// decides which cockpit you land in.
export const DEMO_CREDENTIALS = {
  email: "rm.demo@idbibank.in",
  password: "idbi@2026",
};

export const MANAGER_CREDENTIALS = {
  email: "manager.demo@idbibank.in",
  password: "idbi@2026",
};

// A work email routes to the Branch Manager cockpit when it looks like a
// manager/lead/head account; everyone else is a Relationship Manager.
function roleForEmail(email: string): UserRole {
  return /(^|[._-])(manager|mgr|head|lead|branch)([._-]|@)/.test(email)
    ? "Branch Manager"
    : "Relationship Manager";
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function login(email: string, password: string): Session {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Enter a valid work email address.");
  }
  if (password !== DEMO_CREDENTIALS.password) {
    throw new Error("Invalid credentials. Use the demo access password shown below.");
  }

  const role = roleForEmail(cleanEmail);
  const namePart = cleanEmail.split("@")[0].replace(/[._-]+/g, " ");
  const name = namePart
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const fallback = role === "Branch Manager" ? "Branch Manager" : "Relationship Manager";

  const session: Session = {
    name: name || fallback,
    email: cleanEmail,
    role,
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(KEY);
}
