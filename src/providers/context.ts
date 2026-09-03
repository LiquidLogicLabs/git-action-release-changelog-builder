import * as github from '@actions/github'
import {ProviderPlatform} from '../types'

/** Ref from the CI context. Only GitHub exposes one this way. */
export function getContextRef(platform: ProviderPlatform): string | undefined {
  if (platform !== 'github') return undefined
  try {
    return github.context.ref
  } catch {
    return undefined
  }
}

/** owner/repo from the CI context. Only GitHub exposes one this way. */
export function getContextRepo(platform: ProviderPlatform): {owner: string; repo: string} | undefined {
  if (platform !== 'github') return undefined
  try {
    const r = github.context.repo
    return r?.owner && r?.repo ? {owner: r.owner, repo: r.repo} : undefined
  } catch {
    return undefined
  }
}
