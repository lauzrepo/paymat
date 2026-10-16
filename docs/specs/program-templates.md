# Spec: Industry program templates

**Status:** Draft v3. Decisions 1, 2 and 4 confirmed; decision 3 pending. Nothing built yet.

## Problem

A new organization starts with an empty Programs page. Owners have to invent program names, choose billing frequencies and guess at structure before they can enroll anyone. Schools in the same industry package and price their offerings in a handful of common ways, so we can remove the blank-page problem with starter programs they review and own.

## Goals

- An org owner can go from first login to a reviewed set of starter programs in a few minutes.
- Existing orgs can apply a template later from the Programs page.
- Nothing becomes billable or visible to members until the owner has reviewed it.

## Non-goals (v1)

- Sibling or multi-class discounts, per-family fees (annual registration), late fees. See [Follow-ups](#follow-ups).
- Repeatable charges (belt tests, costumes, recital fees, drop-ins). See [Why repeatable fees are out](#why-repeatable-fees-are-out).
- Live market pricing. Templates are static and curated by us.
- Class schedule templates (Class Booking is a separate feature).

## Research summary

A sample of published fee sheets and pricing guides, mostly individual studios plus vendor blogs. Treat it as a sample, not a national benchmark; prices vary a lot by region.

| Industry | Core programs | Add-ons seen |
|---|---|---|
| Dance | Monthly tuition by weekly class time or count, about $70–$140/mo for 1–2 classes | Registration $25–$60 per dancer, costume $65–$100 per class, recital fee, late fee $10–$25 |
| Martial arts | Kids about $80–$150/mo, adults about $100–$200/mo, drop-in $15–$35 | Belt test $30–$75, uniform $40–$120, enrollment $25–$150, annual dues, camps $150–$400/wk |
| Music | Weekly private lessons: 30 / 45 / 60 min at about $160 / $225 / $285 per month; group classes in 4–8 week sessions | Trial lesson about $45, materials fee about $25 |
| Swim | Group about $140/mo weekly, semi-private about $300–$450/mo, private about $150–$350/mo | Annual service fee $35–$60 per family |
| Gymnastics | Preschool about $55–$65/mo, recreational about $52–$137/mo by class length, team track about $130/mo | Annual registration $40–$75 per family |
| Personal training | 12-session packs at about $23–$48/session 1-on-1, small group about $8–$25 per person per session | Packs map directly to `maxClasses` |

Cross-cutting: flat monthly tuition is the norm; one-time and annual fees are common; sibling discounts of 10–25% appear almost everywhere.

Sources: [dance fee sheets](https://app.enrollio.ai/v2/preview/Z92Y8ObdsCLyZiEGSZMK) · [martial arts pricing guide](https://www.classcardapp.com/blog/the-ultimate-guide-to-martial-arts-school-pricing-in-2026) · [music lesson pricing](https://www.ensembleschools.com/middle-c-music/general/music-lesson-pricing-in-dc/) · [swim lesson pricing](https://www.classcardapp.com/blog/how-to-price-swim-lessons-complete-guide-for-swim-schools) · [personal training packages](https://livestrong.com/article/400804-the-cost-of-a-personal-trainer) · [gymnastics club pricing](https://trussville.org/schedule-and-pricing/)

## What the code constrains

Findings from reading the codebase that shape the design:

1. **Billing frequencies** are `monthly | weekly | yearly | one_time` (`utils/billing.ts`). `one_time` has no next billing date.
2. **Enrollment is unique per `(contactId, programId)`** (`enrollmentService.enroll`). A contact can be enrolled in a given program once; re-enrolling reactivates the old row.
3. **Programs have `maxClasses`** (class packs) and **`maxBillingCycles`** (auto-cancel after N cycles), plus `capacity`, `allowSelfEnrollment`, `isActive`. Enrolling in an inactive program fails.
4. **`createProgram` only reads `name, description, price, billingFrequency, capacity`** from the request, so `maxClasses`, `maxBillingCycles` and `allowSelfEnrollment` cannot be set at creation today (Mate's create tool can set `maxBillingCycles`).
5. **`Organization.type` already exists** (`general | studio | gym | school | clinic | other`, super-admin editable). It is too coarse (dance and martial arts are both "studio").
6. **The onboarding page is unauthenticated.** An owner is invited by super admin (`InviteToken`: email, recipient name, org name) and redeems it at `/onboarding` with a slug and password, which creates the org and admin. They are not logged in at that point, so a program-picker cannot live on that page.
7. **Program routes** are admin/staff scoped (`routes/programs.ts`, create/update/delete admin-only); new routes must be registered before `/:id`.

### Why repeatable fees are out

Because enrollment is unique per contact and program, a "Belt test" or "Costume" program could only ever be charged to a student once. Those charges recur (multiple tests per year, a costume per class, a recital each season, drop-ins). They belong as invoice line items, not programs. So v1 templates include only:

- recurring programs (tuition, memberships, private lessons),
- class packs (`one_time` + `maxClasses`),
- fees that are genuinely once per student (registration/enrollment, uniform, trial lesson).

Repeatable charges move to a follow-up ("quick-add charges" catalog on invoices). Per-family fees (swim annual fee, gymnastics registration) are also excluded until fees can attach to a family; billing them per member would overcharge multi-child families.

## Design

### Principles

1. **Prefilled, editable, inactive.** Templates prefill name, description, frequency, class count and a suggested price. The owner can edit any of it in the picker, but doesn't have to: one less thing to do during setup. The safety net is principle 2, not a required price entry.
2. **Drafts by default.** Template programs are created `isActive: false`, `allowSelfEnrollment: false`. They appear in the Programs list as Inactive and can't be enrolled in or billed until the owner reviews the price and activates them.
3. **Static, reviewable config** in the repo, not the database.

### Data model

Add a separate, finer-grained field and leave `type` alone:

```prisma
model Organization {
  // ...
  industry String? // 'dance' | 'martial_arts' | 'music' | 'swim' | 'gymnastics' | 'personal_training' | 'other'
}

model InviteToken {
  // ...
  industry String? // optional, preselected by super admin when inviting
}
```

- Migration: two additive nullable `TEXT` columns, no backfill.
- `industry` is validated against the known list on write.
- Setting it: super admin on invite and org edit; the owner on the onboarding form (select, optional, prefilled from the invite) and in Settings.

### Template config

`backend/src/config/programTemplates.ts`:

```ts
export interface TemplateProgram {
  key: string;                       // stable id, e.g. 'kids_monthly'
  name: string;
  description: string;
  billingFrequency: 'monthly' | 'weekly' | 'yearly' | 'one_time';
  suggestedPrice: number;            // prefilled default, editable
  priceRange: [number, number];      // shown as helper text beside the price field
  maxClasses?: number;               // class packs
  maxBillingCycles?: number;         // fixed-length sessions
  kind: 'recurring' | 'pack' | 'fee';
  defaultSelected: boolean;          // pre-checked in the picker
}

export interface IndustryTemplate {
  industry: string;
  label: string;
  programs: TemplateProgram[];
}
```

### v1 template content

Suggested prices are rounded midpoints of the research sample, prefilled as the default value. `*` = pre-selected.

| Industry | Programs (frequency, suggested price, range) |
|---|---|
| **Dance** | Weekly class, 1 hr* (monthly, $75, $60–$100) · Weekly classes, 2 hrs* (monthly, $139, $110–$160) · Unlimited classes (monthly, $189, $150–$220) · Private lesson, 30 min weekly (monthly, $120, $100–$150) · Registration fee* (one_time, $40, $25–$60) |
| **Martial arts** | Kids membership* (monthly, $120, $80–$150) · Adult membership* (monthly, $150, $100–$200) · 10-class pass (one_time, `maxClasses` 10, $200, $150–$300) · Private lesson pack, 5 (one_time, `maxClasses` 5, $400, $300–$700) · Enrollment fee* (one_time, $60, $25–$150) · Uniform (one_time, $60, $40–$120) |
| **Music** | Private lesson, 30 min weekly* (monthly, $160, $120–$250) · Private lesson, 45 min weekly (monthly, $225, $180–$330) · Private lesson, 60 min weekly* (monthly, $285, $200–$450) · Group class, 6 weeks (one_time, `maxClasses` 6, $180, $150–$210) · Trial lesson (one_time, `maxClasses` 1, $45, $25–$50) |
| **Swim** | Group lessons, weekly* (monthly, $140, $90–$160) · Semi-private, weekly (monthly, $300, $250–$450) · Private, weekly (monthly, $200, $150–$350) |
| **Gymnastics** | Preschool class, 45 min* (monthly, $64, $45–$140) · Recreational class, 1 hr* (monthly, $90, $52–$137) · Team track* (monthly, $130, $100–$200) |
| **Personal training** | 12-session pack, 1-on-1* (one_time, `maxClasses` 12, $420, $275–$575) · 12-session pack, small group* (one_time, `maxClasses` 12, $240, $100–$300) · 12-session pack, partner (one_time, `maxClasses` 12, $336, $150–$336) |
| **Other** | Monthly membership* (monthly, $100, $25–$250) · 10-class pass (one_time, `maxClasses` 10, $150, $50–$300) · Registration fee (one_time, $25, $0–$60) |

Notes:
- Dance tuition is often averaged over a ~10-month season; v1 leaves `maxBillingCycles` unset so enrollment continues until cancelled. Session-based group classes use a class-count pack instead of billing cycles.
- `maxClasses` only has meaning when Class Booking is enabled for the org.

### API

Registered on the existing programs router (admin only), before `/:id`:

| Endpoint | Purpose |
|---|---|
| `GET /api/programs/templates` | Returns the template for the org's `industry`; if unset, all industries (so the owner can choose). |
| `POST /api/programs/templates/apply` | Body: `{ industry, programs: [{ key, price, name?, description? }] }`. Creates the selected programs. |

`apply` rules:
- `price` is optional per selected program and defaults to the template's `suggestedPrice`; if provided it must be greater than 0.
- Programs are created `isActive: false`, `allowSelfEnrollment: false`, scoped to `req.organization.id`; unknown keys are a 400.
- A program whose name already exists in the org is skipped and returned under `skipped`, so re-running is safe.
- `maxClasses` is applied only when `organization.classBookingEnabled` is true. Otherwise the program is created without it and the response flags `classBookingOff: true` so the UI can explain.
- Sets `organization.industry` if it was unset.
- Writes one `AuditLog` row (`PROGRAM_TEMPLATE_APPLIED`) with the created program ids.
- Runs in one transaction.

Also: extend `programService.createProgram` and `programController.createProgram` to accept `maxClasses`, `maxBillingCycles` and `allowSelfEnrollment`. This fixes the existing gap independently of templates.

### UI

**Onboarding form (`/onboarding`, unauthenticated):** add an optional "Business type" select, prefilled from `InviteToken.industry`, sent with the redeem request and stored as `Organization.industry`. No program picking here.

**First login:** when an org has zero programs, show a "Get started" card on the Dashboard and on the empty Programs page: "Start from a template" (primary) and "Start from scratch". The card disappears once the org has any program.

**Template picker (modal, shared by both entry points):**
1. If `industry` is unset, choose one first.
2. Programs grouped by kind (Recurring, Packs, Fees). Core items pre-checked.
3. Each row: editable name and an editable price prefilled with the suggested price, with the range as helper text.
4. "Create N programs". Result view lists created and skipped programs and links to the Programs page.
5. Banner after creation: "These programs are inactive. Check the prices and switch on the ones you want."

**Programs page, existing orgs:** a secondary "Start from a template" button opens the same modal.

**Super admin:** Industry select next to Type on the org create/edit forms and on the invite form.

**Mate:** `apply_program_template` tool (industry, keys, optional price overrides). It is a mutation, so Mate should confirm which programs to create first, and it writes an `ASSISTANT_APPLY_PROGRAM_TEMPLATE` audit entry, matching the existing pattern.

### Edge cases

- Industry changes later: nothing is changed automatically; applying again only adds programs not already present by name.
- Class Booking off: class packs still create, without `maxClasses`; the picker notes it.
- Duplicate names: skipped, never overwritten.
- Multi-tenancy: every write scoped by `organizationId`; templates are global read-only config.
- Concurrent apply: no unique constraint on program name, so two simultaneous calls could duplicate; acceptable for v1 (single admin action), noted.

## Phases (one PR each)

1. **Program create gap + `industry` columns:** `createProgram` accepts the missing fields; migration for `industry`; validation and super-admin fields. Small, shippable alone.
2. **Templates backend:** config, `GET`/`apply`, tests.
3. **Admin UI:** picker modal, empty-state card, Programs page button, onboarding select.
4. **Mate tool.**

## Testing

- Config: unique keys per industry, positive suggested prices, valid frequencies, `kind` consistent with fields (`pack` has `maxClasses`; `fee` is `one_time`).
- `apply`: creates inactive non-self-enrollable programs; defaults price to the suggested price when omitted, rejects a non-positive price and unknown keys; skips duplicate names; drops `maxClasses` when class booking is off; sets `industry` only when unset; transactional (all or nothing); writes the audit entry.
- Integration: admin allowed, staff and client rejected, cross-tenant isolation.
- Admin UI: picker component test. The admin Vitest suite currently fails on `main` and must be repaired before it can gate this.

## Decisions

1. **Prices are prefilled and editable, not required to confirm.** Created programs stay inactive, so nothing is billable until the owner activates them. *Confirmed.*
2. **Templates live in the repo.** *Confirmed.*
3. **v1 industries:** dance, martial arts, music, swim, gymnastics, personal training, other. Tutoring and yoga/pilates can follow once there is research for them. *Pending.*
4. **Picker runs at first login, not on the unauthenticated onboarding page.** Only the business-type select is added there. *Confirmed.*

## Follow-ups

- **Discounts:** sibling and multi-class discounts of 10–25% are near-universal. Likely family-level, building on guardian/dependent roles.
- **Per-family fees:** annual registration is usually per family; programs and enrollments attach to a contact.
- **Quick-add charges:** a per-industry catalog of repeatable charges (belt tests, costumes, recital, drop-ins) that adds invoice line items.
- **Late fees:** a $10–$25 late fee appears in most dance and gymnastics fee sheets.
