/**
 * A fixed, valid argon2id hash used only to equalise login timing.
 *
 * When a login names an email that does not exist, the strategy verifies the
 * submitted password against this hash instead of returning early. That keeps
 * the expensive work on both paths, so response time no longer says whether the
 * account exists.
 *
 * It is a constant on purpose: hashing a throwaway value per request would cost
 * a second argon2 run and still leak, because hashing and verifying are not the
 * same amount of work.
 *
 * It authenticates nobody. The strategy checks that the account exists
 * independently of the verification result, so even the preimage of this hash
 * cannot be used to sign in. The parameters match what `argon2.hash()` produces
 * with this project's defaults (m=65536, t=3, p=4), so the work is comparable to
 * verifying a real account.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$232jQI9P2M6zUEJSYVlhOA$hBlaHWo32pALkYx6B26FOAipAMRLtombzS6qMwu+M9o';
