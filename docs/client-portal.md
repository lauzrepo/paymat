# Client Portal Guide

The client portal is where your members (students, parents, clients) manage their account, view invoices, and pay online. Every member of your organization automatically gets access.

---

## Accessing the Portal

Members receive an email invitation when they are added by your admin. The invitation contains a link to set up their password and log into the portal.

The portal URL follows the pattern:
```
https://portal.cliqpaymat.app
```
or your organization's custom subdomain if configured.

---

## Home (Dashboard)

The home page gives members an at-a-glance summary of their account:

- **Active programs** — the classes or services they are currently enrolled in
- **Balance due** — total outstanding amount across all unpaid invoices
- **Recent activity** — latest invoice or payment events

If there's an overdue invoice, a prominent alert appears directing the member to pay.

---

## Enrollments

The **Enrollments** page shows all programs the member is currently or was previously enrolled in.

For each enrollment the member can see:
- Program name and description
- Billing amount and frequency
- Enrollment start date
- Current status (active, paused, ended)
- Next billing date (for active enrollments)

> Members cannot enroll or unenroll themselves — this is managed by your admin. If a member wants to change their enrollment, they should contact your organization directly.

---

## Invoices

The **Invoices** page lists all invoices associated with the member's account.

### Invoice Statuses

| Status | Meaning |
|--------|---------|
| **Paid** | Invoice has been paid in full |
| **Sent** | Invoice is outstanding and awaiting payment |
| **Overdue** | Invoice is past the due date and unpaid |
| **Draft** | Invoice is being prepared (not yet actionable) |
| **Void** | Invoice has been cancelled |

### Viewing an Invoice

Click any invoice in the list to open the detail view. The invoice shows:
- Invoice number (e.g., INV-00042)
- Issue date and due date
- Line items (program name, quantity, unit price, total)
- Any payments already applied
- Amount remaining

### Paying an Invoice Online

1. Open the invoice detail
2. Click **Pay Now**
3. Enter your card details in the secure Stripe payment form
4. Click **Pay**

Payment is processed immediately. You'll see a confirmation and the invoice status changes to **Paid**.

### Downloading an Invoice

From the invoice detail, click **Download PDF** to save a copy for your records.

---

## Payments

The **Payments** page is a history of all charges made to the member's account.

Each entry shows:
- Date and time
- Amount paid
- Payment method (e.g., Visa ending in 4242)
- Linked invoice number
- Status (succeeded, refunded, etc.)

---

## Account

The **Account** page lets members manage their profile and payment method.

### Profile Information

Members can update:
- First and last name
- Email address
- Phone number

> Changing the email address updates the login credentials for the portal.

### Saved Payment Method

Members can add, view, or replace their default card:

1. Click **Add Card** or **Update Card**
2. Enter card details in the Stripe-hosted secure form
3. Click **Save**

Once a card is saved, it will be automatically charged on the next billing cycle — no action required from the member.

To remove a saved card, click **Remove Card**. If no card is saved, Paymat will send an invoice by email and the member must pay manually through the portal.

---

## Feedback

Members can submit questions, billing inquiries, or issues directly from the portal.

1. Go to **Feedback**
2. Select a **Type** (General question, Billing issue, Technical problem, Other)
3. Enter a **Subject** and **Message**
4. Click **Submit**

Your admin receives a notification and can respond by email or mark the ticket as resolved.

---

## Family Accounts

If the member is part of a family group, the portal may show invoices and enrollments for all family members under a shared view. This makes it easy for a parent to manage and pay for multiple children from one account.

---

## Logging Out

Click your name or avatar in the top corner and select **Sign Out**. Your session is securely ended.

If you forget your password, use the **Forgot password** link on the login page to receive a reset email.

---

## Common Questions

**Q: Why can't I see my invoice?**
Invoices are generated on the billing date. If your billing date hasn't arrived yet, no invoice exists yet. Contact your studio admin if you believe there's an error.

**Q: My card was declined — what do I do?**
You'll receive an email notification when a payment fails. Log into the portal, update your card on the **Account** page, then open the overdue invoice and click **Pay Now**.

**Q: Can I get a refund?**
Refund requests are handled by your organization's admin. Submit a **Feedback** ticket through the portal with your refund request, or contact your studio directly.

**Q: How do I cancel my enrollment?**
Enrollment changes are managed by your organization. Please contact them directly to pause or end an enrollment.
