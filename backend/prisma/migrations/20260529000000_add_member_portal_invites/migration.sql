CREATE TABLE "member_portal_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_portal_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_portal_invites_token_key" ON "member_portal_invites"("token");
CREATE INDEX "member_portal_invites_token_idx" ON "member_portal_invites"("token");

ALTER TABLE "member_portal_invites" ADD CONSTRAINT "member_portal_invites_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
