## [3.0.14](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.13...v3.0.14) (2026-09-09)


### Features

* accept upstream's input and output names ([5a8d469](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/5a8d46960427ea86e26bc61200a918b53b570ed7))
## [3.0.13](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.12...v3.0.13) (2026-09-09)


### Features

* **changelog:** make uncategorised handling configurable and upstream-compatible ([e82b80c](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/e82b80c7d11d6e74eb8b86690e1405f03bf2c443))
## [3.0.12](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.11...v3.0.12) (2026-09-09)


### Features

* **changelog:** categorise entries by regex rules, not labels alone ([209e1f2](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/209e1f237f09ebfc4bf5db0deeeff254c71f8fcc))
## [3.0.11](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.10...v3.0.11) (2026-09-09)


### Bug Fixes

* **release-notes:** categorise revert commits under Maintenance ([3d3babf](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/3d3babfe2ea20714305c31e2e9aabb1932e95fb3))
* **release-notes:** categorise the changelog by conventional-commit type ([5c3b825](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/5c3b8253e6e62e49063120af35614d3041c4a903))
* **release-notes:** drop the dead PR_LIST placeholder ([94fb8a0](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/94fb8a0b158916221d54242d6b59dfac4d73a952))
## [3.0.10](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.9...v3.0.10) (2026-09-08)
## [3.0.9](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.8...v3.0.9) (2026-09-08)


### Features

* consume @liquidlogiclabs/git-platform-detector from npmjs ([5c3d9da](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/5c3d9da59a5b3cedc38533055fc515ea57c72b1a))
## [3.0.8](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.7...v3.0.8) (2026-09-04)


### Bug Fixes

* **release:** stop publishing a live GITHUB_TOKEN in the release notes ([a0a20d9](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/a0a20d97a3daa76da23abd84835c3552dedf70bf))



## [3.0.7](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.6...v3.0.7) (2026-09-04)



## [3.0.6](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/compare/v3.0.5...v3.0.6) (2026-09-04)


### Bug Fixes

* refuse tag names git would read as an option or a refspec ([26cfd51](https://github.com/LiquidLogicLabs/git-action-release-changelog-builder/commit/26cfd511cee20b644306a711057375319a77439a))



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

