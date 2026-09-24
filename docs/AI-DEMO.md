# Explore Aura AI

Start with a task people understand: ask AI to make a useful summary, identify
risks and answer a follow-up question. FHE is the computation foundation;
the application must also define where inputs are encrypted and who can read them.

## Published performance

| Item | Aura website report |
| --- | --- |
| Model | GPT-OSS-20B |
| Parameter count | 20 billion |
| Generation speed | 20+ tokens/second |
| Hardware | One RTX PRO 6000 Blackwell GPU |
| Prompt read-in | Below 2.3 seconds |
| Evidence | Aura-reported internal benchmark; independent reproduction remains outstanding |

[Source: afhe.io](https://afhe.io/#status), checked 24 September 2026.
These figures describe the website benchmark. They are not a measurement of your
current session, a guarantee for every prompt, or an MCP inference capability.
Keep the model identity and timing scope attached to the benchmark.

## Access the application

**Aura AI Chat is invitation-only.** Existing invitees can use
[chat.afhe.io](https://chat.afhe.io). To join, [request an invitation](mailto:gen@afhe.io?subject=Aura%20AI%20Chat%20invitation)
or arrange a demonstration via **gen@afhe.io**. Installing MCP does not grant
Chat access; the public MCP learning demo does not require an invitation.

[chat.afhe.io](https://chat.afhe.io) is Aura's chat application address, separate
from the MCP connection. **Access check, 24 September 2026:** the service failed
its HTTPS certificate hostname check. The hosting configuration needs correction
before this connection can be verified. We could not run the AI application or
measure its performance. If access fails, arrange a demonstration via **gen@afhe.io**;
do not bypass a browser certificate warning.

The numeric MCP connection uses a different service and can still be tried.
This package does not submit prompts to Aura Chat or return model-generated text.

## A useful first task

Once invited and the application is reachable over valid HTTPS, use this invented memo:

> Fictional product memo: Project Maple launches in eight weeks. Two pilot
> customers need CSV export; the integration is three weeks behind schedule.
> The team has one engineer available for either export work or onboarding
> improvements. Summarize the situation, identify three risks, and propose
> three questions the team should answer before choosing its next step.

Then ask: “What changes if we move the launch back by two weeks?”

Let the visitor change the task. Show the actual generated answer, time to first
token, output token count and generation speed if the application measures them.
If those metrics are absent, label them unmeasured. A transcript does not by itself
prove encrypted execution or answer quality.

The [three-experience guide](EXPERIENCES.md) explains the role of the client, server
and secret key. The demo should show, in plain language, what reaches the service, which
inference steps are encrypted, where the secret key lives and where the answer
becomes readable. Show observations as observations and design goals as design goals.
Use public or invented content until the application's actual privacy model has
been evaluated. Do not infer the AI application's key custody from the arithmetic
demo's backend-managed keys.

## Where MCP fits

Today this package explains the application and its evidence, discovers available
numeric operations, runs public encrypted arithmetic and exports encrypted results.
Its `aura_start` overview offers the application, optional lesson and tool reference.

Exposing AI inference through MCP requires a documented inference API, authentication,
input-encryption and key-custody integration, cancellation, response limits and
an authorized output path. An application URL or an arithmetic benchmark cannot
substitute for that integration. The required service contract has not been supplied
to this package; there is no hidden or simulated inference endpoint.

For confidential documents, avoid routing readable content through another hosted
assistant before encryption. Local preparation and encrypted references need to be
part of that integration; revealed answers become visible to their recipient.

[Connect the current MCP](QUICKSTART.md) · [Current tools](PROTOCOL.md) ·
[Investor walkthrough](INVESTOR-DEMO.md) · [Privacy model](SECURITY-MODEL.md)
