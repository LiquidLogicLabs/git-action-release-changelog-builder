import {ProviderPlatform} from '../types'

/**
 * Loads providers/context fresh so that @actions/github's Context is constructed
 * against the env vars set by the caller. `context.ref` is a constructor-time
 * field, so the module must be re-required after the env is arranged.
 */
function loadHelpers(env: Record<string, string | undefined>) {
  let helpers!: typeof import('../providers/context')
  jest.isolateModules(() => {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
    helpers = jest.requireActual('../providers/context')
  })
  return helpers
}

const NON_GITHUB: ProviderPlatform[] = ['gitea', 'local', 'git']

describe('provider context helpers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {...originalEnv}
  })

  afterAll(() => {
    process.env = originalEnv
  })

  // Positive control. Without a populated CI context the negative assertions
  // below would pass even with the platform gate removed.
  it('reads ref and owner/repo from the CI context for github', () => {
    const {getContextRef, getContextRepo} = loadHelpers({
      GITHUB_REF: 'refs/tags/v1.2.3',
      GITHUB_REPOSITORY: 'ctx-owner/ctx-repo',
      GITHUB_EVENT_PATH: undefined
    })

    expect(getContextRef('github')).toBe('refs/tags/v1.2.3')
    expect(getContextRepo('github')).toEqual({owner: 'ctx-owner', repo: 'ctx-repo'})
  })

  it('returns undefined for non-github platforms even when the CI context is populated', () => {
    const {getContextRef, getContextRepo} = loadHelpers({
      GITHUB_REF: 'refs/tags/v1.2.3',
      GITHUB_REPOSITORY: 'ctx-owner/ctx-repo',
      GITHUB_EVENT_PATH: undefined
    })

    for (const platform of NON_GITHUB) {
      expect(getContextRef(platform)).toBeUndefined()
      expect(getContextRepo(platform)).toBeUndefined()
    }
  })

  it('returns undefined for github when the context has no repository', () => {
    const {getContextRepo} = loadHelpers({
      GITHUB_REF: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_EVENT_PATH: undefined
    })

    expect(getContextRepo('github')).toBeUndefined()
  })
})
