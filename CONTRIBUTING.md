# Contributing

This repository holds the OBLIQ-in workspace for CA firms: client records, engagements, evidence, reviews, and the audit trail. Changes here touch client financial data, so review is strict about workspace isolation and audit coverage.

## Setup

Node.js 22.18 or newer.

```sh
npm ci
npm run dev -- -p 4173
```

## Before you start

- Find or open an issue and comment that you are taking it. Wait for confirmation on large changes.
- Use synthetic data only. Do not commit real client names, PAN, GSTIN, account numbers, or documents.

## Branches and commits

- Branch from `main` with a prefix: `feat/`, `fix/`, `docs/`, `test/`, `chore/`. Do not open a PR from a fork's `main`.
- Use [Conventional Commits](https://www.conventionalcommits.org/), for example `feat: add engagement list`.
- Do not use `[skip ci]`.

## Pull requests

1. Run `npm run check`. It runs Prettier, ESLint, TypeScript, tests, and the build, as CI does.
2. Open the PR against `main` using the matching template:

   | Change                                   | Template      |
   | ---------------------------------------- | ------------- |
   | New behaviour or screen                  | `feature.md`  |
   | Defect fix                               | `bugfix.md`   |
   | API, database, storage, workspace access | `backend.md`  |
   | Authentication, headers, secrets         | `security.md` |
   | Documentation only                       | `docs.md`     |
   | Tests, fixtures, CI, dependencies        | `tests.md`    |

   Add `?template=<file>` to the PR URL to select one.

3. Complete every section. PRs without a description are returned.
4. Keep each PR to one purpose. If it builds on another PR, state `Depends on #N` and open it as a draft until that one merges.

## Labels

Each PR carries a type, an area, and a priority. Path and branch rules set some automatically; set the rest before requesting review.

| Group    | Labels                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Type     | `bug`, `enhancement`, `documentation`, `type:epic`                                                                                   |
| Area     | `v1-workspace`, `v1-evidence`, `v1-spreadsheet`, `v1-client-share`, `v1-security`, `v1-api`, `v1-frontend`, `v1-storage`, `v1-pilot` |
| Priority | `P0` blocks pilot or security, `P1` required for v1, `P2` useful but can wait, `P3` later                                            |
| Status   | `needs-ca-review`, `blocked`, `help wanted`, `good first issue`                                                                      |

Use `needs-ca-review` when wording or behaviour needs sign-off from a practising CA.

## Review

- Respond to each comment or mark it resolved.
- Add fixes as new commits during review; PRs are squash-merged.
- PRs that touch client records, documents, sharing, or authentication are checked for workspace isolation, role checks, and audit events before merge.
