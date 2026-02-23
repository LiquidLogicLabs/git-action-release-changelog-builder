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

