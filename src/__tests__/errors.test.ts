import {describeError} from '../errors'

describe('describeError', () => {
  it('names the status and URL of a thrown fetch Response', () => {
    const response = new Response('{"message":"token is required"}', {status: 401, statusText: 'Unauthorized'})
    Object.defineProperty(response, 'url', {value: 'https://gitea.com/api/v1/repos/o/r/tags?page=1&limit=50'})

    expect(describeError(response)).toBe(
      'HTTP 401 Unauthorized from https://gitea.com/api/v1/repos/o/r/tags?page=1&limit=50'
    )
  })

  it('adds the API message that gitea-js attaches as .error', () => {
    const response = Object.assign(new Response(null, {status: 404, statusText: 'Not Found'}), {
      error: {message: 'repository does not exist'}
    })
    Object.defineProperty(response, 'url', {value: 'https://git.example.org/api/v1/repos/o/r/tags'})

    expect(describeError(response)).toBe(
      'HTTP 404 Not Found from https://git.example.org/api/v1/repos/o/r/tags: repository does not exist'
    )
  })

  it('keeps an Error message unchanged', () => {
    expect(describeError(new Error('No tags found in repository'))).toBe('No tags found in repository')
  })

  it('stringifies anything else', () => {
    expect(describeError('plain')).toBe('plain')
  })
})
