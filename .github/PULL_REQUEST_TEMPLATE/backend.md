## Summary

<!-- What changes in the API, schema, or storage layer. -->

Closes #
Depends on: #

## Schema and API changes

<!-- Tables, columns, routes, request and response shapes. -->

## Migration

- [ ] No schema change
- [ ] Migration included and safe on existing data
- [ ] Recovery plan: <!-- describe -->

## Testing

<!-- Commands, seed data, example requests. -->

## Workspace isolation and access

- [ ] Every query is scoped to the workspace
- [ ] Every route checks authentication and the caller's role
- [ ] A test shows one workspace cannot read or modify another's data
- [ ] Actions that change client records, documents, reviews, or assignments write an audit event with actor, action, target, and time

## Input and errors

- [ ] Input is validated on the server
- [ ] Errors use the standard response shape and expose no internals
- [ ] Uploads check type, size, and ownership

## Checklist

- [ ] `npm run check` passes
- [ ] `docs/lld.md` updated
- [ ] Labels: `v1-api`, `v1-workspace`, or `v1-storage`; priority; `v1-security` if access control changed
