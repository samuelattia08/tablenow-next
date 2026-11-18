"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { bookingHref } from "@/lib/client-navigation";

const emptySearch = { country: "", city: "", music: "", from: "", to: "", guests: 2, eventsOnly: false, availableOnly: false };

export default function ExplorePage() {
  const { t, lang } = useLanguage();
  const [draft, setDraft] = useState(emptySearch);
  const [search, setSearch] = useState(emptySearch);
  const venues = useQuery(api.venues.search, search);
  const destinations = useQuery(api.venues.destinations);
  const countries = [...new Set(destinations?.map((venue) => venue.country))].sort();
  const cities = [...new Set(destinations?.filter((venue) => !draft.country || venue.country === draft.country).map((venue) => venue.city))].sort();
  const genres = [...new Set(destinations?.flatMap((venue) => venue.music))].sort();
  const price = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" });
  const calendarDate = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" });
  const today = new Date().toISOString().slice(0, 10);
  const singleDay = Boolean(draft.from && (!draft.to || draft.to === draft.from));

  return (
    <main className="flex-1">
      <section className="explore-banner px-5 pt-5 pb-14 sm:px-8 sm:pb-20">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link className="font-display text-xl font-bold" href="/">TABLE <span className="gradient-text">NOW</span></Link>
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher />
            <Link className="inline-flex min-h-11 items-center text-sm" href="/client/reservations">{t("chooser.client")}</Link>
          </div>
        </header>
        <div className="mx-auto mt-12 max-w-6xl">
          <h1 className="font-display max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">{t("explore.title")}</h1>
          <p className="mt-3 max-w-xl text-muted">{t("explore.subtitle")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <form className="card relative -mt-6 grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          setSearch({ ...draft, to: draft.to || draft.from, availableOnly: singleDay && draft.availableOnly });
        }}>
          {([
            ["country", countries],
            ["city", cities],
            ["music", genres],
          ] as const).map(([field, options]) => (
            <label className="grid min-w-0 gap-1.5 text-sm" key={field}>
              {t(`explore.${field}`)}
              <select className="input-field min-h-11 min-w-0 px-3 text-base" value={draft[field]} onChange={(e) =>
                setDraft({ ...draft, [field]: e.target.value, ...(field === "country" ? { city: "" } : {}) })}>
                <option value="">{t("explore.all")}</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          ))}
          <label className="grid min-w-0 gap-1.5 text-sm">{t("explore.from")}
            <input className="input-field min-h-11 min-w-0 px-3 text-base" type="date" min={today}
              value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value, to: e.target.value > draft.to ? "" : draft.to })} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm">{t("explore.to")}
            <input className="input-field min-h-11 min-w-0 px-3 text-base" type="date" min={draft.from || today}
              value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm">{t("explore.guests")}
            <input className="input-field min-h-11 min-w-0 px-3 text-base" type="number" min="1" max="100" required
              value={draft.guests || ""} onChange={(e) => setDraft({ ...draft, guests: Number(e.target.value) })} />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.eventsOnly} onChange={(e) => setDraft({ ...draft, eventsOnly: e.target.checked })} />{t("explore.eventsOnly")}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm has-disabled:text-muted">
            <input type="checkbox" disabled={!singleDay} checked={singleDay && draft.availableOnly}
              onChange={(e) => setDraft({ ...draft, availableOnly: e.target.checked })} />{t("explore.availableOnly")}
          </label>
          <button type="submit" className="btn-primary min-h-11 px-6">{t("explore.search")}</button>
        </form>

        <section className="mt-10" aria-live="polite">
          <h2 className="font-display text-2xl font-semibold">{t("explore.venues")}</h2>
          {venues === undefined && <p className="mt-6 text-muted">{t("reservations.loading")}</p>}
          {venues?.length === 0 && <p className="card mt-5 p-5 text-muted">{t("explore.empty")}</p>}
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues?.map((venue) => (
              <article key={venue.partnerId} className="card overflow-hidden transition-colors hover:border-blue/50">
                {venue.photo && <Image src={venue.photo} width={600} height={340} alt="" unoptimized className="aspect-video w-full object-cover" />}
                <div className="p-5">
                  <p className="text-sm text-muted">{venue.city} · {venue.country}</p>
                  <h3 className="mt-1 text-xl font-semibold">
                    <Link href={`/venue/${venue.partnerId}`} className="hover:underline">{venue.name}</Link>
                  </h3>
                  {venue.music.length > 0 && <p className="mt-2 text-sm text-muted">{venue.music.join(" · ")}</p>}
                  {venue.event && <p className="mt-3 text-sm">{calendarDate.format(new Date(venue.event.date))} · {venue.event.name}</p>}
                  {venue.tableFrom !== null && (
                    <Link className="mt-4 inline-flex min-h-11 items-center text-sm text-blue hover:underline"
                      href={bookingHref(venue.partnerId, search.from, search.guests)}>
                      {venue.availableOnSelectedDate ? t("explore.available") : t("explore.tablesFrom")} · {price.format(venue.tableFrom)}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
