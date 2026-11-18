"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useStoredAccount } from "@/lib/use-stored-account";

const textFields = {
  country: "Pays", city: "Ville", address: "Adresse", openingHours: "Horaires",
  dressCode: "Code vestimentaire", contact: "Contact", website: "Site officiel",
  instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", whatsapp: "WhatsApp",
  logo: "URL du logo", video: "URL du fichier vidéo",
} as const;
type Profile = FunctionArgs<typeof api.venues.save>["profile"];
type EventDraft = Omit<FunctionArgs<typeof api.venueEvents.save>, "token">;
const blankEvent: EventDraft = { name: "", date: "", startTime: "", description: "", published: false };
const input = "input-field min-h-11 w-full min-w-0 px-3 py-2 text-base";

export default function PartnerVenuePage() {
  const { token } = useStoredAccount("partners", "/partner/login");
  const profile = useQuery(api.venues.mine, token ? { token } : "skip");
  const events = useQuery(api.venueEvents.mine, token ? { token } : "skip");
  const closedDates = useQuery(api.availability.mine, token ? { token } : "skip");
  const setClosed = useMutation(api.availability.setClosed);
  const [bookingDate, setBookingDate] = useState("");
  const saveProfile = useMutation(api.venues.save);
  const saveEvent = useMutation(api.venueEvents.save);
  const [event, setEvent] = useState(blankEvent);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string }>();

  async function submit(e: FormEvent<HTMLFormElement>, isEvent: boolean) {
    e.preventDefault();
    if (!token || pending) return;
    const data = new FormData(e.currentTarget);
    const read = (field: string) => String(data.get(field) ?? "");
    setPending(true);
    setNotice(undefined);
    try {
      if (isEvent) {
        await saveEvent({ token, ...event });
        setEvent(blankEvent);
      } else {
        const text = Object.fromEntries(Object.keys(textFields).map((key) => [key, read(key)])) as Pick<Profile, keyof typeof textFields>;
        await saveProfile({ token, profile: {
          ...text, description: read("description"), music: read("music").split(","),
          minimumAge: read("minimumAge") ? Number(read("minimumAge")) : undefined,
          entryPriceEur: read("entryPriceEur") ? Number(read("entryPriceEur")) : undefined,
          published: data.has("published"),
        } });
      }
      setNotice({ error: false, text: "Modifications enregistrées." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Enregistrement impossible." });
    } finally {
      setPending(false);
    }
  }

  async function changeAvailability(date: string, closed: boolean) {
    if (!token || pending) return;
    setPending(true);
    setNotice(undefined);
    try {
      await setClosed({ token, date, closed });
      setNotice({ error: false, text: closed ? "Réservations fermées pour cette date." : "Réservations rouvertes pour cette date." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Modification impossible." });
    } finally {
      setPending(false);
    }
  }

  return <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
    <Link href="/partner/dashboard" className="back-link">Retour au tableau de bord</Link>
    <h1 className="mt-5 font-display text-3xl font-bold">Fiche du club et soirées</h1>
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "mt-4 text-red" : "mt-4 text-blue"}>{notice.text}</p>}
    {profile === undefined ? <p className="mt-5 text-muted">Chargement…</p> : <>
      <form className="card mt-6 grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => submit(e, false)}>
        <h2 className="text-xl font-semibold sm:col-span-2">Fiche publique</h2>
        {Object.entries(textFields).map(([key, label]) => <label className="grid gap-1.5 text-sm" key={key}>{label}
          <input className={input} name={key} defaultValue={profile?.[key as keyof typeof textFields]} />
        </label>)}
        <label className="grid gap-1.5 text-sm">Genres musicaux séparés par des virgules
          <input className={input} name="music" defaultValue={profile?.music.join(", ")} />
        </label>
        <label className="grid gap-1.5 text-sm">Âge minimum
          <input className={input} type="number" name="minimumAge" min="0" max="100" defaultValue={profile?.minimumAge} />
        </label>
        <label className="grid gap-1.5 text-sm">Tarif d’entrée indicatif (€)
          <input className={input} type="number" name="entryPriceEur" min="0" step="0.01" defaultValue={profile?.entryPriceEur} />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">Description
          <textarea className={input} name="description" maxLength={2400} rows={4} defaultValue={profile?.description} />
        </label>
        <label className="flex min-h-11 items-center gap-2"><input name="published" type="checkbox" defaultChecked={profile?.published} /> Publier la fiche</label>
        <button className="btn-primary min-h-11 px-5" disabled={pending}>Enregistrer la fiche</button>
      </form>
      <form className="card mt-6 grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => submit(e, true)}>
        <h2 className="text-xl font-semibold sm:col-span-2">Calendrier des soirées</h2>
        <label className="grid gap-1.5 text-sm">Nom de la soirée
          <input required className={input} value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })} />
        </label>
        <label className="grid gap-1.5 text-sm">Date
          <input required type="date" className={input} value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} />
        </label>
        <label className="grid gap-1.5 text-sm">Heure d’ouverture
          <input required type="time" className={input} value={event.startTime} onChange={(e) => setEvent({ ...event, startTime: e.target.value })} />
        </label>
        <label className="grid gap-1.5 text-sm">Programme et DJ
          <textarea className={input} value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} />
        </label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={event.published} onChange={(e) => setEvent({ ...event, published: e.target.checked })} /> Publier la soirée</label>
        <button className="btn-primary min-h-11 px-5" disabled={pending}>{event.eventId ? "Enregistrer la soirée" : "Ajouter une soirée"}</button>
        {event.eventId && <button type="button" className="min-h-11 text-blue" onClick={() => setEvent(blankEvent)}>Annuler la modification</button>}
      </form>
      <section className="card mt-6 p-5">
        <h2 className="text-xl font-semibold">Disponibilité des tables</h2>
        <p className="mt-2 text-sm text-muted">Fermer une date bloque les nouvelles réservations. Les réservations déjà confirmées restent valides.</p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (bookingDate) void changeAvailability(bookingDate, true);
        }}>
          <label className="grid gap-1.5 text-sm">Date à fermer
            <input className={input} type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
          </label>
          <button className="btn-primary min-h-11 px-5" disabled={pending}>Fermer les réservations</button>
        </form>
        {closedDates?.map(({ _id, date }) => <div key={_id} className="mt-3 flex items-center justify-between gap-3 border-t border-border">
          <time dateTime={date}>{date}</time>
          <button className="min-h-11 text-blue" type="button" disabled={pending} onClick={() => changeAvailability(date, false)}>Rouvrir</button>
        </div>)}
      </section>
      {events?.map(({ _id, name, date, startTime, description, published }) =>
        <article key={_id} className="card mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
          <div><h3 className="font-semibold">{name}</h3><p className="text-sm text-muted">{date} · {startTime} · {published ? "Publiée" : "Brouillon"}</p></div>
          <button type="button" className="min-h-11 text-blue" onClick={() => setEvent({ eventId: _id, name, date, startTime, description, published })}>Modifier</button>
        </article>)}
    </>}
  </main>;
}
