"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useStoredAccount } from "@/lib/use-stored-account";
import { clientAuthHref } from "@/lib/client-navigation";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function timeAgo(ts: number, lang: string) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return lang === "en" ? "just now" : "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export default function CommunityPage() {
  const { t, lang } = useLanguage();
  const { id: clientId, token } = useStoredAccount("clients", clientAuthHref("login", "/client/community"));
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const feed = useQuery(api.community.listFeed, token ? { token } : "skip");
  const createPost = useMutation(api.community.createPost);
  const generateUploadUrl = useMutation(api.community.generateUploadUrl);
  const toggleLike = useMutation(api.community.toggleLike);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handlePublish() {
    if (!clientId || !token) return;
    if (!content.trim() && !photoFile) {
      setError("Ajoute un texte ou une photo avant de publier.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      let photoStorageId: Id<"_storage"> | undefined;

      if (photoFile) {
        const uploadUrl = await generateUploadUrl({ token });
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photoFile.type },
          body: photoFile,
        });
        const json = await result.json();
        photoStorageId = json.storageId;
      }

      await createPost({ clientId, token, content, photoStorageId, rating: rating || undefined });
      setContent("");
      setRating(0);
      setPhotoFile(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-xl sm:text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/client/reservations"
              className="text-sm text-muted hover:text-text"
            >
              {t("reservations.title")}
            </Link>
          </div>
        </div>

        <h1 className="mt-6 text-lg sm:text-xl font-semibold">Communauté</h1>

        {/* Composer */}
        <div className="card mt-4 p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Partage ton avis, ta soirée, tes photos…"
            rows={3}
            className="input-field w-full px-3 py-2.5 text-sm resize-none"
          />

          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? 0 : n)}
                className="text-lg"
                aria-label={`${n} étoiles`}
              >
                {n <= rating ? "★" : "☆"}
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-1 text-xs text-muted">
                {rating}/5 (optionnel — laisse à 0 pour ne pas noter)
              </span>
            )}
          </div>

          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt=""
              className="mt-3 max-h-64 w-full rounded-lg object-cover"
            />
          )}

          {error && (
            <p className="mt-2 text-sm text-red" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <label className="text-sm text-muted hover:text-text cursor-pointer">
              📷 Ajouter photo
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            <button
              onClick={handlePublish}
              disabled={posting}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
            >
              {posting ? "Publication..." : "Publier"}
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="mt-6 flex flex-col gap-4">
          {feed === undefined && (
            <p className="text-sm text-muted text-center py-8">
              {t("reservations.loading")}
            </p>
          )}
          {feed && feed.length === 0 && (
            <div className="card p-6 text-center">
              <p className="text-sm text-muted">
                Aucune publication pour l&apos;instant — sois le/la premier(e)
                à partager ta soirée !
              </p>
            </div>
          )}
          {feed?.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              clientId={clientId} token={token ?? null}
              lang={lang}
              onToggleLike={() =>
                clientId && token && toggleLike({ postId: post._id, clientId, token })
              }
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function PostCard({
  post,
  clientId,
  token,
  lang,
  onToggleLike,
}: {
  post: {
    _id: Id<"posts">;
    content: string;
    photoUrl: string | null;
    rating: number | null;
    createdAt: number;
    authorName: string;
    clubName: string | null;
    likeCount: number;
    commentCount: number;
  };
  clientId: Id<"clients"> | null;
  token: string | null;
  lang: string;
  onToggleLike: () => void;
}) {
  const liked = useQuery(
    api.community.hasLiked,
    clientId && token ? { postId: post._id, clientId, token } : "skip"
  );
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const comments = useQuery(
    api.community.listComments,
    showComments && token ? { postId: post._id, token } : "skip"
  );
  const addComment = useMutation(api.community.addComment);

  async function handleSubmitComment() {
    if (!clientId || !token || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await addComment({ postId: post._id, clientId, token, content: commentText });
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{post.authorName}</p>
          {post.clubName && (
            <p className="text-xs text-muted">dans {post.clubName}</p>
          )}
        </div>
        <p className="text-xs text-muted">{timeAgo(post.createdAt, lang)}</p>
      </div>

      {post.rating && (
        <p className="mt-2 text-sm text-blue">
          {"★".repeat(post.rating)}
          {"☆".repeat(5 - post.rating)}
        </p>
      )}

      {post.content && (
        <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>
      )}

      {post.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.photoUrl}
          alt=""
          className="mt-3 max-h-96 w-full rounded-lg object-cover"
        />
      )}

      <div className="mt-3 flex items-center gap-4 flex-wrap">
        <button
          onClick={onToggleLike}
          className={`flex items-center gap-1.5 text-sm ${
            liked ? "text-red" : "text-muted hover:text-text"
          }`}
        >
          {liked ? "❤️" : "🤍"} {post.likeCount}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          💬 {post.commentCount}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Découvre cette sortie sur TABLE NOW${post.clubName ? ` (${post.clubName})` : ""} : ${post.content}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          📲 WhatsApp
        </a>
        <button
          onClick={() => {
            const text = `Découvre cette sortie sur TABLE NOW${post.clubName ? ` (${post.clubName})` : ""} : ${post.content}`;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          {copied ? "✅ Copié" : "📷 Instagram"}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 border-t border-border pt-3 flex flex-col gap-2">
          {comments === undefined && (
            <p className="text-xs text-muted">{"Chargement..."}</p>
          )}
          {comments?.map((c) => (
            <div key={c._id} className="text-sm">
              <span className="font-medium">{c.authorName}</span>{" "}
              <span className="text-muted text-xs">
                · {timeAgo(c.createdAt, lang)}
              </span>
              <p>{c.content}</p>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitComment();
              }}
              placeholder="Écris un commentaire…"
              className="input-field flex-1 px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleSubmitComment}
              disabled={submitting || !commentText.trim()}
              className="text-sm text-blue disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
