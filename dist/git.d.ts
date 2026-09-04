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
export declare function assertNotOptionLike(value: string | undefined, label: string): void;
/**
 * Reject a value git would read as a REFSPEC rather than as a ref.
 *
 * Distinct from the option check and not covered by it. `+` is the force prefix and `:`
 * separates source from destination, so `git push origin '+main'` force-updates the remote
 * BRANCH. `git check-ref-format` accepts `refs/tags/+main` and `git tag` creates it, so the
 * value passes every other check -- verified against real git, the remote branch moved to
 * the local HEAD.
 */
export declare function assertNotRefspecLike(value: string, label: string): void;
/**
 * Both checks, for a value that is about to become an argv entry naming a ref.
 */
export declare function assertSafeGitRef(value: string, label: string): void;
/**
 * Non-throwing form of {@link assertSafeGitRef}, derived from the same guards so the two
 * cannot drift. Used where a hostile value should be skipped rather than abort the batch --
 * e.g. one bad tag name read out of `git tag --list` must not discard every other tag.
 */
export declare function isSafeGitRef(value: string): boolean;
/**
 * Get tag annotation message using git command
 * @param repositoryPath Path to the repository
 * @param tag Tag name
 * @returns Tag annotation message or null if tag doesn't exist or isn't annotated
 */
export declare function getTagAnnotation(repositoryPath: string, tag: string): Promise<string | null>;
/**
 * Check if a tag exists
 */
export declare function tagExists(repositoryPath: string, tag: string): Promise<boolean>;
/**
 * Get the commit SHA that a tag points to
 */
export declare function getTagCommit(repositoryPath: string, tag: string): Promise<string | null>;
