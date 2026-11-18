const accountRoutes = [
  "/client/reservations",
  "/client/book",
  "/client/chat",
  "/client/community",
] as const;

type AccountRoute = (typeof accountRoutes)[number];
type AuthScreen = "login" | "signup";

export function clientDestination(value: string | null): AccountRoute {
  return accountRoutes.find((route) => route === value) ?? "/client/reservations";
}

export function clientAuthHref(screen: AuthScreen, destination: AccountRoute) {
  return `/client/${screen}?next=${encodeURIComponent(destination)}`;
}
