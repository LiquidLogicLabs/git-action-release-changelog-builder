import * as exec from '@actions/exec'
import * as core from '@actions/core'

/**
 * Reject a value git would read as an option rather than as data.
 *
 * An argv array stops the SHELL interpreting a value; it does nothing about git's own
 * option parser, which reads a leading "-" as an option wherever it appears. Some of those
 * options execute commands. Verified against real git:
 *
 *   git push origin --delete '--receive-pack=touch /tmp/PWNED' v9   ->  the file is created
 *
 * (The trailing real ref is required: without it git aborts with "--delete doesn't make
 * sense without any refs" and nothing runs.)
 *
 * This action never pushes, but it does hand tag names to `git tag -l`, `git rev-list`,
 * `git cat-file` and the `<base>..<head>` range given to `git log` / `git diff`, and those
 * commands have their own dangerous options -- `git diff --output=<file>` alone is an
 * arbitrary file write.
 */
export function assertNotOptionLike(value: string | undefined, label: string): void {
  if (value !== undefined && value.startsWith('-')) {
    throw new Error(
      `Refusing to pass a ${label} beginning with "-" to git: ${JSON.stringify(value)}. ` +
        'git would read it as an option, and options such as --upload-pack/--receive-pack execute commands.'
    )
  }
}

/**
 * Reject a value git would read as a REFSPEC rather than as a ref.
 *
 * Distinct from the option check and not covered by it. `+` is the force prefix and `:`
 * separates source from destination, so `git push origin '+main'` force-updates the remote
 * BRANCH. `git check-ref-format` accepts `refs/tags/+main` and `git tag` creates it, so the
 * value passes every other check -- verified against real git, the remote branch moved to
 * the local HEAD.
 */
export function assertNotRefspecLike(value: string, label: string): void {
  if (value.startsWith('+') || value.includes(':')) {
    throw new Error(
      `Refusing to pass a ${label} that git would read as a refspec: ${JSON.stringify(value)}. ` +
        '"+" forces and ":" separates source from destination, so this could update a branch instead of a tag.'
    )
  }
}

/**
 * Both checks, for a value that is about to become an argv entry naming a ref.
 */
export function assertSafeGitRef(value: string, label: string): void {
  assertNotOptionLike(value, label)
  assertNotRefspecLike(value, label)
}

/**
 * Non-throwing form of {@link assertSafeGitRef}, derived from the same guards so the two
 * cannot drift. Used where a hostile value should be skipped rather than abort the batch --
 * e.g. one bad tag name read out of `git tag --list` must not discard every other tag.
 */
export function isSafeGitRef(value: string): boolean {
  try {
    assertSafeGitRef(value, 'ref')
    return true
  } catch {
    return false
  }
}

/**
 * Execute a git command and return the output
 */
async function execGit(
  repositoryPath: string,
  args: string[],
  silent: boolean = false
): Promise<string> {
  let output = ''
  let errorOutput = ''

  const options: exec.ExecOptions = {
    cwd: repositoryPath,
    silent: silent,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
      stderr: (data: Buffer) => {
        errorOutput += data.toString()
      }
    }
  }

  try {
    await exec.exec('git', args, options)
    return output.trim()
  } catch (error) {
    if (errorOutput) {
      core.debug(`Git command error: ${errorOutput}`)
    }
    throw error
  }
}

/**
 * Get tag annotation message using git command
 * @param repositoryPath Path to the repository
 * @param tag Tag name
 * @returns Tag annotation message or null if tag doesn't exist or isn't annotated
 */
export async function getTagAnnotation(repositoryPath: string, tag: string): Promise<string | null> {
  // Outside the try on purpose: a hostile tag name must surface as a refusal, not be
  // swallowed into the "no annotation" return below.
  assertSafeGitRef(tag, 'tag name')

  try {
    // Try to get annotated tag message
    // git tag -l -n999 <tag> will show the annotation if it exists
    const output = await execGit(repositoryPath, ['tag', '-l', '-n999', tag], true)
    
    if (!output) {
      // Tag doesn't exist
      return null
    }

    // Parse the output: format is "tag-name    annotation message"
    // If it's an annotated tag, it will have the message after the tag name
    // If it's a lightweight tag, it will just be the tag name
    const lines = output.split('\n')
    const firstLine = lines[0] || ''
    
    // Extract annotation message (everything after the tag name and whitespace)
    const match = firstLine.match(new RegExp(`^${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(.+)$`))
    
    if (match && match[1]) {
      return match[1].trim()
    }

    // Alternative: try git cat-file to get annotated tag object
    try {
      const catOutput = await execGit(
        repositoryPath,
        ['cat-file', '-p', `refs/tags/${tag}`],
        true
      )
      
      // Parse annotated tag format
      // Annotated tags have a format like:
      // object <sha>
      // type commit
      // tag <tag-name>
      // tagger <author> <date>
      // <blank line>
      // <annotation message>
      const catLines = catOutput.split('\n')
      let inMessage = false
      let messageLines: string[] = []
      
      for (const line of catLines) {
        if (inMessage) {
          messageLines.push(line)
        } else if (line.trim() === '') {
          // Empty line signals start of message
          inMessage = true
        }
      }
      
      if (messageLines.length > 0) {
        return messageLines.join('\n').trim()
      }
    } catch {
      // Not an annotated tag or error reading, fall through
    }

    // Lightweight tag - no annotation
    return null
  } catch (error) {
    core.debug(`Failed to get tag annotation for ${tag}: ${error}`)
    return null
  }
}

/**
 * Check if a tag exists
 */
export async function tagExists(repositoryPath: string, tag: string): Promise<boolean> {
  // Outside the try on purpose: a refusal must not be reported as "tag does not exist".
  assertSafeGitRef(tag, 'tag name')

  try {
    const output = await execGit(repositoryPath, ['tag', '-l', tag], true)
    return output.trim() === tag
  } catch {
    return false
  }
}

/**
 * Get the commit SHA that a tag points to
 */
export async function getTagCommit(repositoryPath: string, tag: string): Promise<string | null> {
  // Outside the try on purpose: a refusal must not be reported as "no such tag".
  assertSafeGitRef(tag, 'tag name')

  try {
    return await execGit(repositoryPath, ['rev-list', '-n', '1', tag], true)
  } catch {
    return null
  }
}

