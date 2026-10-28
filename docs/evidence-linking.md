# Linking evidence files to working-paper rows

Design for issue #17 (V1-03). It defines how a person links an evidence file (an invoice, an e-way bill, a transport receipt) to one row of a revenue working paper. It is a design note, not code. The tables below are a proposal for when the backend schema (#14) and the spreadsheet schema (#16) are settled.

Items marked **needs CA review** are choices that a CA or domain lead should confirm before they are built.

## The words used here

| Word             | Meaning                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Working paper    | The audit spreadsheet for one engagement. Each sheet has rows, for example one row per sales invoice.                 |
| Row              | One line of a working paper. It is the thing being tested.                                                            |
| Evidence item    | One piece of proof, as a person thinks of it ("the invoice for this sale"). It can be replaced by a corrected upload. |
| Evidence version | One uploaded file belonging to an evidence item. It is never changed after upload.                                    |
| Link             | A recorded statement that "this evidence item supports this row", made by a person.                                   |

## Rules

These follow the acceptance criteria of #17. Each rule is something the system must guarantee, not just a screen.

1. **The filename is never used to match.** It is stored only so people can read it. A file named `scan001.pdf`, or one with the same name as another file, is linked the same way as any other file. Only a person, or a person confirming a suggestion, creates a link.
2. **Every row has a stable internal ID.** The ID is created when the row is first imported and never changes. Bill numbers, job numbers, and the row's position in the spreadsheet can all repeat or move, so none of them is the ID.
3. **One row can have many evidence items.** A sales row normally has an invoice, an e-way bill and a transport receipt.
4. **One evidence item can support many rows, but only by a deliberate action.** For example, one invoice that covers three rows. Nothing may link an item to a second row automatically, for example because the numbers look alike. A person must choose each row, one at a time.
5. **Linking and unlinking are both recorded.** Each creates an audit event in the same step as the change. If the event can't be written, the change doesn't happen.
6. **Linked evidence is visible only to people allowed to see the engagement.** Clients never see links or rows (see "Who can see and change links").

Two more rules keep the data safe:

7. **A link never crosses a firm or an engagement.** The row and the evidence item must belong to the same firm and the same engagement, and the database should enforce this, not only the code.
8. **Nothing is deleted.** Unlinking marks the link as ended. Old versions of a file stay. The history stays complete.

## What is stored

Names follow the style of the backend schema in #14 (uuid IDs, a `firm_id` on every table). New tables, not yet in the schema:

**`working_paper_rows`**

| Column              | Notes                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | uuid. The stable internal ID (rule 2).                                                                                                                           |
| `firm_id`           | Required.                                                                                                                                                        |
| `engagement_id`     | Required.                                                                                                                                                        |
| `working_paper_id`  | Which working paper and sheet the row belongs to.                                                                                                                |
| `source_row_number` | The row's position in the uploaded file, for display only. It can change on a new upload.                                                                        |
| `match_key`         | A text key built from the row's own values, used only to recognise the same row when a corrected spreadsheet is uploaded again. **Needs CA review** (see below). |
| `values`            | The row's data as imported (date, customer, amount and so on). The exact columns come from #16.                                                                  |
| `status`            | `active`, or `removed_in_import` if a later upload no longer has it.                                                                                             |
| `created_at`        |                                                                                                                                                                  |

**`evidence_items`**

| Column                           | Notes                                               |
| -------------------------------- | --------------------------------------------------- |
| `id`, `firm_id`, `engagement_id` | As above.                                           |
| `title`                          | A readable name. It can be edited. It is not a key. |
| `current_version_id`             | The version people see by default.                  |
| `created_at`                     |                                                     |

**`evidence_versions`** (each upload is a new version and is never overwritten)

| Column                                                | Notes                                                   |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `id`, `firm_id`                                       |                                                         |
| `evidence_item_id`                                    |                                                         |
| `version_number`                                      | 1, 2, 3, and so on.                                     |
| `original_filename`                                   | As uploaded. Display only (rule 1).                     |
| `sha256`                                              | A fingerprint of the file. Used to spot repeat uploads. |
| `storage_key`, `mime_type`, `size_bytes`              | The file itself, kept in private storage.               |
| `uploaded_by_user_id` or `uploaded_via_share_link_id` | Who or what uploaded it.                                |
| `scan_status`                                         | `pending`, `clean`, `quarantined`.                      |
| `uploaded_at`                                         |                                                         |

**`row_evidence_links`**

