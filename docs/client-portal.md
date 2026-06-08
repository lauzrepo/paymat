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

> Members cannot enroll or unenroll themselves from standard programs — this is managed by your admin. Programs with self-enrollment enabled can be joined directly from **My Classes** (see below).

---

## My Classes

> **My Classes** is only visible when your organization has the class booking feature enabled.

The **My Classes** page shows all upcoming sessions across every program you are enrolled in. Use it to book your spot, cancel a booking, and track how many class credits you have left.

### Session Availability

Each session card has a colour strip on the left indicating how full it is:

| Colour | Meaning |
|---|---|
| Green | Under 50% of spots taken |
| Yellow | 50–99% of spots taken |
| Red | Full — no bookings accepted |

The number of spots remaining is also shown in the session card.

### Booking a Session

Click **Join** on any available session. Your spot is confirmed immediately and the session moves to your booked list. If you have a class pack (limited credits), your remaining credit count decreases by one.

### Cancelling a Booking

Click **Cancel** on a session you have already booked. The spot is released and, if you are on a class pack, your credit is returned.

### Class Credits

If you are enrolled in a class pack (a program with a fixed number of classes, such as a "10-class pack"), a **credits remaining** counter appears at the bottom of each session card. Once your credits reach zero, the **Join** button is disabled.

To add more credits you need to enroll in an additional class pack — contact your organization or self-enroll below.

### Joining a New Program (Self-Enrollment)

If your organization has programs open for self-enrollment, an **Explore programs** section appears at the bottom of the My Classes page. Click it to expand the list.

Each program card shows the name, description, price, billing frequency, and class count (for packs). Click **Enroll** to join — an invoice is generated immediately and you are redirected to pay it. Once paid, the program's sessions appear in your upcoming list.

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

**Q: I can't see My Classes — where is it?**
My Classes is only available when your organization has class booking enabled. If you do not see it in the sidebar, your organization has not activated this feature yet.

**Q: I have credits left but the Join button is greyed out.**
The session may be at capacity (fully booked). Check the colour strip and spots-remaining label on the session card. If the session is not full, your credits may be from a different enrollment — credits are scoped to the specific program the session belongs to.

**Q: I cancelled a booking — why didn't my credits come back?**
Credits are returned automatically when you cancel. If the credit count hasn't updated, try refreshing the page. If the issue persists, contact your organization.
