import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import {getInputs, UPSTREAM_INPUT_ALIASES} from '../config'

jest.mock('@actions/core')
const mocked = core as jest.Mocked<typeof core>

/**
 * Compatibility with mikepenz/release-changelog-builder-action's names.
 *
 * That action is GitHub-only, so on Gitea this one is the only option, and a
 * workflow moving across should not have to rewrite its inputs. The failure
 * mode being guarded is silent: an input this action does not recognise is
 * simply ignored, which is how `configurationJson` once discarded an entire
 * configuration -- template and all -- from this repo's own release workflow
 * without a single warning.
 */
function withInputs(values: Record<string, string>) {
  mocked.getInput.mockImplementation((name: string) => values[name] ?? '')
  mocked.getBooleanInput.mockImplementation((name: string) => (values[name] ?? '').toLowerCase() === 'true')
  mocked.isDebug.mockReturnValue(false)
}

beforeEach(() => jest.clearAllMocks())

describe('upstream input aliases', () => {
  it('accepts configurationJson where configuration-json is absent', () => {
    withInputs({configurationJson: '{"template":"#{{CHANGELOG}}"}'})
    expect(getInputs().configurationJson).toBe('{"template":"#{{CHANGELOG}}"}')
  })

  it.each([
    ['fromTag', 'from-tag', 'v1.0.0'],
    ['toTag', 'to-tag', 'v2.0.0']
  ])('accepts %s as %s', (alias, canonical, value) => {
    withInputs({[alias]: value})
    const got = getInputs() as unknown as Record<string, unknown>
    expect(got[canonical === 'from-tag' ? 'fromTag' : 'toTag']).toBe(value)
  })

  it('accepts the boolean aliases', () => {
    withInputs({failOnError: 'true', includeOpen: 'true', ignorePreReleases: 'true'})
    const i = getInputs()
    expect(i.failOnError).toBe(true)
    expect(i.includeOpen).toBe(true)
    expect(i.ignorePreReleases).toBe(true)
  })

  it('prefers the canonical name when both are set to the same intent', () => {
    withInputs({'from-tag': 'v9.9.9', fromTag: 'v9.9.9'})
    expect(getInputs().fromTag).toBe('v9.9.9')
  })

  it('fails loudly when canonical and alias disagree, rather than silently picking one', () => {
    withInputs({'from-tag': 'v1.0.0', fromTag: 'v2.0.0'})
    expect(() => getInputs()).toThrow(/from-tag.*fromTag|fromTag.*from-tag/)
  })

  it('warns when only the alias is used, naming the canonical input', () => {
    withInputs({fromTag: 'v1.0.0'})
    getInputs()
    expect(mocked.warning).toHaveBeenCalledWith(expect.stringContaining('from-tag'))
  })
})

describe('alias coverage is complete and declared', () => {
  const action = yaml.load(fs.readFileSync('action.yml', 'utf8')) as {
    inputs: Record<string, {description?: string}>
  }

  it('every alias this action honours is declared in action.yml', () => {
    // Declaring matters beyond documentation: a composite runner drops inputs
    // it has not declared, and Gitea's runner behaviour is not something this
    // repo can verify, so an undeclared alias risks doing nothing on the very
    // platform the compatibility exists for.
    for (const alias of Object.keys(UPSTREAM_INPUT_ALIASES)) {
      expect(Object.keys(action.inputs)).toContain(alias)
    }
  })

  it('every declared alias maps to a real canonical input', () => {
    for (const [alias, canonical] of Object.entries(UPSTREAM_INPUT_ALIASES)) {
      expect(Object.keys(action.inputs)).toContain(canonical)
      expect(alias).not.toBe(canonical)
    }
  })

  it('each alias is marked as a compatibility alias in its description', () => {
    for (const alias of Object.keys(UPSTREAM_INPUT_ALIASES)) {
      expect((action.inputs[alias]?.description ?? '').toLowerCase()).toMatch(/alias|compatibility|deprecated/)
    }
  })

  /**
   * The scope guard. Accepting an upstream name and then ignoring it is the
   * exact defect this feature exists to prevent, so a name declared in
   * action.yml but absent from the alias map must fail here rather than ship.
   */
  it('no upstream-style alias is declared without being honoured in code', () => {
    const camel = Object.keys(action.inputs).filter(n => /[A-Z]/.test(n))
    for (const name of camel) {
      expect(Object.keys(UPSTREAM_INPUT_ALIASES)).toContain(name)
    }
  })
})

