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
export declare function resolveVerbose(): boolean;
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
//# sourceMappingURL=config.d.ts.map