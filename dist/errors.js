"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeError = describeError;
/**
 * Turn a thrown value into a readable message. gitea-js rejects with the fetch Response
 * itself (with the parsed API body as `.error`), which String() renders as "[object Response]".
 */
function describeError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (error instanceof Response) {
        const apiMessage = error.error?.message;
        const status = `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ''} from ${error.url}`;
        return apiMessage ? `${status}: ${apiMessage}` : status;
    }
    return String(error);
}
//# sourceMappingURL=errors.js.map