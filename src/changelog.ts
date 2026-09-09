import * as core from '@actions/core'
import {Configuration, Category, PullRequestInfo, Rule} from './types'

/**
 * Generate changelog from pull requests using configuration
 */
export function generateChangelog(
  pullRequests: PullRequestInfo[],
  config: Configuration,
  tagAnnotation?: string | null,
  prefixMessage?: string,
  postfixMessage?: string
): string {
  // Categorize pull requests
  const categorized = categorizePullRequests(
    pullRequests,
    config.categories || [],
    config.ignore_labels || [],
    config.ignore_rules || []
  )
  
  // Build changelog sections
  const sections: string[] = []

  // Add prefix message if provided
  if (prefixMessage) {
    sections.push(prefixMessage)
    sections.push('')
  }

  // Add tag annotation if provided
  if (tagAnnotation) {
    sections.push(tagAnnotation)
    sections.push('')
  }

  // Build categorized sections
  for (const category of config.categories || []) {
    const prs = categorized.get(category.title) || []
    if (prs.length > 0) {
      sections.push(category.title)
      sections.push('')
      
      for (const pr of prs) {
        const prLine = renderEntry(pr, config)
        sections.push(prLine)
      }
      
      sections.push('')
    }
  }

  // Handle uncategorized PRs
  const uncategorized = categorized.get('__uncategorized__') || []
  if (uncategorized.length > 0) {
    sections.push(config.defaultCategory || '## Other Changes')
    sections.push('')
    
    for (const pr of uncategorized) {
      const prLine = renderEntry(pr, config)
      sections.push(prLine)
    }
    
    sections.push('')
  }

  // Build main changelog content
  let changelog = sections.join('\n').trim()

  // If nothing was generated, use empty template fallback
  if (!changelog) {
    changelog = config.empty_template ?? '- no changes'
  }

  // Apply template if provided
  if (config.template) {
    changelog = applyTemplate(config.template, changelog, pullRequests)
  }

  // Add postfix message if provided
  if (postfixMessage) {
    changelog += '\n\n' + postfixMessage
  }

  return changelog
}

/**
 * Categorize pull requests based on configuration
 */
function categorizePullRequests(
  prs: PullRequestInfo[],
  categories: Category[],
  ignoreLabels: string[],
  ignoreRules: Rule[] = []
): Map<string, PullRequestInfo[]> {
  const categorized = new Map<string, PullRequestInfo[]>()
  const uncategorized: PullRequestInfo[] = []

  // Initialize category maps
  for (const category of categories) {
    categorized.set(category.title, [])
  }
  categorized.set('__uncategorized__', uncategorized)

  // Filter out ignored PRs
  const filteredPRs = prs.filter(pr => {
    if (pr.labels.some(label => ignoreLabels.includes(label.toLowerCase()))) {
      return false
    }
    return !matchesAnyRule(pr, ignoreRules)
  })

  // Categorize each PR
  for (const pr of filteredPRs) {
    let matched = false

    for (const category of categories) {
      if (matchesCategory(pr, category)) {
        const categoryPRs = categorized.get(category.title) || []
        categoryPRs.push(pr)
        categorized.set(category.title, categoryPRs)
        matched = true
        break // PR can only belong to one category
      }
    }

    if (!matched) {
      uncategorized.push(pr)
    }
  }

  return categorized
}

/**
 * Check if a PR matches a category
 */
function matchesCategory(pr: PullRequestInfo, category: Category): boolean {
  const hasLabels = Boolean(category.labels && category.labels.length > 0)
  const hasRules = Boolean(category.rules && category.rules.length > 0)

  // A category declaring neither cannot match anything.
  if (!hasLabels && !hasRules) {
    return false
  }

  if (hasLabels) {
    const prLabels = pr.labels.map(l => l.toLowerCase())
    const categoryLabels = (category.labels as string[]).map(l => l.toLowerCase())
    if (categoryLabels.some(label => prLabels.includes(label))) {
      return true
    }
  }

  return hasRules && matchesAnyRule(pr, category.rules)
}

/**
 * The entry field a rule is matched against. Defaults to the title, which is
 * what conventional-commit categorisation needs.
 */
