import moment from 'moment'

/**
 * Pull Request information structure
 */
export interface PullRequestInfo {
  number: number
  title: string
  htmlURL: string
  baseBranch: string
  branch?: string
  createdAt: moment.Moment
  mergedAt: moment.Moment | undefined
  mergeCommitSha: string
  author: string
  authorName: string
  repoName: string
  labels: string[]
  milestone: string
  body: string
  assignees: string[]
  requestedReviewers: string[]
  approvedReviewers: string[]
  status: 'open' | 'merged'
}

/**
 * Commit information structure
 */
export interface CommitInfo {
  sha: string
  message: string
  author: string
  authorName: string
  date: moment.Moment
  htmlURL: string
}

/**
 * Tag information structure
 */
export interface TagInfo {
  name: string
  date: moment.Moment | undefined
  sha: string
  annotation?: string
}

/**
 * Diff information structure
 */
export interface DiffInfo {
  changedFiles: number
  additions: number
  deletions: number
  changes: number
  commits: CommitInfo[]
}

/**
 * Category configuration for organizing PRs
 */
/**
 * A regular-expression rule used to place an entry into a category.
 *
 * Written to match the upstream mikepenz/release-changelog-builder-action
 * schema, so a configuration is portable between the two. This matters
 * because that action is GitHub-only: on Gitea this action is the only
 * option, and a config that categorises there must categorise here too.
 */
export interface Rule {
  /** Regular expression source, e.g. `^feat(\\(.+\\))?!?:`. */
  pattern: string
  /**
   * Which field of the entry to test. Defaults to `title`, which is what
   * conventional-commit categorisation needs.
   */
  on_property?: 'title' | 'body' | 'branch' | 'baseBranch' | 'author' | 'milestone' | 'status'
  /**
   * Regex flags. `g` and `y` are stripped before compiling: they make a
   * RegExp stateful via lastIndex, which would make the same rule match
   * only every other entry.
   */
  flags?: string
}

export interface Category {
  key?: string
  title: string
  labels?: string[]
  exclude_labels?: string[]
  mode?: 'HYBRID' | 'COMMIT' | 'PR'
  entries?: string[]
  /**
   * Regex rules matched against the entry itself. An entry joins the category
   * if ANY rule matches, or if any of `labels` matches. Without this, a
   * category with `labels: []` can never match anything.
   */
  rules?: Rule[]
}

/**
 * Regex configuration for pattern matching
 */
export interface Regex {
  pattern: string
  flags?: string
  target?: string
  method?: 'replace' | 'replaceAll' | 'match'
  on_empty?: string
}

/**
 * Configuration for the changelog builder
 */
export interface Configuration {
  template?: string
  pr_template?: string
  commit_template?: string
  empty_template?: string
  categories?: Category[]
  ignore_labels?: string[]
  /** Entries matching ANY of these rules are dropped from the changelog entirely. */
  ignore_rules?: Rule[]
  trim_values?: boolean
  defaultCategory?: string
}

/**
 * Action input types
 */
export interface ActionInputs {
  platform?: 'github' | 'gitea' | 'local' | 'git'
  token?: string
  repo?: string
  fromTag?: string
  toTag?: string
  mode?: 'PR' | 'COMMIT' | 'HYBRID'
  configuration?: string
  configurationJson?: string
  ignorePreReleases?: boolean
  fetchTagAnnotations?: boolean
  prefixMessage?: string
  postfixMessage?: string
  includeOpen?: boolean
  failOnError?: boolean
  maxTagsToFetch?: number
  skipCertificateCheck?: boolean
  verbose?: boolean
}

/**
 * Provider platform type
 */
export type ProviderPlatform = 'github' | 'gitea' | 'local' | 'git'

