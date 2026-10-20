<!--
Do not describe an unfixed vulnerability here. Report it privately to a
maintainer and open the PR once a fix is ready to merge.
-->

## Summary

<!-- The risk addressed or the control added. -->

Closes #

## Threat

<!-- Who could do what, and what prevents it after this change. -->

## Behaviour change

<!-- Effects on existing users, defaults, and any switch or flag. -->

## Testing

<!-- Include a case that must now be refused. -->

## Checklist

- [ ] No credentials, tokens, or client data in code, tests, fixtures, or logs
- [ ] New configuration is documented and defaults to the safe setting
- [ ] Sessions and tokens expire and end on sign-out
- [ ] Failures deny access
- [ ] Tests cover both the allowed and denied paths
- [ ] `npm run check` passes
- [ ] Labels: `v1-security`, priority
