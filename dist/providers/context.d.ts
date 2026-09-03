import { ProviderPlatform } from '../types';
/** Ref from the CI context. Only GitHub exposes one this way. */
export declare function getContextRef(platform: ProviderPlatform): string | undefined;
/** owner/repo from the CI context. Only GitHub exposes one this way. */
export declare function getContextRepo(platform: ProviderPlatform): {
    owner: string;
    repo: string;
} | undefined;
//# sourceMappingURL=context.d.ts.map