# One foundation, three experiences

FHE is the computation foundation: software can calculate with data in its
encrypted form. An application turns that foundation into a useful task. MCP
connects an assistant to the operations an application or service exposes.

| Experience | What a visitor does | What it demonstrates |
| --- | --- | --- |
| **Aura AI** | Enter through [chat.afhe.io](https://chat.afhe.io), try an invented business question, then ask a follow-up | The separate AI application and its observed response; see [access and demonstration guidance](AI-DEMO.md) |
| **Applications on Aura** | Request an evaluation of encrypted databases, messaging or private inference via **gen@afhe.io** | A specific application, with its own supported operations, client and key-custody design |
| **Aura MCP** | Learn FHE step by step, connect supported computations and plan an application integration | The numeric workflow, key-custody distinctions and integration requirements shipped in this package |

These are different interfaces. Installing MCP does not install a language model,
encrypt an existing assistant conversation, or enable database queries. The AI
application is separate from the current MCP tools.

MCP is also an educational and development entry point. Use the
[learning and integration guide](BUILD-WITH-AURA.md) to progress from encrypted
numbers to application design. Simpler setup is a development direction;
client-side encryption, key storage, service authentication and browser WASM
integration still require work for a complete confidential application.

## Why encryption keys matter

In an owner-controlled client/server design:

1. **Prepare locally.** The owner generates and retains the secret key in their
   trusted environment, then encrypts the input before sending it.
2. **Compute remotely.** The service evaluates supported operations on encrypted
   data. It receives no decryption key for that workload.
3. **Read locally.** The encrypted result returns to an authorized recipient,
   who uses their key to read it.

The key determines who can perform the intended decryption. The deployment must
also verify access controls, owner isolation and where readable data appears.
An encrypted-looking response alone does not establish those properties.

The public numeric MCP demo uses **Aura-managed example keys**. It lets visitors
learn and exercise the connection with fixed public samples. It does not establish
owner-only privacy or the key custody of the separate AI application.

## Understand the evidence

| Evidence | What it supports | What it does not establish |
| --- | --- | --- |
| Numeric verifier | Fixed-example correctness, measured error, request time and ciphertext size | Model inference speed, cryptographic security or absence of server-held keys |
| AI benchmark | Reported performance for a named model and hardware under stated conditions | The performance of every prompt, another GPU, or a current visitor's session |
| Application walkthrough | The behavior actually observed in that application | Its internal cryptographic execution or privacy merely from a chat transcript |
| Client/server and security review | Assessment of the deployed data path, key custody and scheme assumptions | A guarantee derived from an arithmetic demo or marketing panel |

The website reports **GPT-OSS-20B at 20+ tokens/second on one RTX PRO 6000
Blackwell GPU**, with prompt read-in below 2.3 seconds. Keep those figures together
and attribute them to Aura's internal benchmark. Model size, GPU, input/output
lengths and the timing window are part of the result. Steady generation speed
and time to first token measure different parts of a request.

Do not substitute a different hardware result, claim the MCP reproduced an AI
benchmark, or call a request log a cryptographic proof. [Website evidence](https://afhe.io/#status).

## What is open today

The MCP adapter, documentation, tests and fixed-sample verifier are public.
The proprietary computation engine is not distributed in this package.
Additional implementation disclosures require a separately announced scope.
Useful evaluation evidence can describe the data path, benchmark conditions and
review results without exposing proprietary source code or secrets.

[Try the AI walkthrough](AI-DEMO.md) · [Connect MCP](QUICKSTART.md) ·
[Investor walkthrough](INVESTOR-DEMO.md) · [Security model](SECURITY-MODEL.md)
