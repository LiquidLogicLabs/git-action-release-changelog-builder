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
export declare const UPSTREAM_OUTPUT_ALIASES: Readonly<Record<string, string>>;
/**
 * Publish an output under this action's canonical name and, where upstream
 * spells it differently, under that name too.
 */
export declare function setOutput(name: string, value: string): void;
