import { homedir } from 'node:os'
import path from 'node:path'
import { AuraError, DEFAULT_ENDPOINT, DEFAULT_PARAMS } from './contracts.js'
import { Coprocessor } from './coprocessor.js'
import { SealCkksFactory } from './crypto/seal-ckks.js'
import { Journal } from './journal.js'
import { Vault } from './vault.js'
import type { Ctx } from './session.js'

export async function buildContext(env = process.env): Promise<Ctx> {
  const home = env.AURA_HOME ?? path.join(homedir(), '.aura')
  const journal = new Journal(path.join(home, 'journal.ndjson'))
  const remote = new Coprocessor({ endpoint: env.AURA_COPROCESSOR_URL ?? DEFAULT_ENDPOINT, token: env.AURA_ACCESS_TOKEN, journal })
  const serverParams = await remote.params()
  if (JSON.stringify(serverParams) !== JSON.stringify(DEFAULT_PARAMS))
    throw new AuraError('PARAMS_MISMATCH', 'Coprocessor parameters differ from the pinned 128-bit set in this client.')
  const crypto = await SealCkksFactory.create(DEFAULT_PARAMS, path.join(home, 'keys'))
  return { crypto, remote, vault: new Vault(path.join(home, 'vault')), journal, home }
}
