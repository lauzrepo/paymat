# Admin Portal Guide

The admin portal is the control center for your organization. Access it at your subdomain (e.g., `yourstudio.cliqpaymat.app`).

---

## Dashboard

The Dashboard gives you a snapshot of your organization:

- Total active members
- Active enrollments
- Outstanding invoice totals
- Recent payment activity

---

## Contacts

Contacts represent individual members, students, or clients.

### Adding a Contact

1. Go to **Contacts** and click **New Contact**
2. Fill in: First name, Last name, Email (required), Phone, Date of birth, Notes
3. Optionally assign the contact to a **Family**
4. Click **Save**

The contact receives an invitation email with portal access credentials.

### Contact Status

Contacts can be **Active** or **Inactive**. Deactivating a contact suspends their portal access and pauses billing. You can reactivate from the contact detail page.

### Saving a Payment Method

From the contact detail page, click **Add Card**. This opens a Stripe-hosted card entry form. The saved card becomes the default for automatic billing.

### Permanent Deletion

Use **Delete Permanently** (on the contact detail page) to fully remove a contact and all associated records. This action is irreversible — use with caution.

---

## Families

Families group related contacts (e.g., siblings) under a single billing account.

### Creating a Family

1. Go to **Families** and click **New Family**
2. Enter a family name and a billing email address
3. Add existing contacts to the family

### Family Billing

When members of a family are enrolled in programs, their invoices can be consolidated and sent to the family's billing email. The family can have its own saved payment method that applies to all members.

---

## Programs

Programs define the services or classes you offer.

### Creating a Program

1. Go to **Programs** and click **New Program**
2. Fill in:
   - **Name** — descriptive name members will see
   - **Description** (optional) — details about the class
   - **Price** — amount in your local currency
   - **Billing frequency** — `weekly`, `monthly`, `yearly`, or `one_time`
   - **Capacity** (optional) — enrollment cap; leave blank for unlimited
   - **Max billing cycles** (optional) — for fixed-term programs (e.g., a 12-week course); leave blank for ongoing
   - **Max classes** (optional, class booking only) — sets the session credit budget for a class pack (e.g. `12` for a 12-class pack); leave blank for unlimited bookings
   - **Allow self-enrollment** (class booking only) — when enabled, members can join this program and book sessions directly from their portal without admin intervention

### Editing a Program

Changes to price or frequency apply to **future invoices only** — existing invoices are not retroactively changed.

### Deactivating a Program

Deactivating a program prevents new enrollments but does not cancel existing ones. Existing enrollments continue billing until manually paused or ended.

---

## Enrollments

Enrollments link a contact to a program and drive the billing schedule.

### Creating an Enrollment

1. Go to **Enrollments** and click **New Enrollment**
2. Select the **Contact** (or Family member)
3. Select the **Program**
4. Set the **Start date** — billing begins on this date
5. Click **Enroll**

Paymat sets `nextBillingDate` to the start date. On that day, the first invoice generates and the date advances by one billing cycle.

### Enrollment Statuses

| Status | Description |
|--------|-------------|
| `active` | Currently enrolled; billing runs on schedule |
| `paused` | Enrollment suspended; billing is on hold |
| `ended` | Enrollment is complete (max cycles reached or manually ended) |

### Pausing an Enrollment

Click **Pause** on the enrollment. Billing stops until you click **Resume**. The `nextBillingDate` is recalculated from the resume date.

### Ending an Enrollment

Click **Unenroll** to end the enrollment. No further invoices will be generated. Existing invoices remain intact.

---

## Invoices

Invoices are generated automatically by the billing engine, but you can also create and manage them manually.

### Invoice Statuses

| Status | Description |
|--------|-------------|
| `draft` | Created but not yet sent |
| `sent` | Sent to the member |
| `paid` | Fully paid |
| `overdue` | Past due date and unpaid |
| `void` | Cancelled; no longer collectible |

### Viewing Invoices

The **Invoices** page lists all invoices with filters for status, date range, and contact. Click any invoice to view the full detail including line items and payment history.

### Creating an Invoice Manually

1. Go to **Invoices** and click **New Invoice**
2. Select a **Contact** or **Family**
3. Add line items with description, quantity, and unit price
4. Set a **Due date**
5. Click **Create Invoice**

### Marking an Invoice as Paid

For cash or offline payments, open the invoice and click **Mark as Paid**. Enter the payment date and any notes.

### Voiding an Invoice

To cancel an invoice, click **Void Invoice**. Voided invoices are removed from the outstanding balance but remain in the audit trail.

---

## Payments

The **Payments** page shows all payment records across your organization.

### Viewing Payments

Filter by date range, contact, or status. Each payment record shows:

- Amount
- Payment method (card, bank, manual)
- Date and time
- Linked invoice
- Stripe charge ID (for online payments)

### Refunding a Payment

1. Open the payment detail
2. Click **Refund**
3. Enter the refund amount (partial refunds supported)
4. Confirm

Refunds are processed via Stripe and typically appear in the member's account within 5–10 business days.

### Payment Statistics

At the top of the Payments page, you'll see summary stats:
- Total collected (all time)
- Collected this month
- Outstanding balance
- Count of payments

---

## Billing

The **Billing** page manages two things: your Paymat platform subscription and manual billing runs.

### Paymat Subscription Status

Displays whether your subscription is active, past due, trialing, or canceled. Click **Manage Subscription** to open the Stripe Customer Portal where you can update your payment method or cancel.

### Manual Billing Run

Click **Run Billing Now** to trigger an immediate invoice generation pass. This is useful if you want to bill outside the automatic 6 AM UTC daily schedule, or to test that billing is working correctly.

The results show:
- Number of invoices generated
- Any errors (e.g., enrollments with missing data)

