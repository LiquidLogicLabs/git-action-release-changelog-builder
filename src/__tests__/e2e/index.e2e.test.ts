/**
 * E2E Tests for release-changelog-builder-action
 *
 * These tests run against real GitHub/Gitea APIs to verify the full action flow.
 * They gracefully skip if test repositories/tokens are not configured.
 */

import * as core from '@actions/core'
import {run} from '../../index'

// Mock @actions/core to capture outputs
jest.mock('@actions/core', () => ({
  getBooleanInput: jest.fn((name: string) => name === 'verbose'),
  getInput: jest.fn((name: string) => {
    // Return empty strings for inputs not provided
    return ''
  }),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setSecret: jest.fn(),
}))

// Mock @actions/github
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo',
    },
    ref: 'refs/tags/v1.0.0',
  },
}))

describe('E2E Tests', () => {
  const originalEnv = process.env
  const mockGetInput = core.getInput as jest.Mock
  const mockSetOutput = core.setOutput as jest.Mock
  const mockSetFailed = core.setFailed as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {...originalEnv}
    mockGetInput.mockImplementation((name: string) => {
      if (name === 'verbose') return 'false'
      if (name === 'mode') return 'PR'
      return ''
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('GitHub E2E Tests', () => {
    const testRepo = process.env.TEST_GITHUB_REPO || 'LiquidLogicLabs/git-action-release-tests'
    const githubToken = process.env.GITHUB_TOKEN || process.env.TEST_GITHUB_TOKEN

    beforeAll(() => {
      if (!githubToken) {
        throw new Error('GITHUB_TOKEN or TEST_GITHUB_TOKEN required for e2e')
      }
    })

    it('should generate changelog from GitHub repository', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITHUB_REPOSITORY = testRepo
      process.env.GITHUB_TOKEN = githubToken

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return githubToken || ''
        if (name === 'owner') return owner
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'from-tag') return 'v0.1.0'
        if (name === 'to-tag') return 'v0.1.1'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockSetOutput).toHaveBeenCalledWith('failed', 'false')
      expect(mockSetOutput).toHaveBeenCalledWith(
        'changelog',
        expect.stringContaining('#')
      )
    }, 30000)

    it('should fail when from-tag does not exist', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITHUB_REPOSITORY = testRepo
      process.env.GITHUB_TOKEN = githubToken

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return githubToken || ''
        if (name === 'owner') return owner
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'from-tag') return 'v999.999.999' // Non-existent from-tag → should throw
        if (name === 'to-tag') return 'v0.1.1'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      // An explicit from-tag that doesn't exist is a hard error
      expect(mockSetFailed).toHaveBeenCalled()
    }, 30000)

    it('should resolve to-tag: @current and produce a changelog', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITHUB_REPOSITORY = testRepo
      process.env.GITHUB_TOKEN = githubToken

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return githubToken || ''
        if (name === 'owner') return owner
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'to-tag') return '@current'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockSetOutput).toHaveBeenCalledWith('failed', 'false')
      // to-tag output should be a non-empty tag name
      const toTagCall = mockSetOutput.mock.calls.find(([k]: [string]) => k === 'to-tag')
      expect(toTagCall).toBeDefined()
      expect(toTagCall![1]).toBeTruthy()
    }, 30000)

    it('should resolve from-tag: -1 relative to an explicit to-tag', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITHUB_REPOSITORY = testRepo
      process.env.GITHUB_TOKEN = githubToken

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return githubToken || ''
        if (name === 'owner') return owner
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'from-tag') return '-1'
        if (name === 'to-tag') return 'v0.1.1'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockSetOutput).toHaveBeenCalledWith('failed', 'false')
      // offset -1 from v0.1.1 should resolve to v0.1.0
      expect(mockSetOutput).toHaveBeenCalledWith('from-tag', 'v0.1.0')
    }, 30000)

    it('should resolve from-tag: @latest-release to a non-empty tag different from to-tag', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITHUB_REPOSITORY = testRepo
      process.env.GITHUB_TOKEN = githubToken

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return githubToken || ''
        if (name === 'owner') return owner
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'from-tag') return '@latest-release'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockSetOutput).toHaveBeenCalledWith('failed', 'false')
      const fromTagCall = mockSetOutput.mock.calls.find(([k]: [string]) => k === 'from-tag')
      const toTagCall = mockSetOutput.mock.calls.find(([k]: [string]) => k === 'to-tag')
      expect(fromTagCall![1]).toBeTruthy()
      expect(fromTagCall![1]).not.toBe(toTagCall![1])
    }, 30000)
  })

  describe('Gitea E2E Tests', () => {
    const testRepo = process.env.TEST_GITEA_REPO || ''
    const giteaToken = process.env.GITEA_TOKEN || process.env.TEST_GITEA_TOKEN
    const giteaUrl = process.env.TEST_GITEA_URL || ''

    beforeAll(() => {
      if (!testRepo || !giteaToken || !giteaUrl) {
        throw new Error('TEST_GITEA_REPO, TEST_GITEA_TOKEN, and TEST_GITEA_URL required for e2e')
      }
    })

    it('should generate changelog from Gitea repository', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITEA_REPOSITORY = testRepo
      process.env.GITEA_TOKEN = giteaToken
      process.env.GITEA_SERVER_URL = giteaUrl

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return giteaToken || ''
        if (name === 'platform') return 'gitea'
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'from-tag') return 'v1.0.0'
        if (name === 'to-tag') return 'v1.1.0'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockSetOutput).toHaveBeenCalledWith('failed', 'false')
      expect(mockSetOutput).toHaveBeenCalledWith(
        'changelog',
        expect.any(String)
      )
    }, 30000)

    it('should resolve from-tag: -1 relative to explicit to-tag on Gitea', async () => {
      const [owner, repo] = testRepo.split('/')
      process.env.GITEA_REPOSITORY = testRepo
      process.env.GITEA_TOKEN = giteaToken
      process.env.GITEA_SERVER_URL = giteaUrl

      mockGetInput.mockImplementation((name: string) => {
        if (name === 'token') return giteaToken || ''
        if (name === 'platform') return 'gitea'
        if (name === 'owner') return owner
        if (name === 'repo') return repo
        if (name === 'mode') return 'PR'
        if (name === 'from-tag') return '-1'
        if (name === 'to-tag') return 'v1.1.0'
        if (name === 'verbose') return 'false'
        return ''
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockSetOutput).toHaveBeenCalledWith('failed', 'false')
      // offset -1 from v1.1.0 should resolve to v1.0.0
      expect(mockSetOutput).toHaveBeenCalledWith('from-tag', 'v1.0.0')
    }, 30000)
  })
})
