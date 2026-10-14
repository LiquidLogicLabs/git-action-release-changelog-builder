/**
 * Turn a thrown value into a readable message. gitea-js rejects with the fetch Response
 * itself (with the parsed API body as `.error`), which String() renders as "[object Response]".
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (error instanceof Response) {
    const apiMessage = (error as Response & {error?: {message?: string}}).error?.message
    const status = `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ''} from ${error.url}`
    return apiMessage ? `${status}: ${apiMessage}` : status
  }
  return String(error)
}
