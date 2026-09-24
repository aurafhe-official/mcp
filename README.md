# AURA MCP

**FHE is the foundation. Aura AI is the application. MCP connects your assistant to encrypted tools.**

FHE lets software calculate with data in its encrypted form. Aura's flagship AI
application gives that foundation a practical purpose: useful AI with a defined
privacy and key-custody model. MCP is the connection from your assistant to the
capabilities exposed here.

**Aura reports GPT-OSS-20B encrypted inference at 20+ tokens/second on one RTX PRO
6000 Blackwell GPU**, with prompt read-in below 2.3 seconds. This is the website's
internal benchmark, not a speed measured by this MCP or an independent validation.
[Benchmark source and scope](https://afhe.io/#status).

| Three ways to experience Aura | Where to go |
| --- | --- |
| **1. Try Aura AI** with a business question and a follow-up | [chat.afhe.io](https://chat.afhe.io) · [Demo guide and access status](docs/AI-DEMO.md) |
| **2. Evaluate applications**: encrypted databases, messaging or private inference | [Arrange an evaluation](mailto:gen@afhe.io) |
| **3. Learn and build through MCP** from Cursor, Claude Desktop or VS Code | [Install and connect](#install-and-connect) · [Application integration guide](docs/BUILD-WITH-AURA.md) |

[Understand the differences, keys and evidence](docs/EXPERIENCES.md). Start with
the AI application for the product experience; use MCP to explore the supported
numeric integration. If trial access is unavailable, arrange a demo via **gen@afhe.io**.

MCP helps users **learn how FHE works, integrate supported encrypted calculations
into applications, and explore their potential**. Start with a guided public
lesson, then map your own use case to its computation, keys and result workflow.
The public demo needs installation and host configuration. Confidential application
integration also needs local encryption, key custody and authenticated service
setup; browser WASM integration is planned. [From learning to building](docs/BUILD-WITH-AURA.md).

The AI application is accessed separately; **this package does not run model
inference**. Its executable tools provide encrypted numeric computation. Aura's
confirmed FHE database and FHE-AI LLM inference applications are completed and
available on request via **gen@afhe.io**. [中文说明](README.zh-CN.md).

## Install and connect

[![Cursor](https://img.shields.io/badge/Cursor-Setup-111827?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#cursor)
[![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-Setup-D97757?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#claude-desktop)
[![VS Code](https://img.shields.io/badge/VS_Code-Setup-007ACC?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#vs-code)
[![Other MCP clients](https://img.shields.io/badge/Other_MCP_clients-Setup-475569?style=for-the-badge)](https://github.com/aurafhe-official/mcp/blob/main/docs/QUICKSTART.md#other-mcp-clients)

These buttons open instructions. Install [Node.js 20+](https://nodejs.org/en/download),
then run these two commands in Terminal (macOS/Linux) or PowerShell (Windows):

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config cursor --demo
```

Use `claude` or `vscode` instead of `cursor` for those apps. Paste the generated
settings into your app's MCP configuration and reconnect.
[Exact steps and paste locations](docs/QUICKSTART.md). No Git, npm account, local
computation engine or demo key setup is needed. Settings must be generated on the
machine that runs the MCP; paths from a cloud workspace do not work on your laptop.

Then ask:

> What can I do with Aura? Show me the AI application first, then explain what I can run here.

Your assistant explains the published AI benchmark and the three experiences:
the separate AI application, application evaluations, and the MCP integration.
Within MCP, choose the optional public-sample lesson or the developer tools.
Connecting alone does not start a chat or
calculation. In clients with MCP prompts, choose **What can I do with Aura?**
(`aura_demo`). The overview works without a backend connection; a separate status
check or learning lesson checks the service.

This is release **0.5.0-rc.8**, an explicitly labelled preview. To pin it, install
`@aurafhe/mcp@0.5.0-rc.8`. To update an existing installation, run the installation
command again, regenerate settings and fully restart your client.

## What you can run here today

- Add, subtract, multiply and divide encrypted integers and floats.
- Compose sums, products, float averages and weighted sums on the coprocessor.
- Discover available operations, measure request latency and save encrypted results.
- Explore application access and distinguish published benchmarks from live observations.

Numeric arithmetic is a core FHE use case. Binary-operation support is a planned
capability milestone; it is not required for numeric computation to be homomorphic.
An application uses these building blocks with its own input, key and output
workflow. SQL, retrieval and model inference are not current MCP tools.
[Tool reference](docs/PROTOCOL.md).

## Try the optional learning lesson

> Teach me encrypted computation using Aura's public sample lesson.

The assistant calls `aura_start` with `experience: "learn"`, explains FHE, prepares
encrypted public samples, requests a calculation and saves the encrypted result.
It handles identifiers for you. Ask questions or say “one step at a time.”
The `aura_learn` MCP prompt starts this same lesson.

The first example combines public totals 25 and 17. Expected sum: 42. The MCP
returns encrypted data; the separate synthetic verifier checks actual numerical
results outside the conversation. Follow-up samples 7.5, 2.5 and 2 support an
encrypted average. [Observed checks and reproduction](docs/VERIFICATION.md).

**Public-sample demo:** Aura manages its demo keys and can decrypt its demo data.
Use public examples here. Confidential deployments need a verified key-custody
and authorization design. Anything entered in your host assistant is visible to
that assistant provider. [Security model](docs/SECURITY-MODEL.md).

## Build with Aura

Describe your application to the assistant using public or invented information.
It can help map your task to available operations and explain the client/server
configuration you need. [Integration steps and the path to simpler setup](docs/BUILD-WITH-AURA.md).

The package contains the connection adapter, not the proprietary computation
engine. It accepts no custom plaintext, secret keys or arbitrary file paths in
tool arguments. Operator-provisioned encrypted bundles require an authenticated
compute-only deployment and separate recipient processing; this path is not
Verified mode. The unpublished reference branch is a separate engineering fixture.

[Application walkthrough](docs/AI-DEMO.md) · [Investor demo](docs/INVESTOR-DEMO.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Verification](docs/VERIFICATION.md) ·
[Security](SECURITY.md)
