import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { ActionInputs, Configuration } from './types'

/**
 * Default configuration
 */
export const DefaultConfiguration: Configuration = {
  template: '#{{CHANGELOG}}',
  pr_template: '- #{{TITLE}}\n   - PR: ##{{NUMBER}}',
  commit_template: '- #{{TITLE}}',
  empty_template: '- no changes',
  categories: [
    {
      title: '## 🚀 Features',
      labels: ['feature']
    },
    {
      title: '## 🐛 Bug Fixes',
      labels: ['bug', 'fix']
    },
    {
      title: '## 📝 Documentation',
      labels: ['documentation', 'docs']
    },
    {
      title: '## 🔧 Maintenance',
      labels: ['maintenance', 'chore']
    }
  ],
  ignore_labels: [],
  trim_values: true,
  defaultCategory: '## Other Changes'
}

export type ParsedInputs = ActionInputs & {
  mode: 'PR' | 'COMMIT' | 'HYBRID'
  ignorePreReleases: boolean
  fetchTagAnnotations: boolean
  includeOpen: boolean
  failOnError: boolean
  maxTagsToFetch: number
  skipCertificateCheck: boolean
  verbose: boolean
}

function normalizeOptional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function parseMode(value: string): 'PR' | 'COMMIT' | 'HYBRID' {
  const normalized = value.toUpperCase()
  if (normalized === 'PR' || normalized === 'COMMIT' || normalized === 'HYBRID') {
    return normalized
  }
  throw new Error(`Invalid mode: ${value}. Must be PR, COMMIT, or HYBRID.`)
}

function parsePlatform(value: string | undefined): ActionInputs['platform'] {
  if (!value) {
    return undefined
  }

  const normalized = value.toLowerCase()
  if (normalized === 'github' || normalized === 'gitea' || normalized === 'local' || normalized === 'git') {
    return normalized
  }

  throw new Error(`Invalid platform: ${value}. Must be github, gitea, local, or git.`)
}

function parseBoolean(val?: string): boolean {
  return val?.toLowerCase() === 'true' || val === '1'
}

export function resolveDebugMode(): boolean {
  return (
    (typeof core.isDebug === 'function' && core.isDebug()) ||
    parseBoolean(process.env.ACTIONS_STEP_DEBUG) ||
    parseBoolean(process.env.ACTIONS_RUNNER_DEBUG) ||
    parseBoolean(process.env.RUNNER_DEBUG)
  )
}

export function resolveVerbose(): boolean {
  const verboseInput = core.getBooleanInput('verbose')
  const debugMode = resolveDebugMode()
  return verboseInput || debugMode
}

/**
 * Input names accepted from mikepenz/release-changelog-builder-action, mapped
 * to this action's canonical kebab-case names.
 *
 * That action is GitHub-only, so on Gitea this one is the only option and a
 * workflow moving across should not have to rewrite its inputs. The failure
 * this prevents is silent: an unrecognised input is simply ignored, which is
 * how `configurationJson` once discarded an entire configuration -- template
 * and all -- from this repository's own release workflow, unnoticed for
 * several releases.
 *
 * Accepting a name is only half of it. Every alias here must also be declared
 * in action.yml, and a test enforces both directions: an alias honoured in
 * code but undeclared, or declared but not honoured, fails the build.
 */
export const UPSTREAM_INPUT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  configurationJson: 'configuration-json',
  failOnError: 'fail-on-error',
  fromTag: 'from-tag',
  ignorePreReleases: 'ignore-pre-releases',
  includeOpen: 'include-open',
  toTag: 'to-tag'
})

const CANONICAL_TO_ALIASES: Readonly<Record<string, string[]>> = Object.freeze(
  Object.entries(UPSTREAM_INPUT_ALIASES).reduce<Record<string, string[]>>((acc, [alias, canonical]) => {
    ;(acc[canonical] ||= []).push(alias)
    return acc
  }, {})
)

/**
 * Declared defaults for the canonical inputs that have one, from action.yml.
 *
 * A default is materialised into INPUT_* exactly like a user-supplied value,
 * so `core.getInput` cannot tell them apart. Without this, an input carrying a
 * default always looks "explicitly set", every alias for it looks like a
 * conflict, and the compatibility is unusable for precisely the inputs most
 * likely to be aliased. A test asserts this map still matches action.yml.
 */
export const CANONICAL_DEFAULTS: Readonly<Record<string, string>> = Object.freeze({
  'fail-on-error': 'false',
  'ignore-pre-releases': 'false',
  'include-open': 'false',
  'to-tag': '@current'
})

/**
 * Read an input by its canonical name, falling back to any upstream alias.
 *
 * The canonical name wins when explicitly set. When it holds only its declared
 * default it is treated as unset, so an alias can supply the value. When both
 * are explicitly set and disagree this throws rather than choosing: silently
 * preferring one would reintroduce the class of bug the aliases exist to
 * remove.
 */
function readAliasedInput(canonical: string): string {
  const canonicalValue = core.getInput(canonical)
  const declaredDefault = CANONICAL_DEFAULTS[canonical]
  const canonicalExplicit = Boolean(canonicalValue) && canonicalValue !== declaredDefault
  const aliases = CANONICAL_TO_ALIASES[canonical] || []

  for (const alias of aliases) {
    const aliasValue = core.getInput(alias)
    if (!aliasValue) {
      continue
    }
    if (canonicalExplicit && canonicalValue !== aliasValue) {
      throw new Error(
        `Both '${canonical}' and its compatibility alias '${alias}' were set to different values ` +
          `('${canonicalValue}' vs '${aliasValue}'). Set only '${canonical}'.`
      )
    }
    if (!canonicalExplicit) {
      core.warning(`'${alias}' is a compatibility alias for '${canonical}'; prefer '${canonical}'.`)
      return aliasValue
    }
  }

  return canonicalValue
}

