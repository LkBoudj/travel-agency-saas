import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { authErrorMessage } from "./auth-error-messages.ts"

describe("authErrorMessage", () => {
  it("does not reveal whether the email or the password was wrong", () => {
    const message = authErrorMessage(401)
    assert.match(message, /incorrect email or password/i)
    // Saying which half failed would confirm whether an account exists.
    assert.doesNotMatch(message, /no such (user|account)/i)
  })

  it("explains a rejected payload and a rate limit", () => {
    assert.match(authErrorMessage(400), /check the email and password/i)
    assert.match(authErrorMessage(429), /too many attempts/i)
  })

  it("explains a server failure without exposing it", () => {
    const message = authErrorMessage(500, "PrismaClientKnownRequestError: P2002")
    assert.match(message, /could not reach the server/i)
    assert.doesNotMatch(message, /Prisma|P2002/)
  })

  it("never returns an empty message", () => {
    for (const [status, server] of [
      [undefined, undefined],
      [418, ""],
      [418, "   "],
    ] as Array<[number | undefined, string | undefined]>) {
      assert.ok(authErrorMessage(status, server).trim().length > 0)
    }
  })
})
