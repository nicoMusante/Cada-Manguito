import type { NextAuthConfig } from "next-auth";

// config "edge-safe": sin providers ni acceso a la base, la usa el
// middleware (corre en el edge) para decidir si redirige a /login.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const logueado = !!auth?.user;
      const esPaginaPublica = nextUrl.pathname === "/login" || nextUrl.pathname === "/registro";
      if (esPaginaPublica) return true;
      return logueado;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
