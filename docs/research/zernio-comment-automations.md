# Zernio Comment-Automations (Comment-to-DM) — Research & Integration Design

Research date: 2026-06-11. Author: research agent.

> **Confidence labels used below:** `[Zernio-confirmed]` = stated in Zernio's own docs/product pages; `[Meta-confirmed]` = stated in Meta's official developer docs; `[Inferred]` = reasoned from comparable tools (ManyChat) or partial evidence — verify before relying on it.

## TL;DR — Timing verdict

**You MUST create the comment-automation AFTER the post is published.** Zernio's create endpoint requires `platformPostId` (the live Instagram/Facebook media ID), which only exists once the post is live. You cannot attach an automation to a Zernio scheduled-but-unpublished post, nor (per current docs) create a truly "account-wide / any post" automation. `[Zernio-confirmed]`

→ **The proposed architecture is essentially correct.** Preset the keyword/link/reply on the `scheduled_post` at schedule time, then create the Zernio automation in the `zernio-webhook` handler when `post.published` arrives with the platform post id. See [Verdict on proposed architecture](#verdict-on-proposed-architecture) for required adjustments.

---

## 1. Zernio comment-automation API

Source of truth: `https://docs.zernio.com/llms-full.txt` (full docs dump) and the product page `https://zernio.com/comment-to-dm`.

> **Endpoint-path caveat:** the marketing page (`/comment-to-dm`) shows `POST /api/v1/comment-automations`, while the full docs (`llms-full.txt`) describe the resource as `automations` (`POST /api/v1/automations`, CLI `zernio automations:create`). These conflict. **Confirm the exact path against `https://docs.zernio.com/api/openapi` (the OpenAPI spec) before coding.** The `automations` form is the more authoritative (it's in the reference docs, not marketing). `[Zernio-confirmed, with path ambiguity]`

### Endpoints `[Zernio-confirmed]`

| Operation | Method + Path | Notes |
|---|---|---|
| Create | `POST /api/v1/automations` | requires `platformPostId` |
| List | `GET /api/v1/automations` | all automations for the account |
| Get | `GET /api/v1/automations/{id}` | returns details + recent trigger logs |
| Update | `PATCH /api/v1/automations/{id}` | docs note "Draft automations only" for some edits; `isActive` toggle works as the enable/disable |
| Delete | `DELETE /api/v1/automations/{id}` | removes automation + logs |
| Logs | `GET /api/v1/automations/{id}/logs` | which comments triggered, delivery status (filter `--status sent`) |

No dedicated `toggle` endpoint — toggling is `PATCH … { "isActive": false }`.

### Create request body — verbatim field names `[Zernio-confirmed]`

```json
{
  "profileId": "string",
  "accountId": "string",
  "platformPostId": "string",
  "name": "string",
  "keywords": "string (comma-separated, e.g. \"info,details,link\")",
  "dmMessage": "string",
  "commentReply": "string (optional public reply)",
  "isActive": true
}
```

- `platformPostId` — **Required.** The Instagram/Facebook media ID of the already-published post.
- `keywords` — comma-separated string (NOT a JSON array). Empty/omitted ⇒ triggers on ALL comments. `[Zernio-confirmed]`
- `dmMessage` — the auto-DM text sent to the commenter (put your lead-magnet link here).
- `commentReply` — optional public reply on the comment (e.g. "Check your DMs!").
- `isActive` — boolean enable/disable flag.
- Response returns the automation object with `_id`.

### Fields the user asked about that are NOT clearly documented `[uncertain]`

- **`matchMode` (exact/contains/any):** the product page mentions "exact or contains matching"; the reference docs only show keyword list vs. match-all. The literal field name `matchMode` is **not confirmed**. Treat "contains" as the likely default. **Verify in OpenAPI spec.**
- **Buttons / inline links / quick replies:** Meta supports up to 13 quick replies OR 1-3 inline buttons in a private reply `[Meta-confirmed via Zernio IG platform page]`, but Zernio's documented create body only exposes `dmMessage` (plain text) + `commentReply`. A structured-button field is **not confirmed** in the create schema — likely link-in-text only for now. `[uncertain]`
- **Link click tracking:** not documented as a first-class field. No `comment.dm.clicked`-style webhook found. Assume **no built-in click tracking**; use your own redirect/UTM link if you need conversion attribution. `[uncertain]`
- **Dedup:** "Won't DM the same person twice per automation" — automatic, no field to configure. `[Zernio-confirmed]`
- **Status values:** docs reference "Draft automations" vs active; the controllable flag is `isActive`. A richer `status` enum is not documented. `[uncertain]`

---

## 2. TIMING — before vs after publish (the crux) `[Zernio-confirmed]`

- `platformPostId` is **required** on create and is the native IG/FB media ID.
- That ID does not exist until the post is published.
- There is **no documented way** to: attach an automation to a Zernio scheduled (unpublished) post, target "the next post," or create a genuinely account-wide automation. (Empty keywords = all comments on **that one post**, not all posts.)

**Verdict: create automations AFTER publish, in the `post.published` webhook handler, once you have the platform post id.** This matches how Zernio's own webhook flow works (`comment.received` events come from Meta's Graph API webhooks on the tracked post).

---

## 3. Meta / Instagram constraints for comment→DM (private replies)

Cross-confirmed from Meta's official Instagram Platform docs (`developers.facebook.com/docs/instagram-platform/private-replies`) and Zernio's IG platform page.

- **Time window: 7 days** from when the comment was made, for posts and Reels. (Instagram Live: only during the broadcast.) This is the **private-reply allowance**, NOT the 24-hour standard-messaging window. `[Meta-confirmed]`
- **One message per comment.** After that, you can only continue if the user replies to your DM (which then opens the standard messaging window). `[Meta-confirmed]`
- **Per-media:** private replies are tied to a specific comment on a specific media. The automation is per-post (`platformPostId`). `[Meta-confirmed]`
- **Content types:** works on professional **feed posts, Reels, Stories, Live, and ad/boosted posts.** `[Meta-confirmed]`
- **Account requirements:** Instagram **professional (Business/Creator)** account connected to a **Facebook Page.** `[Meta-confirmed]`
- **Required permission scopes** `[Meta-confirmed]`:
  - Instagram Login flow: `instagram_business_basic`, `instagram_business_manage_comments` (+ `instagram_business_manage_messages` to send the DM).
  - Facebook Login flow: `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_read_engagement`, `pages_manage_metadata`.
  - Zernio's docs list the scopes it uses as: `instagram_basic`, `instagram_manage_messages`, `pages_manage_metadata`, `pages_read_engagement`. `[Zernio-confirmed]`
- **App Review:** these are advanced permissions requiring Meta App Review + Advanced Access. **In the Zernio path, Zernio holds the reviewed app and permissions — you do NOT do your own Meta App Review.** This is the entire value of routing through Zernio. `[Inferred — strongly implied by Zernio's "no Meta App needed" positioning; confirm your Zernio plan covers Inbox/messaging]`
- `human_agent`: relevant only for the *extended* 7-day human-agent messaging window for ongoing conversations, not for the initial private reply. Not required for the one-shot comment→DM. `[Meta-confirmed / Inferred]`

---

## 4. Webhook events for comment-automations `[Zernio-confirmed + gaps]`

Zernio's documented webhook catalog (`https://docs.zernio.com/webhooks`) includes:

- **`comment.received`** — fired when a comment is detected on a tracked post (includes optional `ad` metadata if the post is boosted). This is the event most relevant to automations.
- Messaging events that fire when the auto-DM is sent / delivered / read:
  - `message.sent` — outgoing message dispatched
  - `message.delivered` — reached recipient (Facebook; WhatsApp)
  - `message.read` — recipient opened the message
  - `conversation.started` — new DM conversation initiated

**Gap:** there is **NO** dedicated `automation.triggered`, `automation.dm_sent`, or `link.clicked` event in the documented catalog. `[Zernio-confirmed: absence]`

**Conversion tracking implication:** to attribute conversions you'll need to correlate `comment.received` (the trigger) and `message.sent`/`message.read` (DM delivered/opened) yourself, and use a tracked/UTM link inside `dmMessage` for actual click/conversion data (your own redirect service or analytics). Don't rely on Zernio for click tracking.

---

## 5. Platform coverage `[Zernio-confirmed]`

- **Instagram and Facebook** — same API, same webhook flow, same automation object.
- **YouTube / TikTok: NOT supported** for comment-to-DM automations. (Neither platform exposes a private-reply-to-commenter messaging primitive comparable to Meta's.) Comment automations are Meta-only.

---

## 6. Add-on / plan `[Zernio-confirmed, verify before building]`

- Docs state comment automations are available on the **"Usage" plan** (or **AppSumo plans with the Inbox add-on**).
- The current project is on Zernio "Build" / "Free" per CLAUDE.md — **confirm the active plan includes comment-automations + Inbox/messaging before building this feature.** This is a potential blocker.

---

## Verdict on proposed architecture

> "At publish time the user presets a CTA keyword + lead-magnet link + reply text on the scheduled_post. When `zernio-webhook` receives `post.published` with the platform post id, we POST to Zernio's comment-automation endpoint to create the automation for that post with the preset keyword/link/reply."

**Correct in shape.** Required because `platformPostId` only exists post-publish. Adjustments / gotchas:

1. **Only create the automation when Instagram (or Facebook) actually succeeded.** A scheduled post may target IG+YT+TT. Trigger automation creation only for the IG/FB job's success — read the per-platform result from the webhook payload, not the roll-up `post.published`. Also handle `post.partial` (IG could be the failed leg).
2. **You need the native IG media id, not just Zernio's post id.** Confirm `post.published` payload includes the platform post id (`provider_post_id` per your existing `zernio-webhook`). The automation needs that native media ID as `platformPostId`.
3. **Idempotency.** Webhooks can redeliver. Dedup on `scheduled_post_id` + platform so you don't create duplicate automations. Store the returned automation `_id`.
4. **`keywords` is a comma-separated string**, not an array — format accordingly.
5. **Put the lead-magnet link inside `dmMessage`** (use a tracked/UTM redirect URL for analytics, since Zernio has no click webhook).
6. **The 7-day window is generous** — no rush; creating the automation seconds after publish is fine. It lasts as long as the automation is `isActive`.
7. **Confirm plan + endpoint path** (Usage plan + Inbox add-on; `/automations` vs `/comment-automations`) before implementing — these are the two real blockers/uncertainties.

### Recommended integration design

**DB migration (new, e.g. `m18_comment_automations`):**

Add to `public.scheduled_posts` (the preset config, set at schedule time):
- `comment_automation_enabled boolean not null default false`
- `comment_automation_keywords text` — comma-separated, matches Zernio format
- `comment_automation_dm_message text` — includes the lead-magnet link
- `comment_automation_reply text` — optional public reply
- `comment_automation_name text` — optional label

Add tracking columns (populated by the webhook after creation):
- `zernio_automation_id text` — the returned `_id`
- `comment_automation_status text` — e.g. `idle | created | failed`
- `comment_automation_error text`

Optional analytics table `public.comment_automation_events`:
- `id`, `scheduled_post_id (fk)`, `zernio_automation_id`, `event_type` (`comment_received | dm_sent | dm_read`), `commenter_handle`, `comment_text`, `platform_post_id`, `raw jsonb`, `created_at`. RLS owner-of-parent (same pattern as `publish_jobs`).

**Edge function changes:**

1. **`publish-now` (or the create-scheduled-post form):** just persist the preset fields — no Zernio automation call here (no post id yet).
2. **`zernio-webhook`:** on the IG/FB leg of `post.published` / `post.partial` success, if `comment_automation_enabled`, call a new helper / `POST /api/v1/automations` with `{ profileId, accountId, platformPostId: <native IG media id from payload>, name, keywords, dmMessage, commentReply, isActive: true }`. Store `zernio_automation_id`, set status. Idempotent on `(scheduled_post_id, platform)`.
3. **`zernio-webhook` (same handler):** also subscribe Zernio webhook to `comment.received` + `message.sent` / `message.read`; on those events, look up the `scheduled_post` by `platform_post_id` / automation id and insert rows into `comment_automation_events` for conversion tracking + optional push notification ("Alguien comentó tu keyword").
4. **Cleanup:** when a `scheduled_post` is deleted/cancelled, `DELETE /api/v1/automations/{zernio_automation_id}` to avoid orphan automations.

**UI (`/app/admin/publishing/new`):** add a "Lead magnet (comment → DM)" section — toggle, keyword(s), DM message (with link), optional public reply — only shown when Instagram is a target platform.

---

## Sources

- Zernio comment-to-DM product page — https://zernio.com/comment-to-dm
- Zernio full docs (LLM dump, primary schema source) — https://docs.zernio.com/llms-full.txt
- Zernio webhooks catalog — https://docs.zernio.com/webhooks
- Zernio Instagram platform page — https://docs.zernio.com/platforms/instagram
- Zernio docs home / API reference index — https://docs.zernio.com/
- Zernio OpenAPI spec (to confirm exact path + matchMode) — https://docs.zernio.com/api/openapi
- Meta — Instagram Platform, Private Replies — https://developers.facebook.com/docs/instagram-platform/private-replies
- ManyChat / industry corroboration (7-day window, one-per-comment) — https://www.spurnow.com/en/blogs/instagram-dm-automation-rules , https://respond.io/help/instagram/instagram-auto-private-replies

## Open items to verify before building
1. **Exact endpoint path:** `/api/v1/automations` (docs) vs `/api/v1/comment-automations` (marketing) — check OpenAPI.
2. **`matchMode` field name + values** (exact/contains/any) — check OpenAPI.
3. **Plan/add-on:** does the project's current Zernio plan include comment-automations + Inbox? (Potential blocker.)
4. **`post.published` payload:** confirm it carries the native IG media id (not only Zernio's post id) needed for `platformPostId`.
5. **Buttons/links in DM:** whether the create schema accepts structured buttons or only plain-text `dmMessage`.
