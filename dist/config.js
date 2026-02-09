"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultConfiguration = void 0;
exports.resolveDebugMode = resolveDebugMode;
exports.resolveVerbose = resolveVerbose;
exports.getInputs = getInputs;
exports.parseConfigurationJson = parseConfigurationJson;
exports.loadConfigurationFromFile = loadConfigurationFromFile;
exports.resolveConfiguration = resolveConfiguration;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Default configuration
 */
exports.DefaultConfiguration = {
    template: '#{{CHANGELOG}}',
    pr_template: '- #{{TITLE}}\n   - PR: ##{{NUMBER}}',
    commit_template: '- #{{TITLE}}',
    empty_template: '- no changes',
    categories: [
        {
            title: '## 🚀 Features',
            labels: ['feature']
        },
        {
            title: '## 🐛 Bug Fixes',
            labels: ['bug', 'fix']
        },
        {
            title: '## 📝 Documentation',
            labels: ['documentation', 'docs']
        },
        {
            title: '## 🔧 Maintenance',
            labels: ['maintenance', 'chore']
        }
    ],
    ignore_labels: [],
    trim_values: true,
    defaultCategory: '## Other Changes'
};
function normalizeOptional(value) {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
function parseMode(value) {
    const normalized = value.toUpperCase();
    if (normalized === 'PR' || normalized === 'COMMIT' || normalized === 'HYBRID') {
        return normalized;
    }
    throw new Error(`Invalid mode: ${value}. Must be PR, COMMIT, or HYBRID.`);
}
function parsePlatform(value) {
    if (!value) {
        return undefined;
    }
    const normalized = value.toLowerCase();
    if (normalized === 'github' || normalized === 'gitea' || normalized === 'local' || normalized === 'git') {
        return normalized;
    }
    throw new Error(`Invalid platform: ${value}. Must be github, gitea, local, or git.`);
}
function parseBoolean(val) {
    return val?.toLowerCase() === 'true' || val === '1';
}
function resolveDebugMode() {
    return ((typeof core.isDebug === 'function' && core.isDebug()) ||
        parseBoolean(process.env.ACTIONS_STEP_DEBUG) ||
        parseBoolean(process.env.ACTIONS_RUNNER_DEBUG) ||
        parseBoolean(process.env.RUNNER_DEBUG));
}
function resolveVerbose() {
    const verboseInput = core.getBooleanInput('verbose');
    const debugMode = resolveDebugMode();
    return verboseInput || debugMode;
}
function getInputs() {
    const platform = parsePlatform(normalizeOptional(core.getInput('platform') || ''));
    const token = normalizeOptional(core.getInput('token') || '');
    const repo = normalizeOptional(core.getInput('repo') || '');
    const fromTag = normalizeOptional(core.getInput('from-tag') || '');
    const toTag = normalizeOptional(core.getInput('to-tag') || '');
    const mode = parseMode(core.getInput('mode') || 'PR');
    const configurationJson = normalizeOptional(core.getInput('configuration-json') || '');
    const configuration = normalizeOptional(core.getInput('configuration') || '');
    const ignorePreReleases = core.getBooleanInput('ignore-pre-releases');
    const fetchTagAnnotations = core.getBooleanInput('fetch-tag-annotations');
    const prefixMessage = normalizeOptional(core.getInput('prefix-message') || '');
    const postfixMessage = normalizeOptional(core.getInput('postfix-message') || '');
    const includeOpen = core.getBooleanInput('include-open');
    const failOnError = core.getBooleanInput('fail-on-error');
    const maxTagsToFetchRaw = normalizeOptional(core.getInput('max-tags-to-fetch') || '');
    const maxTagsToFetch = maxTagsToFetchRaw ? parseInt(maxTagsToFetchRaw, 10) : 1000;
    if (maxTagsToFetchRaw && Number.isNaN(maxTagsToFetch)) {
        throw new Error(`Invalid maxTagsToFetch: ${maxTagsToFetchRaw}. Must be a number.`);
    }
    const skipCertificateCheck = core.getBooleanInput('skip-certificate-check');
    const verbose = resolveVerbose();
    return {
        platform,
        token,
        repo,
        fromTag,
        toTag,
        mode,
        configuration,
        configurationJson,
        ignorePreReleases,
        fetchTagAnnotations,
        prefixMessage,
        postfixMessage,
        includeOpen,
        failOnError,
        maxTagsToFetch,
        skipCertificateCheck,
        verbose
    };
}
/**
 * Parse configuration from JSON string
 */
function parseConfigurationJson(configJson) {
    try {
        const config = JSON.parse(configJson);
        return mergeWithDefaults(config);
    }
    catch (error) {
        core.error(`Failed to parse configuration JSON: ${error}`);
        return null;
    }
}
/**
 * Load configuration from file
 */
function loadConfigurationFromFile(repositoryPath, configPath) {
    try {
        const fullPath = path.resolve(repositoryPath, configPath);
        if (!fs.existsSync(fullPath)) {
            core.warning(`Configuration file not found: ${fullPath}`);
            return null;
        }
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const config = JSON.parse(fileContent);
        return mergeWithDefaults(config);
    }
    catch (error) {
        core.error(`Failed to load configuration from file: ${error}`);
        return null;
    }
}
/**
 * Merge user configuration with defaults
 */
function mergeWithDefaults(userConfig) {
    return {
        template: userConfig.template ?? exports.DefaultConfiguration.template,
        pr_template: userConfig.pr_template ?? exports.DefaultConfiguration.pr_template,
        commit_template: userConfig.commit_template ?? exports.DefaultConfiguration.commit_template,
        empty_template: userConfig.empty_template ?? exports.DefaultConfiguration.empty_template,
        categories: userConfig.categories ?? exports.DefaultConfiguration.categories,
        ignore_labels: userConfig.ignore_labels ?? exports.DefaultConfiguration.ignore_labels,
        trim_values: userConfig.trim_values ?? exports.DefaultConfiguration.trim_values,
        defaultCategory: userConfig.defaultCategory ?? exports.DefaultConfiguration.defaultCategory
    };
}
/**
 * Resolve configuration from input (JSON string or file path)
 */
function resolveConfiguration(repositoryPath, configJson, configFile) {
    // Prefer JSON string over file
    if (configJson) {
        const config = parseConfigurationJson(configJson);
        if (config) {
            core.info('ℹ️ Using configuration from configurationJson input');
            return config;
        }
    }
    // Try file path
    if (configFile) {
        const config = loadConfigurationFromFile(repositoryPath, configFile);
        if (config) {
            core.info('ℹ️ Using configuration from configuration file');
            return config;
        }
    }
    // Use defaults
    core.info('ℹ️ No configuration provided, using defaults');
    return exports.DefaultConfiguration;
}
//# sourceMappingURL=config.js.map