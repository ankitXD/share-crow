# Feature Plan: Admin Panel with Analytics

## Concept

An admin dashboard accessible to any authenticated user. Since sign-up is disabled on production (Vercel) and only works on localhost, anyone who has an account is inherently an admin. The admin panel provides full control over memes (edit, delete) and a dashboard with analytics (views, comments, reactions).

---

## 1. Access & Auth Model

| Environment    | Sign-up  | Who is admin                               |
| -------------- | -------- | ------------------------------------------ |
| **Localhost**  | Enabled  | Anyone who creates an account              |
| **Production** | Disabled | Only pre-existing accounts created locally |

- No roles table needed — **authenticated = admin**.
- Session check via existing `useSession()` hook and `getServerSession()` helper.
- Unauthenticated users cannot access `/admin` routes.

---

## 2. User Flow

```
/upload (existing page)
  ├── Top-left: [Sign Out] button (existing)
  ├── Top-left: [Admin] button (NEW — links to /admin)
  │
/admin (NEW — dashboard)
  ├── Overview Cards
  │   ├── Total Memes
  │   ├── Total Views
  │   ├── Total Reactions
  │   └── Total Comments
  │
  ├── Meme Management Table
  │   ├── Thumbnail + Description
  │   ├── ShortId (linked)
  │   ├── Views count
  │   ├── Reactions count
  │   ├── Comments count
  │   ├── NSFW badge
  │   ├── Upload date
  │   ├── [Edit] button → opens edit dialog
  │   └── [Delete] button → confirmation dialog → soft/hard delete
  │
  ├── Meme Detail Drawer/Dialog (on Edit click)
  │   ├── Edit description
  │   ├── Toggle NSFW flag
  │   ├── View all comments (with delete option)
  │   ├── View all reactions breakdown
  │   └── [Save Changes]
  │
  └── Analytics Section (optional future scope)
      ├── Views over time chart
      ├── Top memes by views
      └── Top memes by reactions
```

---

## 3. UI Changes to `/upload`

Add an **Admin** button next to the existing **Sign Out** button in the top-left header area.

```tsx
// app/upload/page.tsx — top bar addition
<div className="flex items-center gap-2">
  <Link href="/admin">
    <Button variant="outline" size="sm">
      <Shield className="w-4 h-4 mr-2" />
      Admin
    </Button>
  </Link>
  <Button variant="ghost" size="sm" onClick={handleSignOut}>
    <LogOut className="w-4 h-4 mr-2" />
    Sign Out
  </Button>
</div>
```

---

## 4. New Pages & Components

### 4.1 `/admin` — Dashboard Page

**File:** `app/admin/page.tsx` (client component, auth-gated)

- Redirects to `/login` if not authenticated.
- Fetches all memes with aggregated stats via a new Convex query.
- Displays overview stat cards + meme management table.

### 4.2 Admin Layout

**File:** `app/admin/layout.tsx`

- Shared layout with header: logo, "Admin Panel" title, back-to-upload link, sign-out button.
- Auth guard wrapper.

### 4.3 Components

| Component             | File                                      | Purpose                                                  |
| --------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `AdminStatCards`      | `components/admin/stat-cards.tsx`         | Overview cards (total memes, views, reactions, comments) |
| `MemeManagementTable` | `components/admin/meme-table.tsx`         | Sortable/searchable table of all memes with actions      |
| `EditMemeDialog`      | `components/admin/edit-meme-dialog.tsx`   | Dialog to edit description, NSFW flag                    |
| `DeleteMemeDialog`    | `components/admin/delete-meme-dialog.tsx` | Confirmation dialog for meme deletion                    |
| `MemeDetailDrawer`    | `components/admin/meme-detail-drawer.tsx` | Side drawer showing full meme stats, comments, reactions |

---

## 5. Schema Changes (`convex/schema.ts`)

No new tables required. Existing tables (`memes`, `reactions`, `memeViews`, `comments`) already have all the data we need.

**Optional addition** — if we want to track admin actions:

```ts
adminLogs: defineTable({
  userId: v.id("users"),
  action: v.string(),        // "delete_meme", "edit_meme", "delete_comment"
  targetType: v.string(),    // "meme", "comment"
  targetId: v.string(),      // meme or comment _id
  details: v.optional(v.string()), // JSON string of changes
  createdAt: v.number(),
}).index("by_createdAt", ["createdAt"]),
```

---

## 6. Convex Functions

### 6.1 New Queries (`convex/memes.ts` or `convex/admin.ts`)

| Function               | Type  | Purpose                                                                                                  |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| `getAllMemesWithStats` | query | Returns all memes with joined view count, reaction count, comment count. Paginated. For the admin table. |
| `getAdminOverview`     | query | Returns aggregate stats: total memes, total views, total reactions, total comments.                      |
| `getMemeAdminDetail`   | query | Returns a single meme with full reaction breakdown (per emoji), all comments, view count.                |

### 6.2 New Mutations (`convex/memes.ts` or `convex/admin.ts`)

| Function             | Type     | Purpose                                                                                                         |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `updateMeme`         | mutation | Update meme description and/or NSFW flag.                                                                       |
| `deleteMeme`         | mutation | Hard-delete a meme + cascade delete its reactions, views, and comments. Also delete from Cloudinary via action. |
| `adminDeleteComment` | mutation | Hard-delete or soft-delete a comment by its ID.                                                                 |

