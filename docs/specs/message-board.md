# Spec: Message board + email/SMS notifications

**Status:** Draft v2. All four [decisions](#decisions) confirmed. Nothing built yet.

## Problem

Org owners currently talk to members outside Paymat: group texts, Facebook groups, personal email. There's no single place for "class is cancelled tonight" or "registration for spring opens Monday", and no record of who was told what. Paymat already holds the member list, families, programs and enrollments, so it can target messages much better than a group chat.

## Goals

- Admins/staff post announcements to a message board visible in the member portal.
- Each post can be targeted: whole org, one or more programs, or specific contacts/families.
- When publishing, the author can also push the post by **email** and/or **SMS** to the targeted audience.
- Members control their own email/SMS preferences; SMS needs explicit opt-in and honours STOP.
- Admins see a delivery report per post (sent / delivered / failed / skipped and why).

## Non-goals (v1)

- Member-to-member chat or DMs.
- Two-way SMS conversations (inbound texts other than STOP/HELP/START are ignored).
- Rich media in SMS (MMS), push notifications, scheduled posts. See [Follow-ups](#follow-ups).
- Automated notifications from other features (billing reminders already have their own emails).

## What the code already gives us

| Area | Current state | Impact |
|---|---|---|
| Email | `backend/src/services/emailService.ts` uses **Resend** with a single platform `FROM` (`noreply@cliqpaymat.app`), HTML built with template strings | Reuse Resend. Add a broadcast template. **Values are interpolated unescaped** — post bodies are user content and must be HTML-escaped. |
| SMS | Nothing. No Twilio/SMS dependency | New provider, env vars, webhook. |
| Phone numbers | `Contact.phone` is free text, trimmed on CSV import, not validated | Need E.164 normalisation before SMS (`libphonenumber-js`). |
| Background work | No queue; `node-cron` jobs in `server.ts` | Use a DB-backed outbox drained by a cron (see [Delivery pipeline](#delivery-pipeline)). |
| Feature flags | `classBookingEnabled` pattern: org column → `/api/tenant/branding` → frontends hide UI; super admin toggles it | Copy this pattern for `messagingEnabled` / `smsEnabled`. |
| Audiences | `Enrollment` (contact ↔ program, `status`), `Family.billingEmail`, `Contact.email` | Audience resolution is a straight query; no new grouping concept needed. |
| Audit | `AuditLog` table | Log post publish/delete and each notification send. |

## Schema changes

**`organizations`**
- `messaging_enabled boolean DEFAULT false` — board + email notifications
- `sms_enabled boolean DEFAULT false` — SMS on top (separate because it costs money and needs carrier registration)
- `sms_monthly_limit int DEFAULT 500` — hard cap per calendar month, set by super admin
- `mailing_address text?` — postal address for the email footer (CAN-SPAM); editable in admin Settings, required before email notifications can be sent

**`contacts`**
- `email_notifications boolean DEFAULT true`
- `sms_opt_in boolean DEFAULT false`
- `sms_opt_in_at timestamptz?`, `sms_opt_in_source text?` (`portal` | `admin_attested` | `keyword`) — consent record
- `sms_opted_out_at timestamptz?` — set by STOP; blocks SMS until START
- `phone_e164 text?` — normalised copy of `phone`, recomputed on write; null if unparseable
- `notification_token text unique` — opaque token for one-click email unsubscribe

**New `posts`**
```
id, organization_id, author_user_id, title, body (plain text / limited markdown),
audience_type (all | programs | contacts), pinned boolean, published_at?, edited_at?,
deleted_at?, created_at, updated_at
```

**New `post_audience`** — only used when `audience_type != all`
```
id, post_id, program_id?, contact_id?, family_id?
```

**New `post_reads`** — drives the unread badge in the portal
```
post_id, contact_id, read_at   (PK post_id+contact_id)
```

**New `notification_deliveries`** — the outbox and the delivery report in one table
```
id, organization_id, post_id, contact_id, channel (email | sms),
destination (email address / E.164), status (queued | sending | sent | delivered | failed | skipped),
skip_reason? (no_email | no_phone | opted_out | not_opted_in | limit_reached),
provider_message_id?, error?, attempts int DEFAULT 0, next_attempt_at, created_at, updated_at
UNIQUE (post_id, contact_id, channel)   -- makes re-sending idempotent
INDEX (status, next_attempt_at)
```

Skipped recipients are written as `skipped` rows so the report can say "6 not sent: no phone number" instead of silently dropping them.

## Backend

### Services
- **`postService.ts`** — CRUD, publish, list-for-contact (filtered by audience + `deleted_at`), mark read, unread count.
- **`audienceService.ts`** — `resolveAudience(post)` → contacts. `all` = active contacts; `programs` = contacts with an `active` enrollment in any listed program; `contacts` = listed contacts plus members of listed families. De-duplicated. Also `previewAudience()` returning counts per channel (used by the composer before sending).
- **`notificationService.ts`** — `queueForPost(postId, channels[])` writes `notification_deliveries` rows (with skip reasons); `drainOutbox()` sends queued rows in batches; `handleProviderEvent()` updates status from webhooks.
- **`smsService.ts`** — thin Twilio wrapper: `send(toE164, body)`, signature validation, STOP/START/HELP keyword handling.
- **`emailService.ts`** — add `sendPostNotification()` with escaped body, "View in portal" link, org name/logo, and an unsubscribe footer (CAN-SPAM). Set `List-Unsubscribe` header.

### Delivery pipeline
1. The author (admin or staff) publishes with channels `['email','sms']` → `queueForPost` inserts rows in one transaction and returns counts. The HTTP request never calls Resend/Twilio directly.
2. A `node-cron` job every minute calls `drainOutbox()`: claim up to N rows (`UPDATE … SET status='sending' … WHERE status='queued' AND next_attempt_at <= now() … FOR UPDATE SKIP LOCKED RETURNING`), send, mark `sent` or back to `queued` with exponential backoff; `failed` after 5 attempts.
3. Email uses Resend batch send (up to 100/call). SMS goes through a Twilio Messaging Service, which handles throughput queuing.
4. Provider webhooks move rows to `delivered` / `failed`.
5. SMS monthly cap is checked at queue time (`count(sms rows this month) + new > limit` → rows beyond the cap are `skipped: limit_reached` and the composer warns before sending).

`SKIP LOCKED` makes it safe if the API is ever run with more than one instance.

### SMS content
`"{OrgName}: {title} — {first ~100 chars of body} {shortPortalLink} Reply STOP to opt out"`, kept to 2 segments (≤306 GSM-7 chars). The composer shows the rendered SMS and segment count.

### Routes
Admin/staff (behind `resolveTenant` → `authenticateToken` → `requireRole('admin','staff')` → `messagingEnabled` check, 403 if off). Admins and staff have identical access here: anyone who can post can also send email and SMS (decision 4):
- `GET/POST /api/posts`, `GET/PUT/DELETE /api/posts/:id`
- `POST /api/posts/:id/publish` `{ notify: { email: bool, sms: bool } }`
- `POST /api/posts/audience-preview` `{ audienceType, programIds, contactIds, familyIds }` → `{ total, email: {sendable, skipped: {...}}, sms: {...} }`
- `GET /api/posts/:id/deliveries` — report, filterable by status
- `POST /api/posts/:id/deliveries/retry` — re-queue failed rows

Client (`/api/client/...`, `requireRole('client')`, flag check):
- `GET /api/client/posts`, `GET /api/client/posts/unread-count`, `POST /api/client/posts/:id/read`
- `GET/PUT /api/client/notification-preferences` — opting in to SMS requires a valid phone and records `sms_opt_in_at` + source `portal`

Public / webhooks:
- `GET /api/notifications/unsubscribe?token=` (+ `POST` for one-click `List-Unsubscribe-Post`) — sets `email_notifications=false`, renders a confirmation page
- `POST /api/webhooks/twilio/inbound` — STOP/START/HELP; validates `X-Twilio-Signature`
- `POST /api/webhooks/twilio/status` — delivery status callbacks
- `POST /api/webhooks/resend` — bounces/complaints (svix signature); a hard bounce or complaint sets `email_notifications=false`

Super admin: `PATCH /api/super-admin/organizations/:id` accepts `messagingEnabled`, `smsEnabled`, `smsMonthlyLimit`.

### Config (`backend/src/config/environment.ts`)
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `RESEND_WEBHOOK_SECRET`. Make the Twilio vars optional so dev/test boots without them; `smsService` throws a clear error if SMS is used unconfigured.

### Mate
Add `list_posts` and `draft_post` tools (draft only — publishing/sending stays a human click in the UI). Gate on `messagingEnabled` like the class booking tools.

## Admin portal (`admin/`)

- **Sidebar:** "Message Board" entry, hidden when `messagingEnabled` is false.
- **`/messages`** — list of posts (pinned first), status chips (draft / published), delivery summary per post ("42 emailed · 18 texted · 3 failed").
- **Composer** (`/messages/new`, `/messages/:id/edit`): title, body, audience picker (All members / Programs multi-select / Specific contacts & families), pin toggle, and a **Notify** section with Email and SMS checkboxes (SMS disabled with a tooltip when `smsEnabled` is false). Live audience preview from `audience-preview`, rendered SMS preview + segment count, remaining SMS this month. Confirmation dialog before publishing with notifications.
- **`/messages/:id`** — post view + delivery report table (contact, channel, status, reason/error, timestamps), "Retry failed" button.
- **Contact detail page:** "Communication" card showing email/SMS status and consent timestamp. Admin or staff can turn SMS on only by ticking "Member gave consent to receive texts" (stored as `admin_attested`, with the user who attested it in the audit log). Nobody can override a STOP.

## Member portal (`frontend/`)

- **"Announcements"** page and a home-page widget with the latest 3 posts; unread badge in nav. Hidden/redirected when the flag is off (same as My Classes).
- **Account → Notifications:** email toggle, SMS toggle with phone field and consent text ("By checking this box you agree to receive text messages from {Org} via Paymat. Msg & data rates may apply. Reply STOP to opt out, HELP for help.").

## Super admin portal (`superadmin/`)

On Organization detail: toggles for Messaging and SMS, SMS monthly limit input, and this month's SMS count.

## Compliance and abuse

- **US A2P messaging:** sending from a platform number requires either a verified **toll-free number** or **10DLC brand + campaign registration**. Toll-free verification is simpler for a single platform sender and takes days to weeks — start it before the SMS phase starts.
- Opt-in is explicit and recorded; STOP is honoured at the carrier (Twilio Advanced Opt-Out) *and* in our DB.
- Emails include the org's name, a physical address footer (org setting, required by CAN-SPAM) and one-click unsubscribe.
- Quiet hours: SMS rows queued between 9pm and 8am in the org's `timezone` get `next_attempt_at` pushed to 8am local.
- The per-org monthly cap limits cost and spam exposure; only super admins can raise it. Because staff can send texts too, the cap is the main guard against a mistaken or excessive send.
- Every publish that sends notifications writes an `AuditLog` entry (`POST_NOTIFIED`) with the author, channels and recipient counts, so admins can see which staff member sent what.

## Testing

- **Unit** (`backend/tests/unit/services/`): audience resolution (de-dupe, family expansion, inactive enrollments excluded), skip reasons, SMS cap, quiet hours, keyword handling, HTML escaping of post bodies, outbox backoff.
- **Integration** (`backend/tests/integration/`): post CRUD + tenant isolation, flag 403s, publish → rows queued, Twilio/Resend webhook signature rejection, unsubscribe token flow. Mock Resend and Twilio clients.
- **Admin/frontend** (Vitest): composer preview + confirmation, preferences form consent gating, flag-hidden nav.
- **E2E** (Playwright): admin publishes a post → member sees it with an unread badge.

## Phased rollout

| Phase | Scope | Ships independently? |
|---|---|---|
| 1. Board | Schema (posts, audience, reads, org flag), post CRUD, admin list/composer, member Announcements page, super admin toggle | Yes — useful without notifications |
| 2. Email | Contact prefs + unsubscribe token, outbox table + drain cron, Resend broadcast template, delivery report, Resend webhook | Yes |
| 3. SMS | Twilio integration, phone normalisation + backfill script, opt-in UI, STOP/status webhooks, cap + quiet hours, `smsEnabled` flag | Yes, after toll-free verification is approved |
| 4. Polish | Mate tools, retry UI, home widget, docs (`docs/admin-guide.md`, `docs/client-portal.md`) | — |

## Decisions

1. **Members can't reply or comment in v1.** Posts are one-way announcements. Comments would bring in moderation, reply notifications and abuse reporting. Revisit if orgs ask for it.
2. **All orgs share one platform SMS number.** It's a verified toll-free number, and every text starts with the org name. A number per org would give better branding but means per-org registration, cost and onboarding friction.
3. **SMS is included in the subscription up to ~500 texts per org per month** (`sms_monthly_limit`). We'll measure real usage before considering passing costs through (e.g. Stripe metered billing).
4. **Anyone who can post can send email and SMS.** Admins and staff have the same messaging permissions. The monthly cap, the confirmation dialog, the opt-in rules and the audit log are the safeguards.

## Follow-ups

Scheduled posts · post comments · an org setting to restrict SMS sending to admins · attachments/images · push notifications · MMS · per-org SMS numbers · reusing the outbox for billing reminder SMS ("Your invoice is overdue") · two-way SMS inbox.
