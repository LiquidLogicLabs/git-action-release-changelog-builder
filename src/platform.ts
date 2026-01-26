import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { createByName, detectPlatform as detectSharedPlatform, getBuiltInProviders } from 'git-platform-detector'
import {ProviderPlatform} from './types'

/**
 * Check if a path is a valid local git repository
 */
function isLocalGitRepo(repositoryPath: string): boolean {
  try {
    const gitDir = path.join(repositoryPath, '.git')
    // Check if .git directory exists or if repositoryPath itself is .git
    return fs.existsSync(gitDir) || (fs.existsSync(repositoryPath) && repositoryPath.endsWith('.git'))
  } catch {
    return false
  }
}

/**
 * Detect the platform from environment variables or input
 */
export async function detectPlatform(inputPlatform?: string, repositoryPath?: string): Promise<ProviderPlatform> {
  // If explicitly provided, use it
  if (inputPlatform) {
    if (inputPlatform === 'local' || inputPlatform === 'git') {
      return inputPlatform
    }
    createByName(inputPlatform, { providers: getBuiltInProviders() })
    if (inputPlatform === 'github' || inputPlatform === 'gitea') {
      return inputPlatform
    }
    throw new Error(`Unsupported platform: ${inputPlatform}. Supported platforms: github, gitea, local, git`)
  }

  // Check for local git repository (if no tokens available and repositoryPath is blank/./relative)
  const repoPath = repositoryPath || process.env.GITHUB_WORKSPACE || process.env.GITEA_WORKSPACE || process.cwd()
  const isBlankOrRelative = !repoPath || repoPath === '.' || repoPath === './' || !path.isAbsolute(repoPath)
  const hasNoTokens = !process.env.GITHUB_TOKEN && !process.env.GITEA_TOKEN
  
  if (hasNoTokens && isBlankOrRelative && isLocalGitRepo(repoPath)) {
    core.info(`ℹ️ Detected local git repository (no tokens available, repository path is blank/./relative)`)
    return 'git'
  }

  const detection = await detectSharedPlatform({
    providers: getBuiltInProviders(),
    env: process.env
  })

  if (detection.providerId === 'gitea') {
    core.info(`ℹ️ Detected Gitea platform from environment`)
    return 'gitea'
  }
  if (detection.providerId === 'github') {
    core.info(`ℹ️ Detected GitHub platform from environment`)
    return 'github'
  }

  core.info(`ℹ️ No platform detected from environment, defaulting to GitHub`)
  return 'github'
}

/**
 * Get the appropriate API base URL for the platform
 */
export function getApiBaseUrl(platform: ProviderPlatform, inputBaseUrl?: string): string {
  if (inputBaseUrl) {
    return inputBaseUrl
  }

  switch (platform) {
    case 'gitea':
      return process.env.GITEA_SERVER_URL || 'https://gitea.com'
    case 'github':
      return process.env.GITHUB_API_URL || process.env.GITHUB_SERVER_URL || 'https://api.github.com'
    case 'local':
    case 'git':
      return '' // Local/git platform doesn't use API URLs
    default:
      return 'https://api.github.com'
  }
}

