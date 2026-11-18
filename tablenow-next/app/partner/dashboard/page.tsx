"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useStoredAccount } from "@/lib/use-stored-account";
import { useRouter } from "next/navigation";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const { id: partnerId, token, signOut } = useStoredAccount("partners", "/partner/login");
  const [cityDraft, setCity] = useState<string>();
  const [instagramDraft, setInstagram] = useState<string>();
  const [tiktokDraft, setTiktok] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);


  const partner = useQuery(
    api.partners.getById,
    partnerId && token ? { partnerId, token } : "skip"
  );
  const updateProfile = useMutation(api.partners.updateProfile);
  const generateGalleryUploadUrl = useMutation(
    api.partners.generateGalleryUploadUrl
  );
  const addGalleryPhoto = useMutation(api.partners.addGalleryPhoto);

  const city = cityDraft ?? partner?.city ?? "";
  const instagram = instagramDraft ?? partner?.instagram ?? "";
  const tiktok = tiktokDraft ?? partner?.tiktok ?? "";

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  async function handleSaveProfile() {
    if (!partnerId || !token) return;
    await updateProfile({ partnerId, token, city, instagram, tiktok });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !partnerId || !token) return;
    setUploading(true);
    try {
      const uploadUrl = await generateGalleryUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = await result.json();
      await addGalleryPhoto({ partnerId, token, storageId: json.storageId });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-xl sm:text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-muted hover:text-text"
          >
            Se déconnecter
          </button>
        </div>

        <h1 className="mt-8 text-xl font-semibold">
          {partner ? partner.clubName : "Chargement..."}
        </h1>
        <p className="mt-1 text-sm text-muted">Tableau de bord partenaire</p>

        <Link href="/partner/venue" className="back-link">Gérer la fiche publique et les soirées</Link>

        {/* Profil du club */}
        <div className="card mt-6 p-5">
          <h2 className="text-sm font-semibold">Profil du club</h2>

          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted">Ville</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. Tel Aviv"
                className="input-field mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">
                Instagram du club
              </label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@ton_club"
                className="input-field mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">
                TikTok du club
              </label>
              <input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@ton_club"
                className="input-field mt-1 w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                className="btn-primary px-4 py-2 text-sm"
              >
                Enregistrer
              </button>
              {saved && (
                <span className="text-sm text-blue">✅ Enregistré</span>
              )}
            </div>
          </div>
        </div>

        {/* Photos du club */}
        <div className="card mt-4 p-5">
          <h2 className="text-sm font-semibold">Photos de tes soirées</h2>
          <p className="mt-1 text-xs text-muted">
            Elles seront visibles par les clients qui parcourent les tables.
          </p>

          {partner && partner.galleryUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {partner.galleryUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          <label className="mt-4 inline-block text-sm text-blue hover:underline cursor-pointer">
            {uploading ? "Envoi..." : "📷 Importer une photo"}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Prochaines étapes */}
        <div className="card mt-4 p-5 text-center text-sm">
          <Link href="/partner/floorplan" className="text-blue hover:underline">
            🪑 Gérer le plan de salle
          </Link>
        </div>

        {/* Ce que disent tes clients */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Ce que disent tes clients</h2>
          <CommunityFeedPreview partnerId={partnerId} token={token ?? null} />
        </div>
      </div>
    </main>
  );
}

function CommunityFeedPreview({
  partnerId,
  token,
}: {
  partnerId: Id<"partners"> | null;
  token: string | null;
}) {
  const feed = useQuery(
    api.community.listFeed,
    partnerId && token ? { partnerId, token } : "skip"
  );

  if (feed === undefined) {
    return <p className="mt-3 text-sm text-muted">Chargement...</p>;
  }
  if (feed.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        Pas encore d&apos;avis pour ton club sur la Communauté.
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-3">
      {feed.map((post) => (
        <div key={post._id} className="card p-4">
          <p className="text-sm font-semibold">{post.authorName}</p>
          {post.rating && (
            <p className="text-sm text-blue">
              {"★".repeat(post.rating)}
              {"☆".repeat(5 - post.rating)}
            </p>
          )}
          {post.content && <p className="mt-1 text-sm">{post.content}</p>}
        </div>
      ))}
    </div>
  );
}
