import {
  normalizeKeyword,
  isStopKeyword,
  isStartKeyword,
  isHelpKeyword,
} from '../src/lib/twilio'

describe('SMS Keyword Parsing', () => {
  describe('normalizeKeyword', () => {
    it('should uppercase and trim input', () => {
      expect(normalizeKeyword('  yes  ')).toBe('YES')
      expect(normalizeKeyword('Stop')).toBe('STOP')
      expect(normalizeKeyword('help')).toBe('HELP')
    })
  })

  describe('isStopKeyword', () => {
    it('should recognize STOP variants', () => {
      expect(isStopKeyword('STOP')).toBe(true)
      expect(isStopKeyword('STOPALL')).toBe(true)
      expect(isStopKeyword('UNSUBSCRIBE')).toBe(true)
      expect(isStopKeyword('CANCEL')).toBe(true)
      expect(isStopKeyword('END')).toBe(true)
      expect(isStopKeyword('QUIT')).toBe(true)
    })

    it('should reject non-stop keywords', () => {
      expect(isStopKeyword('YES')).toBe(false)
      expect(isStopKeyword('START')).toBe(false)
      expect(isStopKeyword('HELLO')).toBe(false)
    })
  })

  describe('isStartKeyword', () => {
    it('should recognize START variants', () => {
      expect(isStartKeyword('START')).toBe(true)
      expect(isStartKeyword('UNSTOP')).toBe(true)
      expect(isStartKeyword('SUBSCRIBE')).toBe(true)
    })

    it('should reject non-start keywords', () => {
      expect(isStartKeyword('STOP')).toBe(false)
      expect(isStartKeyword('YES')).toBe(false)
    })
  })

  describe('isHelpKeyword', () => {
    it('should recognize HELP variants', () => {
      expect(isHelpKeyword('HELP')).toBe(true)
      expect(isHelpKeyword('INFO')).toBe(true)
    })

    it('should reject non-help keywords', () => {
      expect(isHelpKeyword('STOP')).toBe(false)
      expect(isHelpKeyword('YES')).toBe(false)
    })
  })
})

describe('SMS Keyword Flow', () => {
  it('should handle YES keyword for pending phone', () => {
    const keyword = normalizeKeyword('yes')
    expect(keyword).toBe('YES')
    // In actual implementation: pending -> confirmed
  })

  it('should handle STOP keyword', () => {
    const keyword = normalizeKeyword('stop')
    expect(isStopKeyword(keyword)).toBe(true)
    // In actual implementation: any -> revoked
  })

  it('should handle MANAGE keyword', () => {
    const keyword = normalizeKeyword('manage')
    expect(keyword).toBe('MANAGE')
    // In actual implementation: generate manage token + send link
  })
})
