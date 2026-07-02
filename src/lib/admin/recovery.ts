import { createHash, randomBytes } from 'crypto'

const CODE_COUNT = 10
const GROUP = 4 // caratteri per gruppo → formato xxxx-xxxx-xxxx
const GROUPS = 3
// Alfabeto senza caratteri ambigui (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Hash deterministico di un codice di recupero (i codici sono ad alta entropia). */
export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

function randomCode(): string {
  const groups: string[] = []
  for (let g = 0; g < GROUPS; g++) {
    let s = ''
    const bytes = randomBytes(GROUP)
    for (let i = 0; i < GROUP; i++) s += ALPHABET[bytes[i] % ALPHABET.length]
    groups.push(s)
  }
  return groups.join('-')
}

/** Genera N codici in chiaro (da mostrare una sola volta) + i relativi hash. */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: CODE_COUNT }, randomCode)
  return { codes, hashes: codes.map(hashRecoveryCode) }
}
