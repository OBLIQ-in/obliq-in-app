<!--
Optional focused templates: add ?template=<file> to the PR URL.
feature.md, bugfix.md, backend.md, security.md, docs.md, tests.md
Delete any section below that does not apply.
-->

## Summary

<!-- What changes, why, and which firm workflow it supports. -->

Closes #
Depends on: #

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Backend (API, database, storage)
- [ ] Security (authentication, access control, headers)
- [ ] Documentation
- [ ] Tests, fixtures, CI, or dependencies

## Testing

<!-- Commands run and steps to verify. Add screenshots for UI changes, including a narrow viewport. For a bug fix, add a regression test. -->

## Backend and data changes

<!-- Delete this section if the PR does not touch the API, schema, or storage. -->

- [ ] Every query is scoped to the workspace
- [ ] Every route checks authentication and the caller's role
- [ ] A test shows one workspace cannot read or modify another's data
- [ ] Changes to client records, documents, reviews, or assignments write an audit event with actor, action, target, and time
- [ ] Input is validated on the server; uploads check type, size, and ownership
- [ ] Migration included and safe on existing data

## Checklist

- [ ] Title follows Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- [ ] One purpose per PR; size is justified if over about 500 lines
- [ ] `npm run check` passes
- [ ] Loading, empty, and error states handled for UI changes
- [ ] Tests added or updated
- [ ] `docs/lld.md` updated if a contract changed
- [ ] Test data is synthetic; no client data, credentials, or `.env` values in code, tests, fixtures, or logs
- [ ] No `[skip ci]` in commit messages
- [ ] Labels set: type, one `v1-*` area, and priority (`needs-ca-review` if wording or behaviour needs CA sign-off)