| Column                                                | Notes                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `id`                                                  | uuid.                                                      |
| `firm_id`, `engagement_id`                            | Copied from the row and the item, and checked to be equal. |
| `row_id`                                              | The working-paper row.                                     |
| `evidence_item_id`                                    | The evidence item.                                         |
| `linked_by_user_id`, `linked_at`                      | Who linked it, and when.                                   |
| `note`                                                | Optional. Why this evidence supports this row.             |
| `unlinked_by_user_id`, `unlinked_at`, `unlink_reason` | Filled in when the link is ended.                          |

Constraints that make the rules true:

- **Only one active link per pair.** A unique index on (`row_id`, `evidence_item_id`) where `unlinked_at` is empty. Two people linking the same pair at the same moment cannot create two links. Linking the same pair again later (after an unlink) is allowed and creates a new link.
- **Same firm, same engagement.** `firm_id` and `engagement_id` on the link are tied by foreign keys to the same values on the row and on the item, so a link across firms or engagements is rejected by the database itself.
- **No automatic fan-out.** There is no "link to all rows with the same bill number" operation. The link action takes exactly one row and one item.

**`audit_events`** (shared with the rest of the product, and append-only)

| Column                           | Notes                                                             |
| -------------------------------- | ----------------------------------------------------------------- |
| `id`, `firm_id`, `engagement_id` |                                                                   |
| `actor_user_id`                  | The person who acted.                                             |
| `action`                         | `evidence.linked`, `evidence.unlinked`, `evidence.version_added`. |
| `entity_type`, `entity_id`       | For a link event: `row_evidence_link` and the link's ID.          |
| `details`                        | Row ID, evidence item ID, version ID, the note or reason.         |
| `created_at`                     |                                                                   |

The application's database user must have no permission to update or delete rows in this table. That makes "append-only" a fact about the database, not just a habit of the code.

## What happens

**Linking.** A person with the right role opens a row and chooses an evidence item for it, or opens an evidence item and chooses a row. The system, in one transaction: checks the person's access to the engagement; checks that the row and the item are in the same firm and engagement; adds the link (or returns the existing active link, so repeating the action is harmless); and writes the `evidence.linked` event.

**Linking one item to a second row.** This is the same action done again, with a second row. The screen should make it clear that the item is already linked elsewhere and ask the person to confirm. The system never does it on its own.

**Unlinking.** The link is marked ended with who, when and (see the open questions) a reason. The `evidence.unlinked` event is written in the same transaction. The row and the evidence item are untouched.

**Suggestions.** Later, the product may suggest "this file looks like the invoice for this row" from text read out of the file. That is allowed, but a suggestion is only shown. It becomes a link when a person accepts it, and the event records that a person did it.

**Uploading a corrected file.** The client or the firm adds a new version to the same evidence item. Existing links stay, because they point to the item. People see the current version, and the history shows every version. Reviewers can see which version was current when a row was reviewed (from the audit events).

**Uploading the same file twice.** The fingerprint (`sha256`) matches an existing version in the same engagement. The system tells the person and offers to use the existing item, instead of creating a duplicate.

**Uploading a corrected spreadsheet.** Rows are matched to the existing rows by `match_key`. A matched row keeps its ID, so its links stay. A new row gets a new ID. A row that is missing from the new upload is marked `removed_in_import`, **not deleted**, and its links stay and are shown with a warning.

## Who can see and change links

Roles are those on issue #29: Owner, Reviewer / Senior, Article / Preparer, and Client Upload User.

| Role                                  | See rows and links                                                      | Link and unlink                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Owner                                 | All engagements in the firm                                             | Yes                                                                                            |
| Reviewer / Senior                     | Engagements assigned to them                                            | Yes                                                                                            |
| Article / Preparer                    | Engagements assigned to them                                            | Yes, until a reviewer has signed the row off. After that, ask a reviewer. **Needs CA review.** |
| Client Upload User (via a share link) | Never. Only the files they uploaded and the requests addressed to them. | No.                                                                                            |

Every read and write checks the person's access to the engagement on the server. A client is never given the row data, because a working paper contains other customers and other clients' business.

## Cases to handle

