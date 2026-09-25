"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { can as roleCan, ROLE_USER, user as getUser, type Permission, type RoleId, type User } from "@/lib/data";

type Theme = "light" | "dark" | "system";

type Session = {
  /** The person using the app (in the prototype, the one representing the previewed role). */
  user: User;
  /** Prototype only: preview the app as another role. */
  viewAs: RoleId;
  setViewAs: (r: RoleId) => void;
  can: (p: Permission) => boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<Session | null>(null);

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode — preference just won't persist */
  }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAsState] = useState<RoleId>("ceo");
  const user = getUser(ROLE_USER[viewAs]);
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const r = read("mesa:viewAs") as RoleId | null;
    if (r) setViewAsState(r);
    const t = read("mesa:theme") as Theme | null;
    if (t) setThemeState(t);
  }, []);

  const setViewAs = useCallback((r: RoleId) => {
    setViewAsState(r);
    write("mesa:viewAs", r);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    write("mesa:theme", t);
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }, []);

  const can = useCallback((p: Permission) => roleCan(viewAs, p), [viewAs]);

  return <Ctx.Provider value={{ user, viewAs, setViewAs, can, theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

/** Runs before paint so the stored theme never flashes. */
export const themeScript = `try{var t=localStorage.getItem("mesa:theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
