declare module "undici" {
  export class Agent {
    constructor(opts?: unknown);
  }

  export const fetch: typeof globalThis.fetch;
}
