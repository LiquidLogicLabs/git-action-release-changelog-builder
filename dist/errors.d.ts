/**
 * Turn a thrown value into a readable message. gitea-js rejects with the fetch Response
 * itself (with the parsed API body as `.error`), which String() renders as "[object Response]".
 */
export declare function describeError(error: unknown): string;
