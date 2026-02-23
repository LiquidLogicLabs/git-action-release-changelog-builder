# Release Changelog Builder

A GitHub/Gitea Action that builds release notes/changelog from pull requests and commits, supporting multiple providers (GitHub, Gitea) with tag annotations and prefix/postfix messages.

## Features

- ✅ Multi-provider support (GitHub, Gitea - cloud and self-hosted)
- ✅ Multiple modes: PR, COMMIT, and HYBRID
- ✅ Tag annotation support
- ✅ Prefix and postfix messages
- ✅ Flexible configuration via JSON or file
- ✅ Category-based organization
- ✅ Template-based customization

## Quick Start

### Basic Usage (GitHub)

```yaml
- name: Build Changelog
  uses: LiquidLogicLabs/git-action-release-changelog-builder@v1
  with:
    from-tag: v1.0.0
    to-tag: v1.1.0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Basic Usage (Gitea)

```yaml
- name: Build Changelog
  uses: LiquidLogicLabs/git-action-release-changelog-builder@v1
  with:
    platform: gitea
    from-tag: v1.0.0
    to-tag: v1.1.0
  env:
    GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
```

### With Tag Annotations and Messages

```yaml
- name: Build Changelog
  uses: LiquidLogicLabs/git-action-release-changelog-builder@v1
  with:
    from-tag: v1.0.0
    to-tag: v1.1.0
    fetch-tag-annotations: true
    prefix-message: |
      # Release Notes
      
      This release includes the following changes:
    postfix-message: |
      ---
      For more information, visit [our documentation](https://example.com/docs)
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `platform` | No | Auto-detected | Platform: `github`, `gitea`, `local`, or `git` |
| `token` | No | Environment token | Authentication token |
| `repo` | No | Current repo | Repository to use (owner/repo or URL). Defaults to current repo if omitted. |
| `from-tag` | No | Previous tag | Previous tag to compare from. Supports special values — see below. |
| `to-tag` | No | `@current` | New tag to compare to. `@current` uses the tag the workflow is running under, or the most recent tag if not on a tag event. |
| `mode` | No | `PR` | Mode: `PR`, `COMMIT`, or `HYBRID` |
| `configuration` | No | Defaults | Path to configuration JSON file |
| `configuration-json` | No | - | Configuration JSON string |
| `ignore-pre-releases` | No | `false` | Ignore pre-release tags when finding predecessor |
| `fetch-tag-annotations` | No | `false` | Fetch tag annotation messages |
| `prefix-message` | No | - | Message to prepend to changelog |
| `postfix-message` | No | - | Message to append to changelog |
| `include-open` | No | `false` | Include open pull requests |
| `fail-on-error` | No | `false` | Fail the action on errors |
| `verbose` | No | `false` | Enable verbose debug logging |
| `skip-certificate-check` | No | `false` | Skip TLS certificate verification for API calls (self-hosted instances) |
| `max-tags-to-fetch` | No | `1000` | Maximum number of tags to fetch when searching for tags. If a specified tag is not found in the initial batch (200 tags), more tags will be fetched up to this limit |

\* Either `from-tag`/`to-tag` must be provided, or the action must run on a tag

### Special values for `from-tag`

| Value | Behaviour |
|-------|-----------|
| `@latest-release` | Resolves to the tag of the most recent published release. Falls back to the previous tag (with a warning) if the platform has no release API (local git), no releases exist, or the latest release tag is the same as `to-tag`. |
| `-N` (e.g. `-1`, `-2`) | Selects the tag N positions before `to-tag` in newest-first history. `-1` is equivalent to the default auto-detect behaviour. Throws if N exceeds the number of available tags before `to-tag`. |

## Outputs

| Output | Description |
|--------|-------------|
| `changelog` | The generated changelog |
| `contributors` | Comma-separated list of contributors |
| `pull-requests` | Comma-separated list of PR numbers |
| `tag-annotation` | Tag annotation message (if `fetch-tag-annotations` is enabled) |
| `owner` | Repository owner |
| `repo` | Repository name |
| `from-tag` | From tag name |
| `to-tag` | To tag name |
| `failed` | Whether the action failed |

## Permissions

No special permissions are required for reading repository data. If the changelog is used in a step that creates a release, that job will need `contents: write` as required by the release action.

## Configuration

### Basic Configuration

You can configure the changelog format using a JSON configuration file or inline JSON:

```json
{
  "template": "#{{CHANGELOG}}",
  "pr_template": "- #{{TITLE}}\n   - PR: ##{{NUMBER}}",
  "categories": [
    {
      "title": "## 🚀 Features",
      "labels": ["feature"]
    },
    {
      "title": "## 🐛 Bug Fixes",
      "labels": ["bug", "fix"]
    }
  ]
}
```

### Configuration Options

- `template`: Main template for the changelog
- `pr_template`: Template for each pull request entry
- `commit_template`: Template for commit entries (COMMIT/HYBRID mode)
- `categories`: Array of category definitions
- `ignore_labels`: Labels to exclude from changelog

### Template Placeholders

- `#{{CHANGELOG}}` - The categorized changelog
- `#{{PR_LIST}}` - List of all PRs
- `#{{CONTRIBUTORS}}` - List of contributors
- `#{{NUMBER}}` - PR number
- `#{{TITLE}}` - PR title
- `#{{AUTHOR}}` - PR author
- `#{{URL}}` - PR URL
- `#{{LABELS}}` - PR labels

## Platform Detection

The action automatically detects the platform from environment variables:

- `GITEA_SERVER_URL` → Gitea
- `GITHUB_SERVER_URL` or `GITHUB_API_URL` → GitHub

You can also explicitly specify the platform using the `platform` input.

## Self-Hosted Gitea

For self-hosted Gitea or GitHub Enterprise, the action auto-detects the base URL when provided by the runner (e.g., `GITHUB_SERVER_URL`/`GITHUB_API_URL` for GHES, `GITEA_SERVER_URL` for Gitea). If none are present, it falls back to the standard public endpoints (`https://api.github.com` for GitHub, `https://gitea.com` for Gitea). No `base-url` input is needed.

## Tag Annotations

When `fetch-tag-annotations` is enabled, the action will fetch annotation messages from git tags:

```bash
# Create an annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0 with major improvements"
```

The annotation will be included in the changelog output and available in the `tag-annotation` output.

## Prefix and Postfix Messages

You can add custom messages before or after the changelog:

```yaml
with:
  prefix-message: |
    # Release Notes
    
    This release includes important updates:
  postfix-message: |
    ---
    **Note**: Please read the migration guide before upgrading.
```

## Modes

### PR Mode (Default)

Generates changelog from merged pull requests only.

### COMMIT Mode

Generates changelog from commits between tags (no PR information).

### HYBRID Mode

Combines both PRs and commits for comprehensive changelog.

## Examples

### Full Example with Configuration

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Build Changelog
        id: changelog
        uses: LiquidLogicLabs/git-action-release-changelog-builder@v1
        with:
          fetch-tag-annotations: true
          prefix-message: |
            # Release ${{ github.ref_name }}
            
          configuration-json: |
            {
              "template": "#{{CHANGELOG}}",
              "pr_template": "- #{{TITLE}} (#{{NUMBER}})",
              "categories": [
                {"title": "## Features", "labels": ["feature"]},
                {"title": "## Fixes", "labels": ["bug", "fix"]}
              ]
            }
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Release
        uses: LiquidLogicLabs/git-action-release@v1
        with:
          tag: ${{ github.ref_name }}
          body: ${{ steps.changelog.outputs.changelog }}
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Credits

This action is inspired by and extends [mikepenz/release-changelog-builder-action](https://github.com/mikepenz/release-changelog-builder-action) by [Mike Penz](https://github.com/mikepenz).

Original action: https://github.com/mikepenz/release-changelog-builder-action

This action adds:
- Enhanced tag annotation support
- Prefix and postfix message functionality
- Improved multi-provider abstraction

## Documentation

For developers and contributors:

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, development workflow, and contributing guidelines
- **[Testing Guide](docs/TESTING.md)** - Complete testing documentation

## License

Apache-2.0

