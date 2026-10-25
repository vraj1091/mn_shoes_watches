import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with OWASP's recommended minimum (19 MiB memory, 2 iterations, 1 lane). That costs
 * roughly 40–80 ms per hash on a shared host: slow for an attacker, unnoticeable for a person.
 */
const options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const MIN_PASSWORD_LENGTH = 12;

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword({ hash: digest, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(digest, password);
  } catch {
    // A malformed or non-Argon2 hash is a failed login, not a server error.
    return false;
  }
}
