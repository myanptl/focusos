import { describe, it, expect } from 'vitest'
import { parsePlan } from '../api/generate-quiz.js'

describe('parsePlan', () => {
  it('returns the plan when the JSON is valid and has weeks', () => {
    const plan = parsePlan('{"overview":"x","weeks":[{"weekNum":1}]}')
    expect(plan.weeks).toHaveLength(1)
  })
  it('returns null for malformed JSON instead of throwing', () => {
    expect(parsePlan('{"weeks":[{"weekNum":1} {"weekNum":2}]}')).toBeNull()
  })
  it('returns null when there are no weeks', () => {
    expect(parsePlan('{"error":"nope"}')).toBeNull()
  })
})
