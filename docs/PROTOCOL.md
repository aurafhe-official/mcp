# Protocol and compatibility

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

There is **no** shared HTTP MCP endpoint in this preview. The historical backend survey dated 28 Aug 2026 is not a statement of present service availability. Default MCP transport is stdio and supports the five tools documented in the root README.

## Native adapter HTTP contract

All requests require a role-specific bearer token. Owner and compute origins must differ. HTTP is accepted by the clients only on literal loopback; remote workers require verified HTTPS. Redirects are refused.

| Role | Route | Request / response |
| --- | --- | --- |
| Both | GET /health | status, role, keyId, secretKeyLoaded, securityProfile |
| Compute | GET /functions | arity1 empty, arity2 eight numeric functions, arity3 empty |
| Compute | POST /call | {fn,args:[ciphertext,ciphertext]} → {result:ciphertext} |
| Owner | POST /encrypt/int or /encrypt/float | {value:decimalString,public:false} → {ciphertext} |
| Owner | POST /decrypt/int or /decrypt/float | {ciphertext} → {plaintext:string} |

Unknown routes return 404; invalid arguments or dispatch return 400; missing/wrong authorization returns 401. Native errors can terminate the process and must be treated as failures. Function names retain the upstream spelling `SubstractCipherInt` / `SubstractCipherFloat`.

Input bundles contain version=1, keyId and 1–128 numeric ciphertext inputs. Results contain version, keyId, resultId, domain, operation and ciphertext. Key IDs are routing metadata, not a cryptographic proof. Default MCP operations are add/sub/mul/div; sub/div need exactly two handles of one domain. The adapter does not expose native comparison, mapping, signing, scientific or string functions.
