# Getting Started with Paymat

Paymat is a recurring billing and member management platform built for activity-based businesses — martial arts studios, swim schools, gymnastics gyms, dance studios, and similar organizations.

## What Paymat Does

- **Automates billing** — invoices generate and send on a schedule you define; no manual work
- **Gives members a portal** — each member gets a private, branded portal to view invoices and pay online
- **Pays you directly** — payments land in your bank account via Stripe Connect; Paymat takes a small platform fee

---

## Prerequisites

Before you can accept payments, you need:

1. A Paymat account (invite-only during early access — join the waitlist at [cliqpaymat.app](https://cliqpaymat.app))
2. A Stripe account (free to create at [stripe.com](https://stripe.com))

---

## First-Time Setup (Onboarding Flow)

When you log in for the first time, Paymat walks you through a short onboarding sequence:

### Step 1 — Connect Stripe

Go to **Settings → Stripe Connect** and click **Connect Stripe Account**. This opens a Stripe Express onboarding flow where you enter your business and banking details. Once complete, your Stripe account is linked and payments will flow directly to you.

> You must complete Stripe Connect before any payments can be processed. Invoices will still generate without it, but members won't be able to pay online until it's connected.

### Step 2 — Create Your Programs

Go to **Programs** and click **New Program**. For each class or service you offer, create a program with:

- **Name** — e.g., "Monday/Wednesday Jiu-Jitsu", "Competitive Swimming"
- **Price** — the amount to bill per cycle
- **Billing frequency** — Weekly, Monthly, Yearly, or One-time
- **Max billing cycles** (optional) — leave blank for ongoing; set a number for term-based enrollments
- **Capacity** (optional) — max number of enrollments

### Step 3 — Add Members

Go to **Contacts** and click **New Contact**. Enter the member's name, email, and optionally phone number and date of birth.

For families, go to **Families**, create the family, then add contacts to it. Families can share a single billing email and payment method.

### Step 4 — Enroll Members

Go to **Enrollments** and click **New Enrollment**. Select a contact and a program. Set the start date — billing begins on this date and repeats based on the program's billing frequency.

### Step 5 — Members Join Their Portal

Each member receives an invitation email with a link to their private portal. From there they can:

- View their active enrollments
- See all invoices (paid, outstanding, overdue)
- Pay invoices online with a card
- Save a default payment method for automatic future charges

---

## The Billing Cycle

Once enrollments are set up, billing is fully automatic:

1. Every day at 6:00 AM UTC, Paymat checks for enrollments due for billing
2. Invoices are generated for any enrollment where the `nextBillingDate` has arrived
3. If the member has a saved card, it is charged automatically
4. The member receives an email notification (paid or failed)
5. The next billing date advances by one cycle

You can also trigger a manual billing run at any time from the **Billing** page.

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Contact** | An individual member or student |
| **Family** | A group of contacts sharing a billing account |
| **Program** | A class or service with a price and billing frequency |
| **Enrollment** | A contact enrolled in a specific program |
| **Invoice** | A billing document generated per enrollment cycle |
| **Payment** | A recorded charge against an invoice |

---

## Next Steps

- [Admin Portal Guide](./admin-guide.md) — detailed reference for every admin feature
- [Client Portal Guide](./client-portal.md) — what your members see and can do
- [Billing & Payments Guide](./billing-and-payments.md) — deep dive into invoices, payments, and Stripe

---

## Getting Help

Email **hello@cliqpaymat.app** with questions or feedback. You can also submit feedback directly from the **Feedback** page inside your admin portal.
