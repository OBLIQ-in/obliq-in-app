# Firm invitations — issue #12 draft slice

This backend slice builds on PR #14. Owners can issue, list, and revoke expiring,
single-use invitations for internal Reviewer/Senior (`reviewer`) or
Article/Preparer (`article_assistant`) membership. The existing stored assistant
value is preserved. It does not define the broader role permission matrix.

## HTTP contract

| Method | Path                        | Input                      | Result                                           |
| ------ | --------------------------- | -------------------------- | ------------------------------------------------ |
| GET    | `/api/firm/invitations`     | none                       | invitation metadata for the current owner's firm |
| POST   | `/api/firm/invitations`     | `{ role, expiresInDays? }` | 201: `{ id, role, expiresAt, code }`             |
| DELETE | `/api/firm/invitations/:id` | none                       | `{ id, revoked: true }`                          |
| POST   | `/api/invitations/redeem`   | `{ code }`                 | `{ firmId, role }`                               |

Expiry defaults to seven days; owners may choose 1–30 days. Only the creation
response exposes the code. Codes contain 256 random bits and are stored as SHA-256
hashes in the existing `firm_invites.code` column. Lists and audit events exclude
codes and hashes. Responses use `Cache-Control: no-store`; mutations reject
cross-origin browser requests. A code is an invitation credential: share it only
with the intended internal colleague. Recipient-bound delivery and email are not
implemented in this slice.

Owner authorization is re-read from the database, not trusted from an incoming
role or stale session. Revocation is scoped to the current firm; another firm's
invitation returns 404. Redemption takes identity from the server and takes the
firm/role from the invitation. Invalid, expired, revoked, or consumed codes return
400 with the same message. Client profiles cannot join an internal firm through
this flow. Users who already have a membership receive 409; this slice does not
introduce multi-firm switching or change an existing role.

Row locks serialize redemption by both user and invitation. Membership,
acceptance, and audit writes commit together. Replaying a successful code for the
same user returns the current membership without another write. A replay cannot
restore removed membership or overwrite a subsequently changed role. Revoking
an invitation does not remove a membership that has already been granted.

## Integration boundaries

PR #14 currently requires membership in `getSession()`. As a result, the redeem
HTTP endpoint cannot yet authenticate a brand-new user without a firm. The
service accepts `{ userId }` and has database tests for this case. Issue #10 must
supply the identity-only session before the endpoint can serve first-time users.
No alternate development authentication bypass is introduced here. Production
remains denied until authentication is integrated.

Issue #11 owns onboarding UI and user/firm creation; issue #13 owns the profile
and invite-management UI. This slice does not mark onboarding complete, create a
firm owner, add a profile route, or replace their UI. Their implementations can
consume these endpoints/service after the session contract lands.

Client Upload User is intentionally not an internal firm membership role here:
its engagement-scoped visibility and link policy require maintainer/product
approval. No client upload access, file storage, OCR, or local passwords are
implemented. Memberships use the internal UUID, independent of auth-provider IDs.
This is partial work toward #12, not a claim that the full issue is complete.

## Migration and verification

Apply `npm run db:migrate`. The follow-up migration adds `reviewer` and invitation
acceptance columns; it preserves existing memberships and revokes unconsumed
legacy codes that predate hashing. It does not rewrite the initial migration.

`npm test` includes input and HTTP-boundary tests. Run the database suite with
`TEST_DATABASE_URL` pointing to a new, empty, disposable PostgreSQL database whose
name ends in `_test`, then `npm run test:db`. It exercises the base-to-follow-up
migration, tenant/owner checks, expiration, revocation, replay, concurrent
redemption, and rollback after an injected audit failure. The suite creates the
schema and must not run against an existing application database. CI provisions
an isolated PostgreSQL service and executes it explicitly.
