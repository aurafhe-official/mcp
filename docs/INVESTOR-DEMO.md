# Investor walkthrough

Lead with a useful AI task. FHE is the computation foundation, Aura AI is an
application, and MCP connects assistants to the capabilities exposed here.
The numeric lesson is an optional explanation and integration check.

The visitor journey is **Aura AI → application evaluations → MCP integration**.
Use [aura.afhe.io](https://aura.afhe.io) as the intended trial entry, subject to the
[current access check](AI-DEMO.md). [One foundation, three experiences](EXPERIENCES.md)
provides a comparison that investors can read without understanding cryptography.

## 1. Establish the application and evidence

Use the website's **GPT-OSS-20B, 20+ tokens/second, one RTX PRO 6000 Blackwell GPU**
benchmark. Prompt read-in is reported below 2.3 seconds. Attribute these figures
to Aura's internal benchmark; do not present them as a live MCP measurement or
independently reproduced result. [Published source](https://afhe.io/#status).

The [AI walkthrough](AI-DEMO.md) includes access status, a fictional company memo
and follow-up task. First confirm the application opens over valid HTTPS. If it
does not, use an arranged demonstration; do not present a canned answer as a live run.
Record the actual model and observed response metrics if available.

Explain which data is encrypted, where keys reside, which inference steps are
protected and where the answer becomes readable. Do not infer AI key custody or
performance from the numeric demo. No proprietary implementation needs to be
published to provide a clear boundary and reproducible benchmark conditions.

Use an invented memo, not a confidential document, for an introductory demo.
If a server-view panel is available, explain what its counters observe. Ciphertext
sizes and timing in a panel are useful diagnostics, not proof of key custody.

## 2. Show where the current MCP fits

Connect with [Quickstart](QUICKSTART.md) and ask:

> What can I do with Aura? Show me the AI application first, then explain what I can run here.

The overview offers an application walkthrough, the optional public-sample lesson
and a developer reference. It also works offline. It does not call model inference.
The current tools perform numeric operations; a future inference tool requires
the actual service contract and appropriate input/key/output integration.

Aura confirms its FHE database and FHE-AI LLM inference applications are completed
and available on request via **gen@afhe.io**, separately from the demo MCP.

## 3. Optional: teach the encrypted-computation foundation

Ask for the public-sample learning lesson. The agent prepares encrypted examples,
requests a remote calculation and saves an encrypted result. Explain each step;
keep tool names, JSON and identifiers out of the audience's way.

Demo mode is **backend-keyed**: Aura manages its public example keys. The expected
25 + 17 answer is 42, but an encrypted handle is not a numerical verification.
From a source checkout, run `npm ci --ignore-scripts` and `npm run test:live` for
the separate verifier. It starts the MCP and checks only fixed synthetic results
through the demo backend. Show its actual output, error and tolerance. Request
timing includes network and worker checks, not only engine execution.

Do not use a Microsoft SEAL reference fixture as Aura's engine or as evidence of
Aura performance. The separate unpublished reference branch is engineering work.

## Technical follow-up

Before an owner-key demonstration, validate the deployed client/server contract,
encryption and decryption locations, authentication, cross-owner isolation,
revocation and the security assumptions. Neither health declarations nor a
ciphertext-only request log proves that a server cannot recover data.

For AI benchmarking, document the exact checkpoint, model configuration, hardware,
prompt/output lengths, concurrency, timing definitions and encrypted execution
coverage. Keep website figures separate from measurements made during the session.
Publish only authorized descriptions and evidence; keep proprietary engine code,
private keys and deployment details private.
