const accountRoutes = [
  "/client/reservations",
  "/client/book",
  "/client/chat",
  "/client/community",
] as const;

type AccountRoute = (typeof accountRoutes)[number];
type Destination = AccountRoute | `/client/book?${string}` | `/client/admission?event=${string}`;

export function admissionHref(event: string | null) {
  return event && /^[a-z0-9]{1,64}$/i.test(event) ? `/client/admission?event=${event}` as const : "/client/reservations";
}

type AuthScreen = "login" | "signup";

export function bookingHref(venue: string | null, date: string | null, guests: number) {
  const params = new URLSearchParams();
  if (venue && /^[a-z0-9]{1,64}$/i.test(venue)) params.set("venue", venue);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  if (Number.isInteger(guests) && guests >= 1 && guests <= 100) params.set("guests", String(guests));
  return params.size ? `/client/book?${params}` as const : "/client/book";
}

export function clientDestination(value: string | null): Destination {
  if (value?.startsWith("/client/admission?")) return admissionHref(new URLSearchParams(value.split("?")[1]).get("event"));
  const known = accountRoutes.find((route) => route === value);
  if (known) return known;
  if (value?.startsWith("/client/book?")) {
    const query = new URLSearchParams(value.slice("/client/book?".length));
    const destination = bookingHref(query.get("venue"), query.get("date"), Number(query.get("guests")));
    if (destination !== "/client/book") return destination;
  }
  return "/client/reservations";
}

export function clientAuthHref(screen: AuthScreen, destination: Destination) {
  return `/client/${screen}?next=${encodeURIComponent(destination)}`;
}
