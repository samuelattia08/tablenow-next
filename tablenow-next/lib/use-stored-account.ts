"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function serverSnapshot() {
  return undefined;
}

export function useStoredAccount<Table extends "clients" | "partners">(
  key: string,
  loginHref: string,
) {
  const router = useRouter();
  const account = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) as Id<Table> | null,
    serverSnapshot,
  );

  useEffect(() => {
    if (account === null) router.replace(loginHref);
  }, [account, loginHref, router]);

  return account;
}
