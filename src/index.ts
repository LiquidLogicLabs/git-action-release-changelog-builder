import * as core from '@actions/core'
import { Agent, setGlobalDispatcher } from 'undici'
import {BaseProvider} from './providers/base'
import {createProvider} from './providers/factory'
import {detectPlatform, getApiBaseUrl} from './platform'
import { getInputs, resolveConfiguration, resolveVerbose, ParsedInputs } from './config'
import {generateChangelog} from './changelog'
import {detectOwnerRepo} from './context'
import {detectToken} from './token'
import {resolveTags} from './tags'
import {collectPullRequests} from './collector'
import {TagInfo, PullRequestInfo} from './types'
import {Logger} from './logger'
import moment from 'moment'
import * as path from 'path'
import {Configuration} from './types'

/**
 * Main entry point for the action
 * Exported for testing purposes
 */
export async function run(): Promise<void> {
  // Keep these available for graceful error handling
  let resolvedInputs: ParsedInputs | undefined
  let resolvedConfig: Configuration | undefined
  let resolvedPrefixMessage: string | undefined
  let resolvedPostfixMessage: string | undefined

  try {
    const inputs = getInputs()
    resolvedInputs = inputs

    const logger = new Logger(inputs.verbose)
    const skipCertificateCheck = inputs.skipCertificateCheck
    if (skipCertificateCheck) {
      logger.warning('TLS certificate verification is disabled. This is a security risk and should only be used with trusted endpoints.')
      setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }))
    }

    core.setOutput('failed', 'false')

    const platformInput = inputs.platform
    const tokenInput = inputs.token
    const repoInput = inputs.repo
    const fromTagInput = inputs.fromTag
    const toTagInput = inputs.toTag
    const modeInput = inputs.mode
    const configurationJson = inputs.configurationJson
    const configurationFile = inputs.configuration
    const ignorePreReleases = inputs.ignorePreReleases
    const fetchTagAnnotations = inputs.fetchTagAnnotations
    const prefixMessage = inputs.prefixMessage
    const postfixMessage = inputs.postfixMessage
    const includeOpen = inputs.includeOpen
    const failOnError = inputs.failOnError
    const maxTagsToFetch = inputs.maxTagsToFetch

    // Get repository path
    const repositoryPath = process.env.GITHUB_WORKSPACE || process.env.GITEA_WORKSPACE || process.cwd()

    // Detect platform
    const platform = await detectPlatform(platformInput, repositoryPath)
    const baseUrl = getApiBaseUrl(platform)

    // Get token
    const token = detectToken(platform, tokenInput)

    // Get owner and repo - handle both GitHub and Gitea contexts
    const {owner, repo} = await detectOwnerRepo(repoInput, platform, logger)

    logger.info(`ℹ️ Processing ${owner}/${repo} on ${platform}`)
    logger.debug(`Platform: ${platform}, Base URL: ${baseUrl}, Owner: ${owner}, Repo: ${repo}`)

    // Validate mode for local/git platform (COMMIT only)
    if ((platform === 'local' || platform === 'git') && (modeInput === 'PR' || modeInput === 'HYBRID')) {
      throw new Error(`PR and HYBRID modes are not supported for ${platform} platform. Use COMMIT mode instead.`)
    }

    // Initialize provider via factory
    const provider = createProvider(platform, token, baseUrl, repositoryPath)

    // Resolve configuration
    const config = resolveConfiguration(repositoryPath, configurationJson, configurationFile)
    resolvedConfig = config
    resolvedPrefixMessage = prefixMessage || undefined
    resolvedPostfixMessage = postfixMessage || undefined

    // Resolve tags
    const {fromTag, toTag} = await resolveTags(
      provider,
      owner,
      repo,
      repositoryPath,
      fromTagInput,
      toTagInput,
      platform,
      logger,
      maxTagsToFetch
    )

    logger.info(`ℹ️ Comparing ${fromTag.name}...${toTag.name}`)

    // Fetch tag annotation if requested
    let tagAnnotation: string | null = null
    if (fetchTagAnnotations && toTag) {
      tagAnnotation = await provider.getTagAnnotation(toTag.name)
      if (tagAnnotation) {
        logger.info(`ℹ️ Retrieved tag annotation for ${toTag.name}`)
        logger.debug(`Tag annotation: ${tagAnnotation.substring(0, 100)}...`)
        core.setOutput('tagAnnotation', tagAnnotation)
      }
    }

    // Collect pull requests based on mode
    const pullRequests = await collectPullRequests(
      provider,
      owner,
      repo,
      fromTag,
      toTag,
      modeInput,
      includeOpen,
      platform,
      logger
    )

    logger.info(`ℹ️ Found ${pullRequests.length} items to include in changelog`)
    logger.debug(`Mode: ${modeInput}, Pull requests: ${pullRequests.length}`)

    // Generate changelog
    const changelog = generateChangelog(
      pullRequests,
      config,
      tagAnnotation,
      prefixMessage,
      postfixMessage
    )

    // Set outputs
    core.setOutput('changelog', changelog)
    core.setOutput('owner', owner)
    core.setOutput('repo', repo)
    core.setOutput('fromTag', fromTag.name)
    core.setOutput('toTag', toTag.name)

    // Contributors
    const contributors = Array.from(new Set(pullRequests.map(pr => pr.author))).join(', ')
    core.setOutput('contributors', contributors)

    // PR numbers
    const prNumbers = pullRequests
      .filter(pr => pr.number > 0)
      .map(pr => pr.number)
      .join(', ')
    core.setOutput('pullRequests', prNumbers)

    logger.info('✅ Changelog generated successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.setOutput('failed', 'true')
    
    // Create logger even in error case (may not have been created if error occurred early)
    const safeInputs = resolvedInputs ?? (() => {
      try {
        return getInputs()
      } catch {
        return undefined
      }
    })()
    const verbose = safeInputs?.verbose ?? resolveVerbose()
    const logger = new Logger(verbose)
    const failOnError = safeInputs?.failOnError ?? false

    // Graceful fallback: always emit a non-empty changelog output so downstream steps
    // (like release creation) don't end up with an empty body.
    try {
      const cfg = resolvedConfig ?? resolveConfiguration(process.cwd(), safeInputs?.configurationJson, safeInputs?.configuration)
      const isNoTags = /no tags found in repository/i.test(errorMessage)
      const fallback = isNoTags
        ? `⚠️ ${errorMessage}\n\n${cfg.empty_template ?? '- no changes'}`
        : `⚠️ Changelog generation failed: ${errorMessage}`

      // Include prefix/postfix if we have them, and apply the template consistently.
      const fallbackChangelog = generateChangelog(
        [],
        {...cfg, empty_template: fallback},
        null,
        resolvedPrefixMessage,
        resolvedPostfixMessage
      )

      core.setOutput('changelog', fallbackChangelog)
      // These may be unknown in error cases; emit empty values instead of omitting.
      core.setOutput('owner', '')
      core.setOutput('repo', '')
      core.setOutput('fromTag', '')
      core.setOutput('toTag', '')
      core.setOutput('contributors', '')
      core.setOutput('pullRequests', '')
    } catch {
      // If even fallback generation fails, ensure at least changelog is set.
      core.setOutput('changelog', `⚠️ Changelog generation failed: ${errorMessage}`)
    }

    if (failOnError) {
      logger.error(errorMessage)
      core.setFailed(errorMessage)
    } else {
      logger.error(errorMessage)
    }
  }
}

run()

