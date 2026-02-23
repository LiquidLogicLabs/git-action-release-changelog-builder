import moment from 'moment'
import {resolveTags} from '../tags'
import {Logger} from '../logger'
import {CommitInfo, DiffInfo, PullRequestInfo, TagInfo} from '../types'
import {BaseProvider} from '../providers/base'

class MockProvider extends BaseProvider {
  private readonly tags: TagInfo[]
  private readonly latestRelease: string | null

  constructor(tags: TagInfo[], latestRelease: string | null = null) {
    super('token', 'https://example.invalid', process.cwd())
    this.tags = tags
    this.latestRelease = latestRelease
  }

  get defaultUrl(): string {
    return 'https://example.invalid'
  }

  get homeUrl(): string {
    return 'https://example.invalid'
  }

  async getTags(_owner: string, _repo: string, _maxTagsToFetch: number): Promise<TagInfo[]> {
    void _owner; void _repo; void _maxTagsToFetch
    return this.tags
  }

  async fillTagInformation(
    _repositoryPath: string,
    _owner: string,
    _repo: string,
    tagInfo: TagInfo
  ): Promise<TagInfo> {
    return tagInfo
  }

  async getTagAnnotation(_tag: string): Promise<string | null> {
    void _tag
    return null
  }

  async getLatestRelease(_owner: string, _repo: string): Promise<string | null> {
    void _owner; void _repo
    return this.latestRelease
  }

  async getDiffRemote(
    _owner: string,
    _repo: string,
    _base: string,
    _head: string
  ): Promise<DiffInfo> {
    void _owner; void _repo; void _base; void _head
    return {changedFiles: 0, additions: 0, deletions: 0, changes: 0, commits: []}
  }

  async getForCommitHash(
    _owner: string,
    _repo: string,
    _commitSha: string,
    _maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    void _owner; void _repo; void _commitSha; void _maxPullRequests
    return []
  }

  async getBetweenDates(
    _owner: string,
    _repo: string,
    _fromDate: moment.Moment,
    _toDate: moment.Moment,
    _maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    void _owner; void _repo; void _fromDate; void _toDate; void _maxPullRequests
    return []
  }

  async getOpen(_owner: string, _repo: string, _maxPullRequests: number): Promise<PullRequestInfo[]> {
    void _owner; void _repo; void _maxPullRequests
    return []
  }

  async getCommits(
    _owner: string,
    _repo: string,
    _base: string,
    _head: string
  ): Promise<CommitInfo[]> {
    void _owner; void _repo; void _base; void _head
    return []
  }
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const makeTags = (...names: string[]): TagInfo[] =>
  names.map((name, i) => ({name, sha: String(i), date: moment(`2026-01-${String(10 - i).padStart(2, '0')}`)}))

describe('resolveTags', () => {
  const logger = new Logger(false)
  const owner = 'o'
  const repo = 'r'
  const repoPath = process.cwd()

  // ─── toTag resolution ───────────────────────────────────────────────────────

  describe('toTag resolution', () => {
    it('uses latest tag when toTag not provided', async () => {
      const tags = makeTags('v2.0.0', 'v1.0.0')
      const {toTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, undefined, 'gitea', logger, 1000)
      expect(toTag.name).toBe('v2.0.0')
    })

    it('uses latest tag when toTag is blank/whitespace (normalizeOptional already strips it)', async () => {
      const tags = makeTags('v2.0.0', 'v1.0.0')
      const {toTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, '   ', 'gitea', logger, 1000)
      expect(toTag.name).toBe('v2.0.0')
    })

    it('@current resolves to latest tag (auto-detect path)', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {toTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, '@current', 'gitea', logger, 1000)
      expect(toTag.name).toBe('v3.0.0')
    })

    it('@current and undefined produce identical toTag results', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {toTag: a} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, '@current', 'gitea', logger, 1000)
      const {toTag: b} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, undefined, 'gitea', logger, 1000)
      expect(a.name).toBe(b.name)
    })

