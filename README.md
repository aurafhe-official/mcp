# AURA MCP

![AURA](docs/assets/aura.png)

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

This MCP server lets agents compute with encrypted input handles. The owner prepares inputs and decrypts results in a separate trusted application. The default MCP tools accept handles only: `fhe_status`, `fhe_inputs`, `fhe_ops`, `fhe_compute`, and `fhe_export_result`.

The previous encryption/decryption tools exposed plaintext to the model and backend. They are available only through explicit `--trusted-demo` for synthetic compatibility demonstrations. Shared HTTP mode is disabled.

## Install and run

This preview is not on npm yet. Install from the verified repository:

```sh
git clone https://github.com/aurafhe-official/mcp.git
cd mcp
npm ci
npm run build
npm test
```

Alternatively, `npx -y github:aurafhe-official/mcp` starts the tool catalog; supply the configuration below before computing.

For an MCP host, use absolute paths and a compute-only credential:

```json
{
  "mcpServers": {
    "aura": {
      "command": "node",
      "args": ["/absolute/path/mcp/dist/index.js"],
      "env": {
        "AFHE_INPUT_BUNDLE": "/absolute/path/encrypted-inputs.json",
        "AFHE_COMPUTE_URL": "http://127.0.0.1:8082",
        "AFHE_COMPUTE_API_KEY": "COMPUTE_TOKEN",
        "AFHE_KEY_ID": "SHA256_OF_PUBLIC_KEY_FILE",
        "AFHE_RESULT_DIR": "/absolute/path/encrypted-results"
      }
    }
  }
}
```

Without configuration the server lists its tools and reports `configured:false`. It does not silently connect to a public backend. See [the complete setup](docs/QUICKSTART.md), including the native adapter and separate owner CLI.

## Verified behavior and limits

The supplied Linux native library completed owner encryption → separate compute process → actual stdio MCP tools → encrypted export → owner decryption. Integer addition, subtraction, multiplication and division, and a floating-point sum/mean were checked against expected values. This is a functional integration check, not cryptographic certification.

Only numeric `int` and `float` arithmetic is exposed in the default MCP. One owner/key per process; random process-local handles; one-hour expiry; bounded inputs and responses. The owner and worker must be isolated by OS permissions or separate machines. Different ports alone do not isolate files, environment variables, or credentials from an agent with shell access.

The input/result key identifier is a routing check, not authentication or a proof of correct computation. Result decryption is an explicit owner action; review the requested computation and avoid publishing arbitrary decryption responses. No multi-tenant service, audited cryptographic parameters, unrestricted computation depth, browser-local crypto, or verifiable computation is provided.

The native binary is supplied separately and is not covered by this repository's MIT license. See [native compatibility](native/README.md), [security](SECURITY.md), and [release status](release-status.json).
