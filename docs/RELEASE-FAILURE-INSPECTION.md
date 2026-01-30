# Release Workflow Failure Inspection (2026-01-30)

## Summary

Five action repos had their release workflows **fail** after patch releases were triggered on 2026-01-30. The release run shows **failure**, with **release** and **e2e-tests** jobs **skipped**. This document explains what went wrong and why jobs were skipped.

---

## Failed Runs

| Repo | Run ID | Tag | Conclusion | Jobs in run |
|------|--------|-----|------------|-------------|
| git-action-docker-cleanup | 21516726479 | v1.0.3 | failure | release (skipped), e2e-tests (skipped) |
| git-action-changelog-parser | 21516729639 | v1.0.10 | failure | release (skipped), e2e-tests (skipped) |
| git-action-tag-validate-version | 21516732681 | v1.0.8 | failure | release (skipped), e2e-tests (skipped) |
| git-action-tag-floating-version | 21516735250 | v1.0.7 | failure | release (skipped), e2e-tests (skipped) |
| git-action-commit-info | 21516744919 | v1.0.3 | failure | release (skipped), e2e-tests (skipped) |

---

## Why Jobs Were Skipped

The release workflow is structured as:

```yaml
jobs:
  ci:           # workflow_call to ci.yml
    uses: ./.github/workflows/ci.yml
  e2e-tests:
    needs: ci
    uses: ./.github/workflows/e2e-tests.yml
  release:
    needs: [ci, e2e-tests]
    runs-on: ubuntu-latest
    # ... release steps
```

- **e2e-tests** and **release** are skipped because they `need` the **ci** job.
- When the **ci** job fails, the run is marked **failure** and dependent jobs are **skipped** (not run).

So: **The “ci” job (workflow_call to ci.yml) failed.** That caused the run to fail and all downstream jobs to be skipped.

---

## What Actually Failed: The “ci” Job

In the **failed** runs, the run’s job list from the API only shows:

- `release` (skipped)
- `e2e-tests` (skipped)

There is **no** “ci” job (and no nested “ci / lint”, “ci / test”, etc.) in the run’s job list. When a job that uses `workflow_call` fails to start or fails immediately, the parent run can still show only the *other* jobs (release, e2e-tests) as skipped, which matches what we see.

By contrast, a **successful** release run (e.g. git-action-release-changelog-builder run 21515185974) shows nested jobs from the called workflows:

- `ci / lint` (success)
- `ci / test / test` (success)
- `e2e-tests / e2e (...)` (success)
- `release` (success)

So in the failed repos, the **ci** job (the workflow_call to `ci.yml`) never completed successfully—and likely never started or failed very early—so the run failed and only the two non-ci jobs appear, both skipped.

---

## Root Cause: workflow_call from Tag Push

Observations:

1. **Same commit, two events**  
   For the failed releases, the typical sequence was: push commit to **main**, then push **tag** (e.g. `v1.0.3`) on the same commit. So we have:
   - **Event 1:** push to `main` → triggers **CI** workflow (ref `refs/heads/main`).
   - **Event 2:** push tag → triggers **Release** workflow (ref `refs/tags/v1.0.3`).

2. **Release run’s first job is “ci”**  
   The release workflow’s first job is `ci`, which does `uses: ./.github/workflows/ci.yml`. So when the release runs on a **tag** ref, it tries to start a **new** run of `ci.yml` in the context of that tag ref.

3. **No separate CI run for the tag**  
   For the failed release (e.g. docker-cleanup), at the same time we see:
   - One **CI** run: ref `main`, same commit, **success**.
   - One **Release** run: ref `v1.0.3`, **failure**, with only `release` and `e2e-tests` (skipped).  
   There is **no** CI run with ref `v1.0.3` (tag). So the workflow_call from the release (tag) either did not create a child CI run or that run was not visible/finished successfully.

4. **Concurrency group difference**  
   In the **five failed** repos, `ci.yml` uses a concurrency group **without** `github.event_name`:

   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
     cancel-in-progress: true
   ```

   In **successful** repos (e.g. git-action-release-changelog-builder, git-action-tag-info, git-action-release, git-action-tag-create-update, git-action-trigger-workflow), `ci.yml` includes `github.event_name`:

   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}
     cancel-in-progress: true
   ```

   When the same commit triggers both:
   - CI from **push** (main): group = `CI-refs/heads/main`.
   - CI from **workflow_call** (release on tag): the called workflow runs in the caller’s context (tag ref). If the platform treats or deduplicates runs by workflow + ref (or similar), the workflow_call might be rejected or failed (“workflow already running for this commit”) instead of creating a second run.  
   Including **event_name** in the group gives the workflow_call-triggered CI a **distinct** concurrency group (e.g. `CI-workflow_dispatch-refs/tags/v1.0.3` or similar), so it can start and run instead of being deduplicated or failed.

So the most plausible root cause is: **when the release workflow runs on a tag ref and calls `ci.yml`, the “ci” job fails (or never properly starts) due to how CI is triggered and/or concurrency is keyed, and the five repos’ `ci.yml` concurrency group (without `event_name`) makes this more likely.**

---

## Why “release” and “e2e-tests” Show as Skipped

- **e2e-tests** has `needs: ci`. If **ci** fails, this job is **skipped**.
- **release** has `needs: [ci, e2e-tests]`. If **ci** (or e2e-tests) fails, this job is **skipped**.

So the run correctly shows:

1. **ci** – failed (and may not appear as a normal job in the API when the workflow_call fails to start or fails immediately).
2. **e2e-tests** – skipped (because ci failed).
3. **release** – skipped (because ci failed).

No release steps ran; no release was created.

---

## Fix Applied

**Add `github.event_name` to the concurrency group in `ci.yml`** in the five failed repos so that:

- CI triggered by **push** (e.g. to main) uses one group (e.g. `CI-push-refs/heads/main`).
- CI triggered by **workflow_call** from the release workflow (tag ref) uses a different group (e.g. `CI-workflow_dispatch-refs/tags/v1.0.3` or similar).

This allows the release workflow’s “ci” job to start and complete, so **e2e-tests** and **release** can run instead of being skipped.

**Repos to update:**

- git-action-docker-cleanup  
- git-action-changelog-parser  
- git-action-tag-validate-version  
- git-action-tag-floating-version  
- git-action-commit-info  

**Change in each repo’s `.github/workflows/ci.yml`:**

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

After this change, re-run the release (e.g. re-push the same tag or trigger a new patch release) and the release workflow should pass and create the release.

---

## References

- Release run (docker-cleanup): `https://github.com/LiquidLogicLabs/git-action-docker-cleanup/actions/runs/21516726479`
- Successful release run (changelog-builder): `https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/actions/runs/21515185974`
- Commit check runs for release commit (docker-cleanup): only 2 jobs in the release run’s check suite (release, e2e-tests); lint/test belong to the CI run from push to main.
