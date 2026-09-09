import { ActionInputs, Configuration } from './types';
/**
 * Default configuration
 */
export declare const DefaultConfiguration: Configuration;
export type ParsedInputs = ActionInputs & {
    mode: 'PR' | 'COMMIT' | 'HYBRID';
    ignorePreReleases: boolean;
    fetchTagAnnotations: boolean;
    includeOpen: boolean;
    failOnError: boolean;
    maxTagsToFetch: number;
    skipCertificateCheck: boolean;
    verbose: boolean;
};
export declare function resolveDebugMode(): boolean;
export declare function resolveVerbose(): boolean;
/**
 * Input names accepted from mikepenz/release-changelog-builder-action, mapped
 * to this action's canonical kebab-case names.
 *
 * That action is GitHub-only, so on Gitea this one is the only option and a
 * workflow moving across should not have to rewrite its inputs. The failure
 * this prevents is silent: an unrecognised input is simply ignored, which is
 * how `configurationJson` once discarded an entire configuration -- template
 * and all -- from this repository's own release workflow, unnoticed for
 * several releases.
 *
 * Accepting a name is only half of it. Every alias here must also be declared
 * in action.yml, and a test enforces both directions: an alias honoured in
 * code but undeclared, or declared but not honoured, fails the build.
 */
export declare const UPSTREAM_INPUT_ALIASES: Readonly<Record<string, string>>;
/**
 * Declared defaults for the canonical inputs that have one, from action.yml.
 *
 * A default is materialised into INPUT_* exactly like a user-supplied value,
 * so `core.getInput` cannot tell them apart. Without this, an input carrying a
 * default always looks "explicitly set", every alias for it looks like a
 * conflict, and the compatibility is unusable for precisely the inputs most
 * likely to be aliased. A test asserts this map still matches action.yml.
 */
export declare const CANONICAL_DEFAULTS: Readonly<Record<string, string>>;
export declare function getInputs(): ParsedInputs;
/**
 * Parse configuration from JSON string
 */
export declare function parseConfigurationJson(configJson: string): Configuration | null;
/**
 * Load configuration from file
 */
export declare function loadConfigurationFromFile(repositoryPath: string, configPath: string): Configuration | null;
/**
 * Resolve configuration from input (JSON string or file path)
 */
export declare function resolveConfiguration(repositoryPath: string, configJson?: string, configFile?: string): Configuration;