    it('uses provided toTag when found', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {toTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, 'v2.0.0', 'gitea', logger, 1000)
      expect(toTag.name).toBe('v2.0.0')
    })

    it('falls back to latest tag when provided toTag is not found (graceful degradation)', async () => {
      const tags = makeTags('v2.0.0', 'v1.0.0')
      const {toTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, 'v9.9.9', 'gitea', logger, 1000)
      expect(toTag.name).toBe('v2.0.0')
    })

    it('throws when no tags exist at all', async () => {
      await expect(
        resolveTags(new MockProvider([]), owner, repo, repoPath, undefined, undefined, 'gitea', logger, 1000)
      ).rejects.toThrow('No tags found in repository')
    })
  })

  // ─── fromTag explicit resolution ────────────────────────────────────────────

  describe('fromTag explicit resolution', () => {
    it('uses provided fromTag when found', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, 'v1.0.0', 'v3.0.0', 'gitea', logger, 1000)
      expect(fromTag.name).toBe('v1.0.0')
    })

    it('throws when explicit fromTag is not found (asymmetric with toTag fallback)', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      await expect(
        resolveTags(new MockProvider(tags), owner, repo, repoPath, 'v0.0.0', 'v3.0.0', 'gitea', logger, 1000)
      ).rejects.toThrow("Tag 'v0.0.0' not found")
    })
  })

  // ─── fromTag auto-detect ────────────────────────────────────────────────────

  describe('fromTag auto-detect', () => {
    it('auto-detects fromTag as the tag immediately before toTag', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, 'v3.0.0', 'gitea', logger, 1000)
      expect(fromTag.name).toBe('v2.0.0')
    })

    it('auto-detects fromTag correctly when both tags are auto-detected', async () => {
      // toTag = v3.0.0 (latest), fromTag = v2.0.0 (previous)
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag, toTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, undefined, 'gitea', logger, 1000)
      expect(toTag.name).toBe('v3.0.0')
      expect(fromTag.name).toBe('v2.0.0')
    })

    it('throws when only one tag exists and fromTag must be auto-detected', async () => {
      const tags = makeTags('v1.0.0')
      await expect(
        resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, undefined, 'gitea', logger, 1000)
      ).rejects.toThrow('Could not determine fromTag')
    })

    it('throws when toTag is the oldest tag (no predecessor)', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      await expect(
        resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, 'v1.0.0', 'gitea', logger, 1000)
      ).rejects.toThrow('Could not determine fromTag')
    })
  })

  // ─── Offset: "-N" ───────────────────────────────────────────────────────────

  describe('fromTag offset (-N)', () => {
    it('"-1" resolves to the same tag as auto-detect default', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag: offset} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, '-1', 'v3.0.0', 'gitea', logger, 1000)
      const {fromTag: auto} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, undefined, 'v3.0.0', 'gitea', logger, 1000)
      expect(offset.name).toBe(auto.name)
      expect(offset.name).toBe('v2.0.0')
    })

    it('"-2" resolves to two tags before toTag', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, '-2', 'v3.0.0', 'gitea', logger, 1000)
      expect(fromTag.name).toBe('v1.0.0')
    })

    it('offset exactly at the last available tag succeeds (boundary)', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      // toTag = v3.0.0 (index 0), offset -2 → index 2 = v1.0.0 (last)
      const {fromTag} = await resolveTags(new MockProvider(tags), owner, repo, repoPath, '-2', 'v3.0.0', 'gitea', logger, 1000)
      expect(fromTag.name).toBe('v1.0.0')
    })

    it('offset one past last available tag throws with descriptive message', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      // toTag = v3.0.0 (index 0), -3 → index 3 = out of range (only 2 tags before toTag)
      await expect(
        resolveTags(new MockProvider(tags), owner, repo, repoPath, '-3', 'v3.0.0', 'gitea', logger, 1000)
      ).rejects.toThrow('Offset -3 is out of range')
    })

    it('"-0" is treated as a literal tag name (not a valid offset), throws not-found', async () => {
      const tags = makeTags('v2.0.0', 'v1.0.0')
      await expect(
        resolveTags(new MockProvider(tags), owner, repo, repoPath, '-0', 'v2.0.0', 'gitea', logger, 1000)
      ).rejects.toThrow("Tag '-0' not found")
    })

    it('"-abc" is treated as a literal tag name, throws not-found', async () => {
      const tags = makeTags('v2.0.0', 'v1.0.0')
      await expect(
        resolveTags(new MockProvider(tags), owner, repo, repoPath, '-abc', 'v2.0.0', 'gitea', logger, 1000)
      ).rejects.toThrow("Tag '-abc' not found")
    })
  })

  // ─── @latest-release ────────────────────────────────────────────────────────

  describe('fromTag @latest-release', () => {
    it('resolves to the latest release tag when it exists and differs from toTag', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag} = await resolveTags(
        new MockProvider(tags, 'v2.0.0'), owner, repo, repoPath, '@latest-release', 'v3.0.0', 'gitea', logger, 1000
      )
      expect(fromTag.name).toBe('v2.0.0')
    })

    it('falls back to previous tag when getLatestRelease returns null (e.g. local git)', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      const {fromTag} = await resolveTags(
        new MockProvider(tags, null), owner, repo, repoPath, '@latest-release', 'v3.0.0', 'gitea', logger, 1000
      )
      // Falls back to auto-detect: previous tag before toTag
      expect(fromTag.name).toBe('v2.0.0')
    })

    it('falls back to previous tag when latest release tag is not found in allTags', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      // Release tag 'v9.9.9' does not exist in the repo tags
      const {fromTag} = await resolveTags(
        new MockProvider(tags, 'v9.9.9'), owner, repo, repoPath, '@latest-release', 'v3.0.0', 'gitea', logger, 1000
      )
      expect(fromTag.name).toBe('v2.0.0')
    })

    it('falls back to previous tag when latest release tag equals toTag', async () => {
      const tags = makeTags('v3.0.0', 'v2.0.0', 'v1.0.0')
      // Release tag matches toTag → same-tag edge case
      const {fromTag} = await resolveTags(
        new MockProvider(tags, 'v3.0.0'), owner, repo, repoPath, '@latest-release', 'v3.0.0', 'gitea', logger, 1000
      )
      expect(fromTag.name).toBe('v2.0.0')
    })

    it('uses non-adjacent release tag (skips intermediate tags)', async () => {
      const tags = makeTags('v5.0.0', 'v4.0.0', 'v3.0.0', 'v2.0.0', 'v1.0.0')
      // Latest release is v2.0.0 (several tags back)
      const {fromTag} = await resolveTags(
        new MockProvider(tags, 'v2.0.0'), owner, repo, repoPath, '@latest-release', 'v5.0.0', 'gitea', logger, 1000
      )
      expect(fromTag.name).toBe('v2.0.0')
    })
  })
})

