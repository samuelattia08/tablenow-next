"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/app/LanguageProvider";
import { admissionHref, bookingHref } from "@/lib/client-navigation";

export default function VenuePage() {
  const { venueId } = useParams<{ venueId: string }>();
  const venue = useQuery(api.venues.detail, { venueId });
  const { t, lang } = useLanguage();
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" });
  const price = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/explore" className="back-link">{t("explore.back")}</Link>
      {venue === undefined && <p className="mt-6 text-muted">{t("reservations.loading")}</p>}
      {venue === null && <p className="mt-6 text-muted">{t("explore.unavailable")}</p>}
      {venue && <>
        <header className="mt-7 flex flex-wrap items-center gap-4">
          {venue.logo && <Image src={venue.logo} alt="" width={72} height={72} unoptimized className="rounded-xl" />}
          <div>
            <p className="text-sm text-muted">{venue.city} · {venue.country}</p>
            <h1 className="font-display text-4xl font-bold sm:text-6xl">{venue.name}</h1>
          </div>
        </header>
        {venue.gallery.length > 0 && <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {venue.gallery.map((photo, index) => <Image key={`${photo}-${index}`} src={photo} alt="" width={900} height={560} unoptimized className="aspect-video w-full rounded-2xl object-cover" />)}
        </div>}
        {venue.video && <video className="mt-6 w-full rounded-2xl" controls playsInline preload="none" src={venue.video} aria-label={t("venue.video")} />}
        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_19rem]">
          <section>
            {venue.music.length > 0 && <p className="mb-3 text-blue">{venue.music.join(" · ")}</p>}
            <p className="whitespace-pre-line text-muted">{venue.description}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {([
                ["venue.hours", venue.openingHours],
                ["venue.dress", venue.dressCode],
                ["venue.age", venue.minimumAge],
                ["venue.contact", venue.contact],
                ["venue.address", venue.address],
              ] as const).filter(([, value]) => value !== undefined && value !== "").map(([label, value]) =>
                <div key={label}><dt className="font-medium">{t(label)}</dt><dd className="break-words text-muted">{value}</dd></div>)}
            </dl>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
              {[
                [t("venue.website"), venue.website], ["Instagram", venue.instagram], ["TikTok", venue.tiktok],
                ["Facebook", venue.facebook], ["WhatsApp", venue.whatsapp],
                ["Google Maps", venue.address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.address}, ${venue.city}, ${venue.country}`)}`],
                ["Waze", venue.address && `https://waze.com/ul?q=${encodeURIComponent(`${venue.address}, ${venue.city}, ${venue.country}`)}&navigate=yes`],
              ].filter(([, href]) => href).map(([label, href]) =>
                <a className="inline-flex min-h-11 items-center text-sm text-blue hover:underline" key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
            </div>
          </section>
          <aside className="card self-start p-5">
            {venue.entryPriceEur !== undefined && <p className="text-muted">{t("venue.entry")} · {price.format(venue.entryPriceEur)}</p>}
            {venue.tableFrom !== null && <>
              <p className="mb-3 text-muted">{t("explore.tablesFrom")} · {price.format(venue.tableFrom)}</p>
              <Link href={bookingHref(venue.partnerId, null, 0)} className="btn-primary inline-flex min-h-11 items-center px-5">{t("venue.book")}</Link>
            </>}
          </aside>
        </div>
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">{t("venue.events")}</h2>
          {venue.events.length === 0 && <p className="mt-3 text-muted">{t("venue.noEvents")}</p>}
          {venue.events.map((event) => <article className="card mt-3 p-5" key={event._id}>
            <p className="text-sm text-muted">{date.format(new Date(event.date))} · {event.startTime}</p>
            <h3 className="mt-1 text-lg font-semibold">{event.name}</h3>
            {event.description && <p className="mt-1 text-muted">{event.description}</p>}
            {event.admission && <Link className="mt-2 me-4 inline-flex min-h-11 items-center text-blue hover:underline"
              href={admissionHref(event._id)}>{t("admission.title")} · {price.format(event.admission.priceCents / 100)}</Link>}
            {venue.tableFrom !== null && <Link className="mt-2 inline-flex min-h-11 items-center text-blue hover:underline"
              href={bookingHref(venue.partnerId, event.date, 0)}>{t("venue.book")}</Link>}
          </article>)}
        </section>
        {venue.reviews.length > 0 && <section className="mt-10">
          <h2 className="text-2xl font-semibold">{t("venue.reviews")}</h2>
          {venue.reviews.map((review) => <article className="card mt-3 p-4" key={review._id}>
            <p className="font-semibold">{review.rating} / 5</p><p className="mt-1 text-muted">{review.content}</p>
          </article>)}
        </section>}
      </>}
    </main>
  );
}
