import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { ActionInputs, Configuration, Category } from './types'

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

export function resolveVerbose(): boolean {
  const verboseInput = core.getBooleanInput('verbose')
  const envStepDebug = (process.env.ACTIONS_STEP_DEBUG || '').toLowerCase()
  const stepDebugEnabled = core.isDebug() || envStepDebug === 'true' || envStepDebug === '1'
  return verboseInput || stepDebugEnabled
}

export function getInputs(): ParsedInputs {
  const platform = parsePlatform(normalizeOptional(core.getInput('platform') || ''))
  const token = normalizeOptional(core.getInput('token') || '')
  const repo = normalizeOptional(core.getInput('repo') || '')
  const fromTag = normalizeOptional(core.getInput('fromTag') || '')
  const toTag = normalizeOptional(core.getInput('toTag') || '')
  const mode = parseMode(core.getInput('mode') || 'PR')
  const configurationJson = normalizeOptional(core.getInput('configurationJson') || '')
  const configuration = normalizeOptional(core.getInput('configuration') || '')
  const ignorePreReleases = core.getBooleanInput('ignorePreReleases')
  const fetchTagAnnotations = core.getBooleanInput('fetchTagAnnotations')
  const prefixMessage = normalizeOptional(core.getInput('prefixMessage') || '')
  const postfixMessage = normalizeOptional(core.getInput('postfixMessage') || '')
  const includeOpen = core.getBooleanInput('includeOpen')
  const failOnError = core.getBooleanInput('failOnError')
  const maxTagsToFetchRaw = normalizeOptional(core.getInput('maxTagsToFetch') || '')
  const maxTagsToFetch = maxTagsToFetchRaw ? parseInt(maxTagsToFetchRaw, 10) : 1000

  if (maxTagsToFetchRaw && Number.isNaN(maxTagsToFetch)) {
    throw new Error(`Invalid maxTagsToFetch: ${maxTagsToFetchRaw}. Must be a number.`)
  }

  const skipCertificateCheck = core.getBooleanInput('skipCertificateCheck')
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

