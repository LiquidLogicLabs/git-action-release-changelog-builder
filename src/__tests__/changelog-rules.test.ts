import {generateChangelog} from '../changelog'
import {resolveConfiguration} from '../config'
import {PullRequestInfo, Configuration} from '../types'
import moment from 'moment'

/**
 * Commit-title categorisation (`rules` / `on_property`).
 *
 * These repos commit straight to the default branch with conventional-commit
 * subjects and no pull-request labels, so label-only matching can never place
 * an entry. Without `rules`, a configuration written against the upstream
 * mikepenz schema is accepted and then silently matches nothing -- every entry
 * lands in the default category. That is the failure these tests pin down.
 */
describe('category rules', () => {
  const entry = (over: Partial<PullRequestInfo>): PullRequestInfo => ({
    number: 0,
    title: 'chore: something',
    htmlURL: '',
    baseBranch: 'main',
    branch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'abc1234',
    author: 'someone',
    authorName: 'Some One',
    repoName: 'test/repo',
    labels: [],
    milestone: '',
    body: '',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged',
    ...over
  })

  const config = (over: Partial<Configuration> = {}): Configuration => ({
    template: '#{{CHANGELOG}}',
    pr_template: '- #{{TITLE}}\n   - PR: ##{{NUMBER}}',
    commit_template: '- #{{TITLE}}',
    empty_template: '- no changes',
    categories: [
      {title: '## Features', labels: [], rules: [{pattern: '^feat(\\(.+\\))?!?:', on_property: 'title', flags: 'gu'}]},
      {title: '## Fixes', labels: [], rules: [{pattern: '^fix(\\(.+\\))?!?:', on_property: 'title', flags: 'gu'}]}
    ],
    ignore_labels: [],
    defaultCategory: '## Other Changes',
    ...over
  })

  it('places a commit by its title when the category has rules and no labels', () => {
    const result = generateChangelog([entry({title: 'feat: add a thing'})], config())
    expect(result).toContain('## Features')
    expect(result).toContain('feat: add a thing')
    expect(result).not.toContain('## Other Changes')
  })

  it('does not leak an entry into a category whose rule does not match', () => {
    const result = generateChangelog([entry({title: 'fix: repair a thing'})], config())
    expect(result).toContain('## Fixes')
    const features = result.indexOf('## Features')
    expect(features).toBe(-1)
  })

  it('honours a negative lookahead, so chore(release) is not Maintenance', () => {
    const cfg = config({
      categories: [
        {
          title: '## Maintenance',
          labels: [],
          rules: [{pattern: '^(chore(?!\\(release\\))|refactor)(\\(.+\\))?!?:', on_property: 'title', flags: 'gu'}]
        }
      ]
    })
    const result = generateChangelog(
      [entry({title: 'chore: tidy up'}), entry({title: 'chore(release): 1.2.3'})],
      cfg
    )
    expect(result).toContain('chore: tidy up')
    expect(result).toContain('## Other Changes')
    // the release commit must NOT have been filed under Maintenance
    const maint = result.slice(result.indexOf('## Maintenance'), result.indexOf('## Other Changes'))
    expect(maint).not.toContain('chore(release): 1.2.3')
  })

  it('matches on a property other than title', () => {
    const cfg = config({
      categories: [{title: '## Breaking', labels: [], rules: [{pattern: 'BREAKING CHANGE', on_property: 'body', flags: 'gu'}]}]
    })
    const result = generateChangelog([entry({title: 'feat: x', body: 'BREAKING CHANGE: api moved'})], cfg)
    expect(result).toContain('## Breaking')
  })

  it('a rule is reusable across entries (no lastIndex carry-over from the g flag)', () => {
    // A RegExp with /g keeps lastIndex between .test() calls. Reusing one
    // compiled instance across entries makes every other entry fail to match.
    const result = generateChangelog(
      [entry({title: 'feat: one'}), entry({title: 'feat: two'}), entry({title: 'feat: three'})],
      config()
    )
    expect(result).toContain('feat: one')
    expect(result).toContain('feat: two')
    expect(result).toContain('feat: three')
  })

  it('still matches by label when a category has labels and no rules', () => {
    const cfg = config({categories: [{title: '## Features', labels: ['feature']}]})
    const result = generateChangelog([entry({number: 7, title: 'Add', labels: ['feature']})], cfg)
    expect(result).toContain('## Features')
  })

  it('an invalid regex does not throw; the entry falls through uncategorised', () => {
    const cfg = config({categories: [{title: '## Bad', labels: [], rules: [{pattern: '([', on_property: 'title'}]}]})
    expect(() => generateChangelog([entry({title: 'feat: x'})], cfg)).not.toThrow()
    const result = generateChangelog([entry({title: 'feat: x'})], cfg)
    expect(result).toContain('## Other Changes')
  })
})

describe('commit rendering', () => {
  const commit: PullRequestInfo = {
    number: 0,
    title: 'feat: from a commit',
    htmlURL: '',
    baseBranch: 'main',
    branch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'abc1234',
    author: 'someone',
    authorName: 'Some One',
    repoName: 'test/repo',
    labels: [],
    milestone: '',
    body: '',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  }

  const base: Configuration = {
    template: '#{{CHANGELOG}}',
    pr_template: '- #{{TITLE}}\n   - PR: ##{{NUMBER}}',
    commit_template: '- #{{TITLE}}',
    categories: [{title: '## Features', labels: [], rules: [{pattern: '^feat', on_property: 'title'}]}],
    ignore_labels: [],
    defaultCategory: '## Other Changes'
  }

  it('renders an entry with no PR using commit_template, not pr_template', () => {
    const result = generateChangelog([commit], base)
    expect(result).toContain('- feat: from a commit')
    expect(result).not.toContain('PR: #0')
  })

  it('still renders a real PR with pr_template', () => {
    const result = generateChangelog([{...commit, number: 42}], base)
    expect(result).toContain('PR: #42')
  })
})