function propertyValue(pr: PullRequestInfo, property: Rule['on_property']): string {
  switch (property) {
    case 'body':
      return pr.body || ''
    case 'branch':
      return pr.branch || ''
    case 'baseBranch':
      return pr.baseBranch || ''
    case 'author':
      return pr.author || ''
    case 'milestone':
      return pr.milestone || ''
    case 'status':
      return pr.status || ''
    case 'title':
    default:
      return pr.title || ''
  }
}

/**
 * True when ANY rule matches the entry.
 *
 * Each rule is compiled per call rather than cached, and `g`/`y` are stripped
 * from the flags: those make a RegExp stateful through lastIndex, so a shared
 * instance would match only every other entry. An unparseable pattern is
 * warned about and treated as "no match" -- one bad pattern in a user's
 * configuration must not abort a release.
 */
function matchesAnyRule(pr: PullRequestInfo, rules: Rule[] | undefined): boolean {
  if (!rules || rules.length === 0) {
    return false
  }

  return rules.some(rule => {
    if (!rule || typeof rule.pattern !== 'string' || rule.pattern.length === 0) {
      return false
    }

    const flags = (rule.flags || '').replace(/[gy]/g, '')
    let expression: RegExp
    try {
      expression = new RegExp(rule.pattern, flags)
    } catch (error) {
      core.warning(`Ignoring invalid category rule /${rule.pattern}/${flags}: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }

    return expression.test(propertyValue(pr, rule.on_property))
  })
}

/**
 * Render one entry.
 *
 * An entry collected from a commit rather than a pull request carries
 * `number: 0`. Rendering those with `pr_template` printed a bogus "PR: #0"
 * beneath every line -- and `commit_template`, though parsed from the
 * configuration, was never used anywhere. This is where it gets used.
 */
function renderEntry(pr: PullRequestInfo, config: Configuration): string {
  const template = pr.number > 0 ? config.pr_template || '- #{{TITLE}}' : config.commit_template || '- #{{TITLE}}'
  return renderPullRequest(pr, template)
}

/**
 * Render a pull request using template
 */
function renderPullRequest(pr: PullRequestInfo, template: string): string {
  let result = template

  // Replace placeholders
  result = result.replace(/#\{\{NUMBER\}\}/g, String(pr.number))
  result = result.replace(/#\{\{TITLE\}\}/g, pr.title)
  result = result.replace(/#\{\{AUTHOR\}\}/g, pr.author)
  result = result.replace(/#\{\{URL\}\}/g, pr.htmlURL)
  result = result.replace(/#\{\{BRANCH\}\}/g, pr.branch || '')
  result = result.replace(/#\{\{BASE_BRANCH\}\}/g, pr.baseBranch)
  result = result.replace(/#\{\{MILESTONE\}\}/g, pr.milestone)
  result = result.replace(/#\{\{BODY\}\}/g, pr.body)
  result = result.replace(/#\{\{LABELS\}\}/g, pr.labels.join(', '))
  result = result.replace(/#\{\{MERGE_COMMIT_SHA\}\}/g, pr.mergeCommitSha)

  if (pr.mergedAt) {
    result = result.replace(/#\{\{MERGED_AT\}\}/g, pr.mergedAt.format('YYYY-MM-DD'))
  }

  return result
}

/**
 * Apply main template with placeholders
 */
function applyTemplate(template: string, changelog: string, prs: PullRequestInfo[]): string {
  let result = template

  // Replace main changelog placeholder
  result = result.replace(/#\{\{CHANGELOG\}\}/g, changelog)

  // Replace PR list placeholder
  const prList = prs.map(pr => `- #${pr.number}: ${pr.title}`).join('\n')
  result = result.replace(/#\{\{PR_LIST\}\}/g, prList)

  // Replace contributors placeholder
  const contributors = Array.from(new Set(prs.map(pr => pr.author))).join(', ')
  result = result.replace(/#\{\{CONTRIBUTORS\}\}/g, contributors)

  // Replace PR numbers placeholder
  const prNumbers = prs.map(pr => pr.number).join(', ')
  result = result.replace(/#\{\{PULL_REQUESTS\}\}/g, prNumbers)

  return result
}

