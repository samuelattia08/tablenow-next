"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Role = "clients" | "partners";

function key(role: Role) {
  return `tablenow_session_${role}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("tablenow:session", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("tablenow:session", onChange);
  };
}

export function storeSession(role: Role, token: string) {
  localStorage.setItem(key(role), token);
  window.dispatchEvent(new Event("tablenow:session"));
}

export function useStoredAccount<T extends Role>(role: T, loginHref: string) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribe, () => localStorage.getItem(key(role)), () => undefined);
  const owner = useQuery(api.sessions.current, token ? { token } : "skip");
  const logout = useMutation(api.sessions.logout);

  useEffect(() => {
    if (token === null || owner === null || (owner && owner.role !== role)) {
      router.replace(loginHref);
    }
  }, [loginHref, owner, role, router, token]);

  async function signOut() {
    if (!token) return;
    await logout({ token });
    if (localStorage.getItem(key(role)) === token) localStorage.removeItem(key(role));
    window.dispatchEvent(new Event("tablenow:session"));
  }

  return {
    id: owner?.role === role ? (owner.id as Id<T>) : null,
    token: owner?.role === role ? token : null,
    signOut,
  };
}