describe('ignore_rules', () => {
  const entry = (title: string): PullRequestInfo => ({
    number: 0, title, htmlURL: '', baseBranch: 'main', branch: '',
    createdAt: moment(), mergedAt: moment(), mergeCommitSha: 'a', author: 'x', authorName: 'X',
    repoName: 'r', labels: [], milestone: '', body: '', assignees: [],
    requestedReviewers: [], approvedReviewers: [], status: 'merged'
  })

  it('drops entries matching an ignore rule entirely', () => {
    const cfg: Configuration = {
      template: '#{{CHANGELOG}}',
      commit_template: '- #{{TITLE}}',
      categories: [],
      ignore_labels: [],
      ignore_rules: [{pattern: '^chore\\(release\\):', on_property: 'title', flags: 'gu'}],
      defaultCategory: '## Other Changes'
    }
    const result = generateChangelog([entry('chore(release): 1.2.3'), entry('feat: kept')], cfg)
    expect(result).toContain('feat: kept')
    expect(result).not.toContain('chore(release): 1.2.3')
  })
})

/**
 * `mergeWithDefaults` is an explicit allow-list, so a new configuration field
 * is silently dropped unless it is added there too. These assert the two new
 * fields actually survive parsing -- the unit tests above operate on a
 * Configuration object directly and would pass either way.
 */
describe('configuration parsing carries the new fields through', () => {
  it('keeps category rules', () => {
    const json = JSON.stringify({
      categories: [{title: '## Features', labels: [], rules: [{pattern: '^feat', on_property: 'title', flags: 'gu'}]}]
    })
    const cfg = resolveConfiguration(process.cwd(), json, undefined)
    expect(cfg.categories?.[0]?.rules).toHaveLength(1)
    expect(cfg.categories?.[0]?.rules?.[0]?.pattern).toBe('^feat')
  })

  it('keeps ignore_rules', () => {
    const json = JSON.stringify({ignore_rules: [{pattern: '^chore\\(release\\):', on_property: 'title'}]})
    const cfg = resolveConfiguration(process.cwd(), json, undefined)
    expect(cfg.ignore_rules).toHaveLength(1)
    expect(cfg.ignore_rules?.[0]?.pattern).toBe('^chore\\(release\\):')
  })
})

/**
 * Uncategorised entries.
 *
 * Upstream renders them only where `#{{UNCATEGORIZED}}` appears in the
 * template, so a template without it drops them. This action appends them
 * under `defaultCategory` instead. Both behaviours are useful -- appending
 * means nothing is silently lost -- but a config has to be able to ask for
 * either, or configurations are not actually portable between the two.
 */
describe('uncategorised entries', () => {
  const e = (title: string): PullRequestInfo => ({
    number: 0, title, htmlURL: '', baseBranch: 'main', branch: '',
    createdAt: moment(), mergedAt: moment(), mergeCommitSha: 'a', author: 'x', authorName: 'X',
    repoName: 'r', labels: [], milestone: '', body: '', assignees: [],
    requestedReviewers: [], approvedReviewers: [], status: 'merged'
  })

  const cfg = (over: Partial<Configuration> = {}): Configuration => ({
    template: '#{{CHANGELOG}}',
    commit_template: '- #{{TITLE}}',
    categories: [{title: '## Features', labels: [], rules: [{pattern: '^feat', on_property: 'title'}]}],
    ignore_labels: [],
    defaultCategory: '## Other Changes',
    ...over
  })

  it('appends them under defaultCategory by default', () => {
    const result = generateChangelog([e('feat: a'), e('something unlabelled')], cfg())
    expect(result).toContain('## Other Changes')
    expect(result).toContain('something unlabelled')
  })

  it('an explicit empty defaultCategory suppresses the section', () => {
    const result = generateChangelog([e('feat: a'), e('something unlabelled')], cfg({defaultCategory: ''}))
    expect(result).toContain('feat: a')
    expect(result).not.toContain('## Other Changes')
    expect(result).not.toContain('something unlabelled')
  })

  it('renders them at #{{UNCATEGORIZED}} instead of appending, when the template asks', () => {
    const result = generateChangelog(
      [e('feat: a'), e('something unlabelled')],
      cfg({template: '#{{CHANGELOG}}\n\n## Leftovers\n\n#{{UNCATEGORIZED}}'})
    )
    expect(result).toContain('## Leftovers')
    expect(result).toContain('something unlabelled')
    // must NOT also be appended into the categorised body
    expect(result).not.toContain('## Other Changes')
    expect(result.match(/something unlabelled/g)).toHaveLength(1)
  })

  it('leaves the placeholder empty when everything was categorised', () => {
    const result = generateChangelog([e('feat: a')], cfg({template: '#{{CHANGELOG}}\n\nLEFT:#{{UNCATEGORIZED}}'}))
    expect(result).toContain('LEFT:')
    expect(result).not.toContain('#{{UNCATEGORIZED}}')
  })
})