| Case                                                            | What the system does                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Two different files have the same filename                      | They are two items. Linking one never affects the other.                                      |
| The same file arrives with a different filename                 | Same fingerprint, so the system warns about the repeat. It does not link anything on its own. |
| A file has a meaningless name (`scan001.pdf`)                   | No problem. The person links it by choosing the row.                                          |
| One invoice covers several rows                                 | The person links the item to each row, one at a time, with a confirmation each time.          |
| One row needs an invoice, an e-way bill and a transport receipt | Three items, three links to the same row.                                                     |
| Evidence is uploaded before anyone has linked it                | It waits in an "unlinked evidence" list for the engagement. It is visible to the firm only.   |
| A file fails the virus scan                                     | The version is quarantined and can't be opened. Links stay but show "file unavailable".       |
| A client uploads a corrected file after a correction request    | A new version of the same item. Links stay.                                                   |
| Someone tries to link across engagements or firms               | Rejected, by the database as well as the code.                                                |
| The same pair is linked twice at the same time                  | One link is created. The other request gets the existing link.                                |
| A link is made by mistake                                       | Unlink it. A new link can be made later. Both actions stay in the history.                    |

## Example (invented data)

A sales row for invoice `INV/0001/24`, customer "Example Traders Ltd", amount 4,00,000. In an engagement for "Sample Client Pvt Ltd".

1. A client uploads three files: `scan001.pdf`, `scan002.pdf` and `lr copy.pdf`. Three evidence items are created, each with version 1. Nothing is linked yet.
2. A preparer opens the row and links `scan001.pdf` (the invoice), `scan002.pdf` (the e-way bill) and `lr copy.pdf` (the transport receipt). Three links and three `evidence.linked` events are created.
3. The e-way bill turns out to cover a second row, for invoice `INV/0002/24`. The preparer links the same item to that row too and confirms the prompt. One more link and one more event.
4. The client uploads a clearer version of the invoice. The item gets version 2, and the links stay.
5. The preparer realises the e-way bill belongs only to the first row, and unlinks it from the second. The link is ended, and an `evidence.unlinked` event is written. The history still shows that it was linked.

## What the backend must provide

Proposed endpoints. Each checks access first and returns the existing result when repeated.

- `POST /api/engagements/{engagementId}/rows/{rowId}/evidence-links`, with `evidenceItemId` and an optional `note`.
- `DELETE /api/engagements/{engagementId}/evidence-links/{linkId}`, with a `reason`.
- `GET /api/engagements/{engagementId}/rows/{rowId}/evidence`, the active links with the current version of each item.
- `GET /api/engagements/{engagementId}/evidence/{itemId}/rows`, the rows an item supports.
- `GET /api/engagements/{engagementId}/evidence/unlinked`, evidence not linked to any row.

## Tests to write when this is built

- Linking with a wrong firm or wrong engagement is rejected.
- Linking the same pair twice (also at the same time) leaves one active link.
- Linking and unlinking each write exactly one audit event, and the change fails if the event can't be written.
- The application database user can't update or delete audit events.
- Files with the same name never affect each other. Files with different names can be linked to the same row.
- A client share link can't read rows, links or other clients' files.
- Re-importing a spreadsheet keeps the IDs and links of matched rows, and marks missing rows `removed_in_import`.
- A new version keeps the existing links.

## Open questions for the CA or domain lead (needs CA review)

1. **What identifies the same row in a corrected spreadsheet?** The bill number alone may repeat (credit notes, several lines under one bill). A combination such as bill number, date, customer and amount may be safer. This needs the real sheet from #16.
2. **Does one evidence item really cover several rows in practice** (for example one invoice for several lines), or is it always one invoice per row? The design supports both, so this only changes how prominent the "link to another row" action is.
3. **Should unlinking require a reason**, or only linking a second row?
4. **After a reviewer signs a row off, can a preparer still change its links?** The table above assumes not.
5. **How long are ended links and old versions kept?** This is a retention and legal question.
6. **Is a "note" on a link enough**, or does a CA want a fixed result such as "agreed", "difference" or "not applicable" on each link? That would be a separate feature.

## How this meets the acceptance criteria of #17

| Criterion                                                  | Where                                                |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Filename is never the primary matching key                 | Rule 1, "Cases to handle"                            |
| Each row has a stable internal ID                          | Rule 2, `working_paper_rows.id`, re-import behaviour |
| One row supports multiple evidence files                   | Rule 3, `row_evidence_links`                         |
| One file can link to multiple rows only by explicit action | Rule 4, no fan-out constraint, confirmation prompt   |
| Linking and unlinking create an audit event                | Rule 5, `audit_events`, same transaction             |
| Linked evidence is visible to permitted reviewers          | Rule 6, "Who can see and change links"               |