### 6.3 Delete Cascade Logic

When deleting a meme, clean up all related data:

```ts
export const deleteMeme = mutation({
  args: { memeId: v.id("memes") },
  handler: async (ctx, args) => {
    // Delete all reactions for this meme
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    // Delete all views for this meme
    const views = await ctx.db
      .query("memeViews")
      .withIndex("by_memeId_fingerprint", (q) => q.eq("memeId", args.memeId))
      .collect();
    for (const v of views) await ctx.db.delete(v._id);

    // Delete all comments for this meme
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memeId", (q) => q.eq("memeId", args.memeId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    // Delete the meme itself
    await ctx.db.delete(args.memeId);
  },
});
```

> **Note:** Cloudinary image deletion should be handled via a Convex action (since it requires an HTTP call) triggered after the mutation succeeds.

---

## 7. Dashboard UI Design

### 7.1 Stat Cards Row

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  🖼️ Memes    │ │  👁️ Views    │ │  😂 Reactions │ │  💬 Comments │
│     42       │ │    1,337     │ │     256      │ │      89      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Use shadcn `Card` component with `CardHeader` + `CardContent`.

### 7.2 Meme Table

```
┌────────┬──────────────────────┬─────────┬───────┬──────────┬──────────┬────────┬─────────────┐
│ Image  │ Description          │ ShortId │ Views │ Reactions│ Comments │ NSFW   │ Actions     │
├────────┼──────────────────────┼─────────┼───────┼──────────┼──────────┼────────┼─────────────┤
│ [thumb]│ When the code works..│ aB3cD4e │  42   │    12    │    3     │   No   │ [✏️] [🗑️]  │
│ [thumb]│ Me debugging at 3am  │ xY7zW2q │  128  │    45    │    8     │   No   │ [✏️] [🗑️]  │
└────────┴──────────────────────┴─────────┴───────┴──────────┴──────────┴────────┴─────────────┘
```

- Use shadcn `Table` component.
- Clickable row opens `MemeDetailDrawer`.
- Search/filter bar at top (filter by description text).
- Sort by views, reactions, comments, date.

### 7.3 Edit Meme Dialog

- Uses shadcn `Dialog` component.
- Fields: description (`Textarea`), NSFW toggle (`Switch`).
- Save button calls `updateMeme` mutation.
- Toast on success.

### 7.4 Delete Confirmation Dialog

- Uses shadcn `AlertDialog` component.
- Shows meme thumbnail + description.
- "This action cannot be undone" warning.
- Calls `deleteMeme` mutation on confirm.
- Toast on success, redirects/removes row from table.

---

## 8. File Structure

```
app/
  admin/
    page.tsx                        # Admin dashboard (client component)
    layout.tsx                      # Admin layout with nav header
components/
  admin/
    stat-cards.tsx                  # Overview stat cards
    meme-table.tsx                  # Meme management table
    edit-meme-dialog.tsx            # Edit meme dialog
    delete-meme-dialog.tsx          # Delete confirmation dialog
    meme-detail-drawer.tsx          # Full meme detail side drawer
convex/
  admin.ts                          # Admin-specific queries & mutations
```

---

## 9. Security Considerations

- **Auth gating:** Every admin page and API route must verify session before returning data or performing actions. Use `getServerSession()` on server side, `useSession()` on client side with redirect.
- **Convex mutations:** Admin mutations (delete, edit) should verify the caller is authenticated by checking the session. Since Convex functions don't have built-in auth context from cookies, pass a session token or user ID and validate it server-side.
- **Cloudinary cleanup:** When deleting a meme, also remove the image from Cloudinary to avoid orphaned assets. Use the Cloudinary Admin API `destroy` method via a Convex action.
- **No role escalation:** Since authenticated = admin, no role checks needed — but if roles are added later, mutation-level checks should be added.

---

## 10. Implementation Order

1. **Phase 1 — Backend**
   - Add `updateMeme` and `deleteMeme` mutations to Convex
   - Add `getAllMemesWithStats` and `getAdminOverview` queries
   - Add `adminDeleteComment` mutation
   - (Optional) Add `adminLogs` table and logging

2. **Phase 2 — Admin Dashboard Page**
   - Create `/admin` route with auth guard
   - Build `AdminStatCards` component
   - Build `MemeManagementTable` with search/sort
   - Wire up real-time data via `useQuery`

3. **Phase 3 — Meme Actions**
   - Build `EditMemeDialog` with form + mutation
   - Build `DeleteMemeDialog` with cascade delete
   - Build `MemeDetailDrawer` with comments/reactions view
   - Add Cloudinary image cleanup on delete

4. **Phase 4 — Upload Page Update**
   - Add [Admin] button to `/upload` top bar
   - Only show when authenticated (already gated by page)

5. **Phase 5 — Polish**
   - Loading skeletons for dashboard
   - Empty states
   - Toast notifications for all actions
   - Mobile responsive table (card view on small screens)

---

## 11. Future Enhancements

- **Analytics charts:** Views over time, top memes, reaction trends (using `recharts` via shadcn charts).
- **Bulk actions:** Select multiple memes → bulk delete.
- **Comment moderation:** Flag/review reported comments.
- **Upload history:** Filter memes by who uploaded (if multi-admin).
- **Export data:** CSV export of meme stats.
- **Audit log viewer:** View admin action history from `adminLogs` table.
