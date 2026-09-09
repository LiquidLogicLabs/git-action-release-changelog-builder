import * as core from '@actions/core'

/**
 * Output names that mikepenz/release-changelog-builder-action publishes under
 * a different spelling. Anything not listed here already shares its name with
 * upstream (`changelog`, `owner`, `repo`, `contributors`, `failed`).
 *
 * Outputs matter more than inputs for compatibility, and fail more quietly: a
 * consumer reading `steps.x.outputs.pull_requests` from an action that does
 * not publish it receives an empty string, not an error, so the workflow
 * carries on with nothing and nobody is told.
 */
export const UPSTREAM_OUTPUT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'from-tag': 'fromTag',
  'to-tag': 'toTag',
  'pull-requests': 'pull_requests'
})

/**
 * Publish an output under this action's canonical name and, where upstream
 * spells it differently, under that name too.
 */
export function setOutput(name: string, value: string): void {
  core.setOutput(name, value)
  const alias = UPSTREAM_OUTPUT_ALIASES[name]
  if (alias) {
    core.setOutput(alias, value)
  }
}
