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
