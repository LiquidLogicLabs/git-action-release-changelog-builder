import * as exec from '@actions/exec'
import { getTagAnnotation, getTagCommit, tagExists } from '../git'
import { GitProvider } from '../providers/git'
import { GiteaProvider } from '../providers/gitea'
import { TagInfo } from '../types'

jest.mock('@actions/exec')

/**
 * Two distinct attacks, both reachable through the tag names this action puts on a git
 * command line (`from-tag` / `to-tag`, and tag names read back out of the repository).
 *
 * 1. OPTION injection. Passing an argv array stops the SHELL interpreting a value; it does
 *    nothing about git's own option parser, which reads a leading "-" as an option wherever
 *    it appears. Some of those options run commands. Reproduced against real git:
 *
 *      git push origin --delete '--receive-pack=touch /tmp/PWNED' v9   -> the file is created
 *
 *    The same parser is in play here: this action builds `${base}..${head}` and passes tag
 *    names straight to `git tag -l`, `git log`, `git diff` and `git rev-list`, so a value
 *    beginning with "-" is read as an option to those commands (`git diff --output=<file>`
 *    alone is an arbitrary file write).
 *
 * 2. REFSPEC injection. `+` is the force prefix and `:` separates source from destination,
 *    so `git push origin '+main'` force-updates the remote BRANCH. `git check-ref-format`
 *    accepts `refs/tags/+main`, so a leading-"-" guard alone does not stop it.
 *
 * `git check-ref-format` accepts every payload below, and the tag names come from a
 * consuming workflow's inputs and from repository contents, so they are attacker-influenced.
 *
 * GithubProvider is not exercised here: importing it pulls in @octokit/rest, which is ESM-only
 * and deliberately excluded from Jest's transform (see jest.config.js transformIgnorePatterns).
 * Its only externally-supplied value that reaches argv is the tag name it hands to the shared
 * getTagAnnotation() in src/git.ts, which is covered directly above.
 */
const optionLike = ['--receive-pack=touch /tmp/pwned', '--upload-pack=id', '-v1.0.0']
const refspecLike = ['+v1.0.0', 'v1:refs/heads/main']
const hostile = [...optionLike, ...refspecLike]

const REPO = '/tmp/repo'

function tagInfo(name: string): TagInfo {
  return { name, sha: 'abc123', date: undefined }
}

describe('argument injection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(exec.exec as jest.Mock).mockResolvedValue(0)
  })

  describe.each(hostile)('value %s', (payload) => {
    it('is refused by getTagAnnotation', async () => {
      await expect(getTagAnnotation(REPO, payload)).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by tagExists', async () => {
      await expect(tagExists(REPO, payload)).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by getTagCommit', async () => {
      await expect(getTagCommit(REPO, payload)).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GitProvider.getTagAnnotation', async () => {
      await expect(new GitProvider(REPO).getTagAnnotation(payload)).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GitProvider.getCommits as the base ref', async () => {
      await expect(new GitProvider(REPO).getCommits('o', 'r', payload, 'v2')).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GitProvider.getCommits as the head ref', async () => {
      await expect(new GitProvider(REPO).getCommits('o', 'r', 'v1', payload)).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GitProvider.getDiffRemote', async () => {
      await expect(new GitProvider(REPO).getDiffRemote('o', 'r', payload, 'v2')).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GitProvider.fillTagInformation', async () => {
      await expect(
        new GitProvider(REPO).fillTagInformation(REPO, 'o', 'r', tagInfo(payload))
      ).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GiteaProvider.getTagAnnotation', async () => {
      await expect(
        new GiteaProvider('t', 'https://gitea.example', REPO).getTagAnnotation(payload)
      ).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GiteaProvider.getCommits', async () => {
      await expect(
        new GiteaProvider('t', 'https://gitea.example', REPO).getCommits('o', 'r', payload, 'v2')
      ).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })

    it('is refused by GiteaProvider.getDiffRemote', async () => {
      await expect(
        new GiteaProvider('t', 'https://gitea.example', REPO).getDiffRemote('o', 'r', 'v1', payload)
      ).rejects.toThrow()
      expect(exec.exec).not.toHaveBeenCalled()
    })
  })

  /**
   * Scope attack, not rule attack: the guards above only help if the tag names the action
   * reads back out of `git tag --list` are checked too. A tag created upstream can carry a
   * leading "-", and GitProvider.getTags feeds every listed name straight into
   * `git rev-list`.
   */
  it('drops a hostile tag name read back from the repository, and keeps the rest', async () => {
    ;(exec.exec as jest.Mock).mockImplementation(
      async (_cmd: string, args: string[], options: exec.ExecOptions) => {
        const stdout = options?.listeners?.stdout
        if (args[0] === 'tag') {
          stdout?.(Buffer.from('--upload-pack=id\nv1.0.0\n'))
        } else {
          stdout?.(Buffer.from('abc123\n'))
        }
        return 0
      }
    )

    const tags = await new GitProvider(REPO).getTags('o', 'r', 10)

    expect(tags.map((t) => t.name)).toEqual(['v1.0.0'])
    const revListArgs = (exec.exec as jest.Mock).mock.calls
      .map((call) => call[1] as string[])
      .filter((args) => args[0] === 'rev-list')
    expect(revListArgs.every((args) => !args.includes('--upload-pack=id'))).toBe(true)
  })

  it('still passes ordinary tag names through to git', async () => {
    await expect(getTagCommit(REPO, 'v1.2.3')).resolves.not.toThrow()
    expect(exec.exec).toHaveBeenCalledWith(
      'git',
      ['rev-list', '-n', '1', 'v1.2.3'],
      expect.anything()
    )
  })
})
