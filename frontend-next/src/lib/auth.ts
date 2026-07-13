// Demo-grade client-side authentication for the prototype. The static
// export has no server, so the session lives in localStorage; swap this
// module for the bank's SSO/OAuth flow when integrating the sandbox.

export interface Session {
  name: string;
  email: string;
  role: string;
  signedInAt: string;
}

const KEY = "alpha-fin-session";

export const DEMO_CREDENTIALS = {
  email: "rm.demo@idbibank.in",
  password: "idbi@2026",
};

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

  const namePart = cleanEmail.split("@")[0].replace(/[._-]+/g, " ");
  const name = namePart
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const session: Session = {
    name: name || "Relationship Manager",
    email: cleanEmail,
    role: "Relationship Manager",
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(KEY);
}
