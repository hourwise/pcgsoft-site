# Dedicated GitHub App review delivery

This is the active automated review-delivery identity for
`hourwise/pcgsoft-site`. It does not change discovery, reconciliation, the
canonical registry, or public pages. The workflow on `main` uses the scoped App
only to create or update review evidence; human review remains required before
anything can enter `main`.

## App registration and installation

- Owner: the `hourwise` personal account.
- Intended name: `PCGsoft Portfolio Sync`, or the nearest available unique name.
  Record the final name, App ID, and bot slug after registration.
- Visibility: private, **Only on this account**; do not list it in Marketplace.
- Webhooks: inactive. This App issues short-lived installation tokens; it does
  not receive events or use user authorization.
- Installation: **Only select repositories**, selecting exactly
  `hourwise/pcgsoft-site`. Do not select a project or sibling repository.
- Repository permissions: Metadata **Read** (GitHub's required implicit
  permission), Contents **Read & write**, Pull requests **Read & write**.
  All other repository and organization permissions remain **No access**.
- Ruleset `23957714`: the App is neither a bypass actor nor a Code Owner.

The Contents and Pull requests write grants technically include ordinary
branch and PR API operations. GitHub does not split those grants into a
create-only capability. The workflow contains no review submission, approval,
merge, or ruleset update operation. `main` requires a human `@hourwise` Code
Owner approval; the App cannot supply that approval or bypass the ruleset.

## Repository credential locations

| Name | Location | Purpose |
| --- | --- | --- |
| `PCGSOFT_SYNC_APP_ID` | `pcgsoft-site` Actions variable | Dedicated App ID; the pinned token action still supports its legacy `app-id` input. |
| `PCGSOFT_SYNC_APP_PRIVATE_KEY` | `pcgsoft-site` Actions secret | Full PEM private key. |

Generate one App private key only when provisioning the App. Put the entire key
in the repository secret directly. Never put the key in a file in this
repository, a workflow artifact, a log, an Actions variable, or a project
repository. Do not use a personal access token. Record only the variable and
secret **names** in reports.

The workflow uses pinned `actions/create-github-app-token` v3.2.0. The App ID
input is supported but marked legacy by that release; a later reviewed change
can switch to its preferred Client ID input. This slice keeps the approved
`PCGSOFT_SYNC_APP_ID` name. The token request specifies `owner: hourwise`,
`repositories: pcgsoft-site`, `permission-contents: write`, and
`permission-pull-requests: write`. The token action revokes the token at job
end; GitHub installation access tokens otherwise expire after one hour.

## Runtime flow

1. The native `GITHUB_TOKEN` has only `contents: read` and
   `pull-requests: read`. Checkout does not persist its credentials. This token
   reads site and public repository evidence and compares the open review PR.
2. Reconciliation writes only local derived files and uploads the raw report
   artifact. The material-evidence comparison returns `changed`.
3. On `changed=false`, the App token, bot identity, and PR delivery steps are
   skipped. The stable branch and PR #7 do not move; outcome is `none`.
4. On `changed=true`, the workflow mints the scoped App token. A read-only user
   lookup resolves the App bot's numeric ID. The same bot identity becomes
   both author and committer for the generated evidence commit.
5. Pinned `peter-evans/create-pull-request` v8.1.1 receives the App token for
   both its PR API calls and branch push. It keeps branch
   `automation/portfolio-sync`, the same four generated `add-paths`, and
   `delete-branch: false`. An open PR #7 is reused, not replaced. A new push
   invalidates stale human approval under the existing ruleset.

The original PR #7 author, `github-actions[bot]`, remains in history. The bot
identity of future App-authenticated commits is determined only after the App
exists. The workflow never attributes a scheduled generated commit to
`@hourwise`.

## Controlled delivery proof

Provision the App, variable, and secret before testing its write path. Use a
temporary `automation/portfolio-sync-app-test` branch and a scratch PR against
`main` with one harmless non-public evidence file. Exercise the same App token
action and pinned PR action used above. Confirm the installation scope, commit
author and committer, PR creation and update, Code Owner requirement, and
absence of review or merge calls. Do not change `data/projects.json`, PR #7,
or a project repository to manufacture a portfolio change. Close the scratch
PR and delete only its exact temporary branch after recording proof. Do not
merge the scratch PR.

The production workflow's no-change path must also be observed without an App
token mint or remote write; its report artifact should still upload. Do not
claim live App delivery or PR #7 reuse from static tests alone.

## Rollback and key handling

The normal steady state is `can_approve_pull_request_reviews = false` with
default `GITHUB_TOKEN` permissions set to `read`. If App delivery fails, pause
the schedule if needed to prevent repeated noise, preserve PR #7 and
`automation/portfolio-sync`, then repair or rotate the App key or installation.
Submit any workflow repair through a human-reviewed PR while keeping the
`main` ruleset and Code Owner protection active.

Re-enabling the broad Actions create/approve capability is not an automated
fallback. It is allowed only as an explicit, human-authorized emergency
rollback. No workflow may change this repository setting. Do not change
canonical project data during rollback.

If the key is lost or compromised, generate a replacement on the App, replace
the repository secret, verify one controlled token mint, and revoke the old
key. Remove the App installation if its scope or trust cannot be restored.

## References

- [GitHub App registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [GitHub App token action v3.2.0](https://github.com/actions/create-github-app-token/blob/v3.2.0/README.md)
- [Create pull request action v8.1.1](https://github.com/peter-evans/create-pull-request/blob/v8.1.1/README.md)
