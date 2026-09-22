# Configure the client

This integration candidate requires an Aura gateway implementing the contract in
[PROTOCOL.md](PROTOCOL.md). The gateway URL and credentials must be provisioned by
the service operator. A legacy generic computation endpoint is not automatically
compatible. Do not point this client at an assumed route and describe it as live.

Install a reviewed commit with Node 20+:

```sh
git clone https://github.com/aurafhe-official/mcp.git
cd mcp
git checkout <reviewed-commit-sha>
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

Configure the MCP host to run `node /absolute/path/mcp/dist/index.js` with:

| Environment variable | Purpose |
| --- | --- |
| `AURA_COPROCESSOR_URL` | Operator-provisioned HTTPS gateway endpoint |
| `AURA_ACCESS_TOKEN` | Service credential for the authorized principal |
| `AURA_KEY_ID` | Opaque authorized key reference |
| `AURA_KEY_VERSION` | Positive key version |

Use the host's protected credential configuration. Do not put tokens in chat,
checked-in examples, URL query strings or command-line arguments. The client
rejects insecure URLs, redirects and disabled TLS verification. Python and an
engine installation are not required.

The owner application's separate authenticated workflow encrypts and provisions
the data and supplies an opaque dataset reference. With that reference:

1. Check `fhe_status` and `fhe_ops`.
2. Call `fhe_import` with `datasetId`.
3. Call `fhe_compute` with an enabled operation and returned handles.
4. Call `fhe_export` with the result handle.
5. The authorized recipient retrieves and decrypts the result outside the model.

The owner application and private gateway are external integration dependencies;
they are not supplied by this public client. End-to-end FHE functionality must be
validated with those components before advertising the workflow as live.
