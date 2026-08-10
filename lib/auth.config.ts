import type { NextAuthConfig } from "next-auth";

// This config intentionally has NO providers with a database-touching
// `authorize` function, so it's safe to import from middleware.ts, which
// runs in the Edge runtime and can't load native Node modules like
// better-sqlite3. The full config (lib/auth.ts) extends this with the
// Credentials provider for actual sign-in.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "OWNER" | "REP";
    };
  }
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — session persists across visits/restarts
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "OWNER" | "REP";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "leads-system-dev-secret",
  trustHost: true,
};
