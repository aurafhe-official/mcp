# Learn FHE, build an integration, explore the possibilities

Aura MCP has three jobs: make encrypted computation understandable, connect
supported operations to an application's workflow, and help developers explore
what they could build. FHE is the foundation; each application defines a useful
task, the data it needs and who may read its results.

## Start by understanding the workflow

Connect using [Quickstart](QUICKSTART.md), then ask:

> Teach me FHE one step at a time. Explain what gets encrypted, who holds the key,
> what the server computes and how an authorized person reads the result.

The public lesson prepares fixed encrypted samples, requests a calculation and
saves an encrypted result. Aura manages those example keys. The tour does not
decrypt the result in the assistant conversation; the separate synthetic verifier
checks public results outside it. In an owner-controlled deployment, the secret
key and authorized decryption instead stay in the owner's environment.

After the first addition, ask:

> Use the public float samples to explain an encrypted average. Then show how
> weighted calculations could fit an application.

The samples 7.5 and 2.5 can be added, then divided by the encrypted sample 2 to
illustrate a mean. Their expected mean is 5; the separate verifier checks that
result. This teaches composition: one encrypted result becomes the input to the
next operation. Correctness and timing remain specific to the tested workload.

## Plan your application

Describe a use case with public or invented information:

> I want to add encrypted analytics to my application. Help me identify the
> calculation, the client/server data path, who keeps the key, and the setup needed.

| Decision | Example or next step |
| --- | --- |
| Useful task | Combine totals, calculate an average, or apply a weighted formula |
| Supported computation | Map the task to current integer/float arithmetic and compositions; inspect `fhe_ops` |
| Client | Decide where inputs become encrypted and where the secret key is stored |
| Compute access | Provision an authenticated compute-only deployment and compatible encrypted inputs |
| Result recipient | Define who may receive the encrypted result and decrypt it locally |
| Evaluation | Check correctness, precision, performance, authorization and key isolation for that workload |

The pattern can be part of a web, mobile, backend or agent application. MCP is
the tool connection; it does not automatically convert arbitrary application code
or data into an encrypted computation. Your task must match the service's
operations and ciphertext contract. Applications needing database queries or AI
inference require their separate integrations.

This package accepts fixed public samples or operator-provisioned encrypted
bundles. It has no tool for entering custom plaintext or sending secret keys.
The bundle path requires a separately configured authenticated compute-only
service and recipient processing; it is not the unpublished Verified mode.
See the [protocol](PROTOCOL.md) and [security model](SECURITY-MODEL.md).

## Why setup is not yet one click

| Experience | Setup today |
| --- | --- |
| Public learning demo | Install the package, generate your client's MCP settings and reconnect; no user key setup |
| Your application's confidential data | Configure client encryption/decryption, key storage, authenticated compute access, supported operations and result authorization |
| Simpler browser integration | Planned client-runtime work, including WASM; not included in this MCP release |

WASM is a way to run compiled code inside a browser. A cryptographic WASM runtime
can help a browser encrypt and decrypt locally. A native client is another option.
Neither removes the need to define key custody, authentication, compatible
parameters and what the application may reveal. The MCP connection alone does
not supply that complete private workflow.

The direction is simpler onboarding. There is no promised release date or
one-click confidential integration in this package today.

## Explore beyond the lesson

The numeric lesson introduces the building blocks for analytics and scoring.
Encrypted databases, messaging and private AI apply the same broad principle
through application-specific designs; the numeric demo does not reproduce those
applications or establish their privacy properties.

Try the separate AI application at [chat.afhe.io](https://chat.afhe.io), with
[current access guidance](AI-DEMO.md), or discuss an application evaluation via
**gen@afhe.io**. [Compare the three experiences](EXPERIENCES.md).