/**
 * Boolean form of {@link readAliasedInput}.
 *
 * An explicit value is validated the same way `core.getBooleanInput` does, so
 * a typo such as `yes` still fails loudly. Returning false for anything
 * unrecognised would reintroduce the silent-misconfiguration bug that the
 * aliases exist to remove.
 */
function readAliasedBoolean(canonical: string): boolean {
  const raw = readAliasedInput(canonical)
  if (!raw) {
    // Nothing set here or on an alias: defer to core so action.yml's default applies.
    return core.getBooleanInput(canonical)
  }
  if (['true', 'True', 'TRUE'].includes(raw)) {
    return true
  }
  if (['false', 'False', 'FALSE'].includes(raw)) {
    return false
  }
  throw new TypeError(
    `Input does not meet YAML 1.2 "Core Schema" specification: ${canonical}\n` +
      'Support boolean input list: `true | True | TRUE | false | False | FALSE`'
  )
}

export function getInputs(): ParsedInputs {
  const platform = parsePlatform(normalizeOptional(core.getInput('platform') || ''))
  const token = normalizeOptional(core.getInput('token') || '')
  if (token) {
    core.setSecret(token)
  }
  const repo = normalizeOptional(core.getInput('repo') || '')
  const fromTag = normalizeOptional(readAliasedInput('from-tag') || '')
  const toTag = normalizeOptional(readAliasedInput('to-tag') || '')
  const mode = parseMode(core.getInput('mode') || 'PR')
  const configurationJson = normalizeOptional(readAliasedInput('configuration-json') || '')
  const configuration = normalizeOptional(core.getInput('configuration') || '')
  const ignorePreReleases = readAliasedBoolean('ignore-pre-releases')
  const fetchTagAnnotations = core.getBooleanInput('fetch-tag-annotations')
  const prefixMessage = normalizeOptional(core.getInput('prefix-message') || '')
  const postfixMessage = normalizeOptional(core.getInput('postfix-message') || '')
  const includeOpen = readAliasedBoolean('include-open')
  const failOnError = readAliasedBoolean('fail-on-error')
  const maxTagsToFetchRaw = normalizeOptional(core.getInput('max-tags-to-fetch') || '')
  const maxTagsToFetch = maxTagsToFetchRaw ? parseInt(maxTagsToFetchRaw, 10) : 1000

  if (maxTagsToFetchRaw && Number.isNaN(maxTagsToFetch)) {
    throw new Error(`Invalid maxTagsToFetch: ${maxTagsToFetchRaw}. Must be a number.`)
  }

  const skipCertificateCheck = core.getBooleanInput('skip-certificate-check')
  const verbose = resolveVerbose()

  return {
    platform,
    token,
    repo,
    fromTag,
    toTag,
    mode,
    configuration,
    configurationJson,
    ignorePreReleases,
    fetchTagAnnotations,
    prefixMessage,
    postfixMessage,
    includeOpen,
    failOnError,
    maxTagsToFetch,
    skipCertificateCheck,
    verbose
  }
}

/**
 * Parse configuration from JSON string
 */
export function parseConfigurationJson(configJson: string): Configuration | null {
  try {
    const config = JSON.parse(configJson)
    return mergeWithDefaults(config)
  } catch (error) {
    core.error(`Failed to parse configuration JSON: ${error}`)
    return null
  }
}

/**
 * Load configuration from file
 */
export function loadConfigurationFromFile(repositoryPath: string, configPath: string): Configuration | null {
  try {
    const fullPath = path.resolve(repositoryPath, configPath)
    
    if (!fs.existsSync(fullPath)) {
      core.warning(`Configuration file not found: ${fullPath}`)
      return null
    }

    const fileContent = fs.readFileSync(fullPath, 'utf8')
    const config = JSON.parse(fileContent)
    return mergeWithDefaults(config)
  } catch (error) {
    core.error(`Failed to load configuration from file: ${error}`)
    return null
  }
}

/**
 * Merge user configuration with defaults
 */
function mergeWithDefaults(userConfig: Partial<Configuration>): Configuration {
  return {
    template: userConfig.template ?? DefaultConfiguration.template,
    pr_template: userConfig.pr_template ?? DefaultConfiguration.pr_template,
    commit_template: userConfig.commit_template ?? DefaultConfiguration.commit_template,
    empty_template: userConfig.empty_template ?? DefaultConfiguration.empty_template,
    categories: userConfig.categories ?? DefaultConfiguration.categories,
    ignore_labels: userConfig.ignore_labels ?? DefaultConfiguration.ignore_labels,
    ignore_rules: userConfig.ignore_rules ?? DefaultConfiguration.ignore_rules,
    trim_values: userConfig.trim_values ?? DefaultConfiguration.trim_values,
    defaultCategory: userConfig.defaultCategory ?? DefaultConfiguration.defaultCategory
  }
}

/**
 * Resolve configuration from input (JSON string or file path)
 */
export function resolveConfiguration(
  repositoryPath: string,
  configJson?: string,
  configFile?: string
): Configuration {
  // Prefer JSON string over file
  if (configJson) {
    const config = parseConfigurationJson(configJson)
    if (config) {
      core.info('ℹ️ Using configuration from configurationJson input')
      return config
    }
  }

  // Try file path
  if (configFile) {
    const config = loadConfigurationFromFile(repositoryPath, configFile)
    if (config) {
      core.info('ℹ️ Using configuration from configuration file')
      return config
    }
  }

  // Use defaults
  core.info('ℹ️ No configuration provided, using defaults')
  return DefaultConfiguration
}

