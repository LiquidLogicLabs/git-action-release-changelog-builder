## [3.0.5](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.4...v3.0.5) (2026-09-03)


### Bug Fixes

* **lint:** quote eslint glob so all of src/ is linted ([e7c4bc5](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/e7c4bc55c15ff724bb22ecdfdb1347ca6ed3d57d))
* **lint:** resolve errors surfaced by the widened glob ([b8d2f61](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/b8d2f61378eba695ef3e4e0bcde81c405a2f8988))
* **parity:** move GitHub context lookups behind a provider helper ([550f511](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/550f5114764a47ef4a0f8f0c9a0290071cfc6661))



## [3.0.4](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.3...v3.0.4) (2026-07-05)



## [3.0.3](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.2...v3.0.3) (2026-04-21)


### Bug Fixes

* correct action runtime to node24 ([c0f715f](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/c0f715fd3ee4b22dd4f3e968140cacda7537646c))



## [3.0.2](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.1...v3.0.2) (2026-02-23)


### Features

* add from-tag offset (-N), [@latest-release](https://github.com/latest-release), and to-tag [@current](https://github.com/current) support ([5a46cea](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/5a46ceaf97ae649483ae59bf1cd0044f32ccf671))



# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation with multi-provider support (GitHub and Gitea)
- Tag annotation fetching support
- Prefix and postfix message support
- PR, COMMIT, and HYBRID modes
- Configuration via JSON string or file
- Category-based changelog organization
- Template-based customization

