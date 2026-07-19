import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Step 1 for photo upload: the client asks Convex for a one-time upload URL.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPost = mutation({
  args: {
    clientId: v.id("clients"),
    partnerId: v.optional(v.id("partners")),
    content: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.content.trim() && !args.photoStorageId) {
      throw new Error("Ajoute un texte ou une photo avant de publier.");
    }
    const postId = await ctx.db.insert("posts", {
      clientId: args.clientId,
      partnerId: args.partnerId,
      content: args.content.trim(),
      photoStorageId: args.photoStorageId,
      rating: args.rating,
      createdAt: Date.now(),
    });
    return { postId };
  },
});

export const listFeed = query({
  args: { partnerId: v.optional(v.id("partners")) },
  handler: async (ctx, args) => {
    const posts = args.partnerId
      ? await ctx.db
          .query("posts")
          .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
          .order("desc")
          .collect()
      : await ctx.db.query("posts").order("desc").collect();

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.clientId);
        const club = post.partnerId ? await ctx.db.get(post.partnerId) : null;
        const photoUrl = post.photoStorageId
          ? await ctx.storage.getUrl(post.photoStorageId)
          : null;
        const likes = await ctx.db
          .query("postLikes")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .collect();
        const comments = await ctx.db
          .query("postComments")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .collect();

        return {
          _id: post._id,
          content: post.content,
          photoUrl,
          rating: post.rating ?? null,
          createdAt: post.createdAt,
          authorName: author
            ? `${author.firstName} ${author.lastName}`
            : "Utilisateur",
          clubName: club?.clubName ?? null,
          likeCount: likes.length,
          commentCount: comments.length,
        };
      })
    );

    return enriched;
  },
});

export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_post_client", (q) =>
        q.eq("postId", args.postId).eq("clientId", args.clientId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      await ctx.db.insert("postLikes", {
        postId: args.postId,
        clientId: args.clientId,
      });
      return { liked: true };
    }
  },
});

export const hasLiked = query({
  args: {
    postId: v.id("posts"),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_post_client", (q) =>
        q.eq("postId", args.postId).eq("clientId", args.clientId)
      )
      .unique();
    return !!existing;
  },
});

export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    clientId: v.id("clients"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new Error("Écris un commentaire avant d'envoyer.");
    }
    await ctx.db.insert("postComments", {
      postId: args.postId,
      clientId: args.clientId,
      content: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const listComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    return await Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.clientId);
        return {
          _id: c._id,
          content: c.content,
          createdAt: c.createdAt,
          authorName: author
            ? `${author.firstName} ${author.lastName}`
            : "Utilisateur",
        };
      })
    );
  },
});