describe('upstream output aliases', () => {
  const {setOutput, UPSTREAM_OUTPUT_ALIASES} = jest.requireActual('../outputs')

  beforeEach(() => jest.clearAllMocks())

  it('publishes both the canonical and upstream spelling', () => {
    setOutput('from-tag', 'v1.0.0')
    expect(mocked.setOutput).toHaveBeenCalledWith('from-tag', 'v1.0.0')
    expect(mocked.setOutput).toHaveBeenCalledWith('fromTag', 'v1.0.0')
  })

  it('publishes an un-aliased output exactly once', () => {
    setOutput('changelog', 'body')
    expect(mocked.setOutput).toHaveBeenCalledTimes(1)
    expect(mocked.setOutput).toHaveBeenCalledWith('changelog', 'body')
  })

  it('declares every aliased output in action.yml under its canonical name', () => {
    const action = yaml.load(fs.readFileSync('action.yml', 'utf8')) as {outputs: Record<string, unknown>}
    for (const canonical of Object.keys(UPSTREAM_OUTPUT_ALIASES)) {
      expect(Object.keys(action.outputs)).toContain(canonical)
    }
  })
})

/**
 * The compatibility table in the README is the thing a migrating user reads.
 * If an alias is added in code and not documented, they never learn it exists;
 * if one is documented and not honoured, they hit the silent-ignore bug this
 * feature removes. Both directions are checked against the real maps rather
 * than a copy.
 */
describe('README documents exactly the aliases that exist', () => {
  const readme = fs.readFileSync('README.md', 'utf8')
  const {UPSTREAM_OUTPUT_ALIASES} = jest.requireActual('../outputs')

  it('documents every input alias and its canonical name', () => {
    for (const [alias, canonical] of Object.entries(UPSTREAM_INPUT_ALIASES)) {
      expect(readme).toContain(`\`${alias}\``)
      expect(readme).toContain(`\`${canonical}\``)
    }
  })

  it('documents every output alias', () => {
    for (const [canonical, alias] of Object.entries(UPSTREAM_OUTPUT_ALIASES as Record<string, string>)) {
      expect(readme).toContain(`\`${alias}\``)
      expect(readme).toContain(`\`${canonical}\``)
    }
  })

  it('states plainly that this is not a drop-in replacement', () => {
    expect(readme).toMatch(/not a drop-in replacement/i)
  })
})

describe('boolean aliases stay as strict as core.getBooleanInput', () => {
  it('rejects a value that is not a YAML 1.2 boolean, rather than defaulting to false', () => {
    withInputs({includeOpen: 'yes'})
    expect(() => getInputs()).toThrow(/Core Schema/)
  })

  it.each([['True', true], ['TRUE', true], ['False', false], ['FALSE', false]])(
    'accepts %s exactly as core does', (raw, expected) => {
      withInputs({includeOpen: raw as string})
      expect(getInputs().includeOpen).toBe(expected)
    }
  )
})

/**
 * Defaults are indistinguishable from user input at runtime, so the alias
 * resolver carries its own copy of them. That copy drifting from action.yml
 * would quietly restore the bug it was added to fix.
 */
describe('declared defaults', () => {
  const {CANONICAL_DEFAULTS} = jest.requireActual('../config')
  const action = yaml.load(fs.readFileSync('action.yml', 'utf8')) as {
    inputs: Record<string, {default?: string}>
  }

  it('matches action.yml exactly, for every input that declares a default', () => {
    const fromFile = Object.fromEntries(
      Object.entries(action.inputs)
        .filter(([name, spec]) => spec?.default !== undefined && Object.values(UPSTREAM_INPUT_ALIASES).includes(name))
        .map(([name, spec]) => [name, String(spec.default)])
    )
    expect(CANONICAL_DEFAULTS).toEqual(fromFile)
  })

  it('lets an alias supply a value when the canonical holds only its default', () => {
    withInputs({'include-open': 'false', includeOpen: 'true'})
    expect(getInputs().includeOpen).toBe(true)
  })

  it('still errors when the canonical is explicitly set to a non-default that disagrees', () => {
    withInputs({'from-tag': 'v1.0.0', fromTag: 'v2.0.0'})
    expect(() => getInputs()).toThrow(/different values/)
  })
})
