# Team Management

Team management lets admins invite staff and trainers to the admin portal, manage their access, and track pending invitations. Staff members can view and manage contacts, enrollments, invoices, and payments, but cannot access billing settings or organization configuration.

---

## Roles Overview

| Role | Portal | Description |
|------|--------|-------------|
| `admin` | Admin portal | Full access to all features including settings, billing, and team management |
| `staff` | Admin portal | Contacts, families, programs, enrollments, invoices, payments — no settings or billing access |
| `client` | Member portal | Read-only access to their own data; can pay invoices |

Only admins can invite, resend, cancel, or revoke team members.

---

## Accessing Team Settings

1. Go to **Settings** in the sidebar
2. Click the **Team** tab

The Team tab shows two sections:
- **Team Members** — currently active admin and staff accounts
- **Pending Invitations** — sent invites that haven't been accepted yet

---

## Inviting a Staff Member

1. In **Settings → Team**, enter the staff member's email address in the invite field
2. Click **Send Invite**

The staff member receives an email with a link to set up their account. The link is valid until they accept it — there is no expiry, but you can resend or cancel it at any time.

---

## Accepting an Invitation (Staff Member Flow)

When a staff member receives the invite email:

1. They click **Accept Invitation** in the email
2. This opens the `/accept-invite` page in the admin portal
3. Their email is pre-filled and locked
4. They enter their first name, last name, and a new password
5. They click **Create Account**
6. They are redirected to the login page and can sign in immediately

If the link has already been used, the page shows an error and directs them to sign in or reset their password.

---

## Managing Pending Invitations

In **Settings → Team → Pending Invitations**, each pending invite shows the email address and the date it was sent.

### Resending an Invite

Click **Resend** next to a pending invite to send the invitation email again to the same address. Use this if the staff member didn't receive the original email or if it expired from their inbox.

### Cancelling an Invite

Click **Cancel** next to a pending invite to delete it. The invite link in the original email will no longer work. You can send a new invite to the same email if needed.

---

## Revoking Access

To remove a team member's access:

1. In **Settings → Team → Team Members**, find the member
2. Click **Revoke Access**

This soft-deletes the user account — they can no longer sign in, but their activity history is preserved. You cannot revoke your own access.

---

## Member Portal Invites (Contacts)

Separate from staff invites, contacts (clients/members) receive invitations to the **member portal** — a read-only portal where they can view their invoices and make payments.

### Resending a Member Portal Invite

If a contact has an email address but hasn't set up their member portal account yet:

1. Go to the contact's detail page
2. In the **Profile** card, find the **Member portal** row
3. Click **Resend portal invite**

A new invite email is sent to the contact's email address. If the contact already has an active portal account, the row shows **Account active** in green and no button is displayed.

---

## API Reference

All team endpoints are under `/api/team`. Protected routes require a valid admin JWT (`Authorization: Bearer <token>`) and the `x-organization-slug` header.

### Protected endpoints (admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/team` | List active members and pending invites |
| `POST` | `/api/team/invite` | Send a staff invite email |
| `POST` | `/api/team/invite/:id/resend` | Resend a pending invite |
| `DELETE` | `/api/team/invite/:id` | Cancel a pending invite |
| `DELETE` | `/api/team/:userId` | Revoke a member's access (soft delete) |

**`GET /api/team` response:**
```json
{
  "status": "success",
  "data": {
    "members": [
      { "id": "...", "email": "staff@example.com", "firstName": "Jane", "lastName": "Doe", "role": "staff", "createdAt": "..." }
    ],
    "pendingInvites": [
      { "id": "...", "email": "new@example.com", "createdAt": "..." }
    ]
  }
}
```

**`POST /api/team/invite` request body:**
```json
{ "email": "trainer@example.com" }
```

### Public endpoints (no auth required)

These routes are used by the accept-invite page and require no authentication or organization context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/team/invite/:token` | Get invite info (email + org name) for a token |
| `POST` | `/api/team/invite/:token/accept` | Accept invite and create staff account |

**`POST /api/team/invite/:token/accept` request body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "securepassword"
}
```

**Error codes:**
| Code | Meaning |
|------|---------|
| `404` | Token not found |
| `409` | An account for this email already exists |
| `410` | Invite already used — sign in or reset password |

---

## Data Model

```
StaffInvite
  id             UUID (PK)
  token          UUID (unique) — used in the invite URL
  organizationId FK → Organization
  email          String
  invitedBy      String (userId of the admin who sent the invite)
  usedAt         DateTime? — null = pending, set = accepted
  createdAt      DateTime
```

A `StaffInvite` record is created when an invite is sent and updated (`usedAt`) when accepted. Cancelled invites are deleted from the table.

Accepted invites result in a new `User` record with `role: 'staff'` linked to the organization.
