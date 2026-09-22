import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'

import * as core from '../__fixtures__/core'
jest.unstable_mockModule('@actions/core', () => core)
const { run } = await import('../src/main')

function getVariableKey(name: string): string {
  return name.replace(/\./g, '_').replace(/ /g, '_').toUpperCase()
}

function setInput(key: string, val: string): void {
  process.env[`INPUT_${getVariableKey(key)}`] = val
}

describe('test basic function', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV } // Make a copy
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    process.env = OLD_ENV // Restore old environment
  })

  test('openDAL memory', async () => {
    setInput('provider', 'memory')
    setInput('provider_options', '')
    setInput('include', '__tests__/**/temp\n!node_modules/**')
    setInput('flatten', 'true')

    const op = await run()
    const content = await op?.read('temp')
    expect(content?.toString().trim()).toEqual(
      'this test file for action-upload'
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('does not log provider options values', async () => {
    const secret = 'super-secret-value'
    setInput('provider', 'memory')
    setInput('provider_options', `custom=${secret}\naccess=test-access-key`)
    setInput('include', '__tests__/**/temp\n!node_modules/**')
    setInput('flatten', 'true')

    await run()

    const debugMessages = core.debug.mock.calls.map(([msg]) => String(msg))
    expect(
      debugMessages.some((msg) => msg.includes('provider options:'))
    ).toBeFalsy()
    expect(debugMessages.some((msg) => msg.includes(secret))).toBeFalsy()
  })

  test('logs generic error and only failure type on upload errors', async () => {
    setInput('provider', 'invalid-provider')
    setInput('provider_options', 'token=abc123')
    setInput('include', '__tests__/**/temp\n!node_modules/**')
    setInput('flatten', 'true')

    await run()

    expect(core.error).toHaveBeenCalledWith('Upload files failed')
    expect(core.setFailed).toHaveBeenCalledWith('Upload files failed')

    const debugMessages = core.debug.mock.calls.map(([msg]) => String(msg))
    expect(
      debugMessages.some((msg) => msg.includes('Upload failure type:'))
    ).toBeTruthy()
    expect(debugMessages.some((msg) => msg.includes('abc123'))).toBeFalsy()
  })
})