### Invoice Statistics

A summary of invoice totals:
- Total invoiced amount
- Amount collected
- Amount outstanding (overdue)
- Draft invoices

---

## Class Booking

Class booking lets personal trainers and studios schedule sessions that members can self-book from their portal. It is an optional feature enabled per organisation by a super admin.

### Enabling Class Booking

A platform super admin must toggle **Class Booking** on from the super admin portal under the organisation's detail page. Once enabled, the session calendar appears in the admin portal and the **My Classes** page appears in the member portal.

### Class Packs vs Unlimited Programs

| Program type | Max classes setting | How booking works |
|---|---|---|
| **Class pack** | Set (e.g. `12`) | Members consume one credit per session; no more bookings once credits run out |
| **Unlimited** | Left blank | Members can book as many sessions as they like while enrolled |

Billing is unchanged — a class pack is typically set to `one_time` billing frequency and generates a single invoice on enrollment.

### Program Detail Page

Click **View** on any program in the Programs list to open the program detail page. This page has two sections:

- **Session calendar** — a weekly view showing all scheduled sessions for that program
- **Session detail / attendance roster** — appears when you click a session event

### Scheduling Sessions

**One-off session:**

1. Click an empty time slot on the calendar (or click **+ New session** above it)
2. Fill in: Date, Time, Duration, Capacity (optional), Location (optional), Notes (optional)
3. Click **Save session**

**Recurring series:**

1. Open the new session form
2. Check **Repeat**
3. Select the days of the week (e.g. Mon / Wed / Fri)
4. Optionally set an **End date** — leave blank to run indefinitely (sessions are materialised 12 weeks ahead automatically)
5. Click **Save session**

Recurring sessions display a repeat icon (↻) on the calendar to distinguish them from one-offs.

### Editing and Cancelling Sessions

Click a session event to open its detail panel, then click **Cancel session**.

For **recurring sessions**, you will be prompted to choose scope:

| Option | Effect |
|---|---|
| **This session only** | Cancels only the selected occurrence |
| **This and all future sessions** | Cancels this occurrence and all future sessions in the series |

For **one-off sessions**, a simple confirmation dialog is shown — no scope prompt.

Cancelled sessions appear with a strikethrough on the calendar and cannot be booked.

### Attendance Roster

Clicking a session event also loads the **Attendance** panel below the calendar. It shows:

- Member name and email
- Time of booking
- Booking status (confirmed / cancelled)

You can cancel any individual booking from this table by clicking the **×** button next to the member's name.

### Session Capacity

Set a **Capacity** on a session to limit how many members can book it. Once full, the session is closed to new bookings. Members see a colour-coded availability indicator:

| Colour | Meaning |
|---|---|
| Green | Under 50% booked |
| Yellow | 50–99% booked |
| Red | Full |

### Mate and Class Booking

When class booking is enabled, Mate gains additional session tools:

- **"List upcoming sessions for the Yoga program"** — see all scheduled slots
- **"Create a session for Pilates on Friday at 9 AM, 60 minutes, capacity 8"**
- **"Create a recurring session every Monday and Wednesday at 7 PM for Personal Training"**
- **"Show the roster for the 6 AM session on June 10"**
- **"Cancel all future sessions in the Tuesday kickboxing series"**

---

## Mate — AI Assistant

Mate is your AI assistant, accessible from the **Mate** page in the sidebar.

### What Mate Can Do

**Answer questions about your data:**
- "How much revenue have we collected this month?"
- "Show me all overdue invoices"
- "Find contact Sarah Lee"
- "What programs is John Smith enrolled in?"
- "What's the outstanding balance for the Lau family?"

**Take billing actions:**
- "Create an invoice for Jane Park, $95 due June 1"
- "Send invoice INV-00042"
- "Record a $150 cash payment against INV-00031"
- "Void invoice INV-00018"
- "Enroll Tom Chen in the Monday Jiu-Jitsu program"
- "Create a new contact: Alice Wong, alice@email.com"

### How to Use It

Type your question or request in the chat box and press **Enter** (or **Shift+Enter** for a new line). Mate will query your live data and respond. For actions that modify data (creating invoices, recording payments, voiding), Mate will confirm what it's about to do before proceeding.

### Suggestions

When you open Mate with no prior messages, a set of quick-start suggestions appears. Click any to populate the input box.

**If class booking is enabled, Mate can also:**
- List and create sessions and recurring series
- Show attendance rosters
- Cancel sessions (one or all future)

### What Mate Cannot Do

- Access data from other organizations
- Process card payments (use the member portal for that)
- Actions requiring super-admin access
- Session tools when class booking is disabled for the org

---

## Feedback

The **Feedback** page shows support tickets and feedback submitted by your members through their portal. Each submission includes:

- Member name and email
- Feedback type (general, billing question, issue, etc.)
- Subject and message
- Submission date

You can mark submissions as **Resolved** once addressed.

---

## Settings

The **Settings** page controls your organization's profile and branding.

### Organization Details

- **Name** — displayed in the member portal and on invoices
- **Timezone** — used for billing date calculations
- **Logo** — upload a logo (PNG or JPG recommended); appears in the member portal header

### Stripe Connect

Shows the status of your Stripe Connect account. If not yet connected, a button is shown to begin the Stripe Express onboarding flow.

### Team Members

Invite staff members to have admin or staff access. Staff can view and manage contacts, enrollments, and invoices but cannot access billing or organization settings.

---

## Roles & Permissions

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all features |
| `staff` | Contacts, families, programs, enrollments, invoices, payments |
| `client` | Member portal only (read their own data, pay invoices) |

---

## Audit Log

All significant actions in the admin portal are recorded. Contact support if you need to review activity logs for compliance or investigation purposes.
