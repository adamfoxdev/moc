# AI Acceptable-Use and Tooling Policy

**Owner:** {{POLICY_OWNER, e.g. Managing Principal}}  **Version:** 0.1 draft  **Effective:** {{DATE}}  **Review:** every 6 months, and whenever a tool, provider term or law changes

> **Draft.** This is an internal policy template. Replace every `{{PLACEHOLDER}}`, check the tool list against what Northbound really licenses and how each tool is really configured, and have counsel review the sections on client data and regulation. Keep it truthful: this policy is referenced by `NDA.md` (section 3.5), `MSA.md` (section 9), `DPA.md` (section 12 and Annex 3) and `SOW_POC.md` (section 9), so what it says is what clients will rely on. Delete this note before issuing.

## 1. Purpose and scope

Northbound builds with AI, migrates AI-generated code, and adds AI to client systems. This policy sets how our people use AI tools so that we protect client data, ship dependable work, and can tell clients exactly what we do.

It applies to all Northbound employees, contractors and subcontractors ("**personnel**") using AI tools for any work involving client or Northbound information. It covers coding assistants and agents, chat assistants, meeting tools, model APIs, automation tools, and any new AI capability embedded in other software.

## 2. Principles

1. **Client data is protected first.** Use only approved tools, configured as approved, for client work.
2. **Humans are accountable.** AI assists; the engineer who commits, sends or signs is responsible for the result.
3. **Verify, don't trust.** AI output is a draft until reviewed and tested.
4. **Be transparent.** We tell clients which AI tools we use and we label AI-generated deliverables where it matters.
5. **Least privilege.** AI agents get the minimum access, for the minimum time.

## 3. Tool tiers

| Tier | Meaning | Client confidential data | Personal data |
|---|---|---|---|
| **Approved** | Reviewed, licensed by Northbound, configured per section 4 | Yes, within the client's authorisation (section 5) | Only if the DPA names the tool in Annex 3 |
| **Client-provided** | Tool or tenant supplied by the client (for example their Azure OpenAI) | Yes, under the client's terms | Under the DPA |
| **Restricted** | Allowed only with prior written approval from the Policy Owner for a specific use | Case by case | No |
| **Prohibited** | Not to be used for work | No | No |

### 3.1 Approved tools (confirm before issuing)

| Tool | Use | Required configuration |
|---|---|---|
| {{Azure OpenAI / Azure AI Foundry}} in a Northbound or client tenant | Model API for prototypes and features | Region set per client; abuse-monitoring data-retention reviewed; no training on data (default for Azure); managed identity; no public endpoints where practical |
| {{GitHub Copilot Business/Enterprise}} | Coding assistant | Business tier; prompts and suggestions excluded from model training; public-code match filtering on; content exclusion for client secrets and config |
| {{Claude Code / Claude for Work}} | Coding agent and assistant | Commercial or team plan with training and retention terms that exclude use for model training; agent permissions per section 7 |
| {{Microsoft 365 Copilot}} | Documents, email, meetings internal to Northbound | Tenant-governed; sensitivity labels honoured |
| {{Other tool}} | {{Use}} | {{Configuration}} |

### 3.2 Restricted examples

- Free or consumer versions of AI chat tools, for any non-public information (prohibited for client data)
- New AI features switched on inside an existing tool, until reviewed
- Local or open-weight models run on personal hardware
- AI meeting recorders and transcription bots joining client calls: allowed only with every participant's consent and an approved tool

### 3.3 Prohibited

- Entering client confidential information, source code, credentials or personal data into any tool that is not Approved or Client-provided
- Using personal accounts for work, or work data in personal accounts
- Tools that retain prompts for training, or whose terms we have not reviewed
- Using AI to make a decision with significant effect on a person without human review
- Generating or distributing deceptive content, impersonation, malicious code, or content that infringes others' rights

## 4. Procurement and approval of new tools

Before a tool moves from Restricted to Approved, the Policy Owner (with {{security lead}}) checks and records:

- [ ] The vendor's terms: no training on our inputs and outputs by default; retention and deletion; sub-processors; data location; incident notice
- [ ] Commercial or enterprise plan with a data processing agreement
- [ ] Security posture: certifications or reports (SOC 2, ISO 27001), SSO and MFA support, audit logs
- [ ] Admin controls to enforce configuration across the team
- [ ] Output risks: licence or copyright indemnities, public-code filtering
- [ ] Whether it needs adding to client sub-processor lists (`DPA.md` Annex 3) and which clients must be told
- [ ] Cost, quota and data-residency effects

Record the decision, date, owner and review date in the tool register ({{LOCATION}}). Re-review at each material vendor-terms change and at least annually.

## 5. Client data rules

5.1 **Default.** Before using any AI tool on a client's materials, check the contract (MSA, SOW, NDA and DPA) and the client's own AI rules. The stricter rule wins.

5.2 **Disclose.** Each client is told, in the SOW or onboarding, which AI tools we use on their work. Some clients will restrict tools or prohibit AI use; follow that.

5.3 **Classify what you are about to input:**

| Class | Examples | Allowed in approved AI tools? |
|---|---|---|
| Public | Marketing copy, public docs | Yes |
| Internal | Our own processes and templates | Yes |
| Client confidential | Source code, designs, business data | Yes, in Approved or Client-provided tools only, and only where the client contract allows |
| Personal data | Names, emails, user records | Only if masked, or the DPA lists the tool and region |
| Special-category, payment, health, credentials | Medical or biometric data, card numbers, API keys, passwords, tokens | **No.** Never put these into prompts, repositories or tool context |

5.4 **Minimise and mask.** Use the least data needed. Prefer synthetic or masked data for testing and prompt development.

5.5 **No training.** Never use client data to train, fine-tune or evaluate-for-training a model without the client's written approval. Do not use one client's data to benefit another.

5.6 **Secrets.** Never paste credentials into prompts. Use secrets managers and environment variables; configure tools to exclude `.env`, key and config files from context. If a secret is exposed to an AI tool, treat it as a security incident (section 10) and rotate it.

5.7 **Regions and tenants.** Where a client requires a data region or its own tenant, use that tenant's AI services, not ours.

## 6. Quality and review of AI output

6.1 **Review everything.** No AI-generated code, document or analysis goes to a client without a named human reviewing it.

6.2 **Code standards.** AI-generated code meets the same standard as any code: code review, automated tests, static analysis, dependency scanning, secret scanning. A pull request must say if it is substantially AI-generated and the reviewer must read it, not skim.

6.3 **Common AI failure checks.** Reviewers specifically check for: invented APIs or packages (supply-chain risk), insecure defaults, missing authorisation checks, input validation gaps, hard-coded secrets, outdated or vulnerable dependencies, licence problems, silent error handling, and tests that assert nothing.

6.4 **Licence and provenance.** Keep public-code matching filters on. Do not paste third-party code with incompatible licences. Record significant AI-generated components when a client asks for provenance.

6.5 **Facts and citations.** Check claims, figures, legal or regulatory statements, and references in AI-assisted documents against primary sources. Never present unverified AI output as fact.

6.6 **Client-facing AI features** (what we build): follow section 9.

## 7. AI agents and automation

7.1 Agents that can read repositories, run commands, call APIs or write files are treated as a privileged user.

7.2 Rules for agents:

- Use least privilege: read-only by default; scoped, short-lived credentials; no production credentials or direct access to production data
- Run in a sandbox or development environment, not on production systems
- Require human approval for destructive, outbound or irreversible actions (deleting data, pushing to protected branches, sending email, deploying, spending money, changing permissions)
- Restrict network access and allowed tools where the product supports it
- Treat content the agent reads (web pages, issues, documents, tool output) as untrusted, as it may contain instructions aimed at the agent (prompt injection); do not let agents act on instructions found in data
- Keep logs of agent actions on client work for {{90}} days
- Never give an agent a client's credentials or leave it running unattended on client systems without written agreement

7.3 Building agents or integrations for clients: apply section 9, and document each tool's permissions and the approval points.

## 8. Intellectual property and confidentiality

- Our outputs are subject to the IP terms in the client's MSA. Do not claim that AI-generated material is protected where it may not be, or promise warranties we do not give (`MSA.md` 6.5).
- Do not feed our own confidential information (pricing, strategy, other clients' work) into tools beyond the Approved list.
- Mark AI-generated content internally where it affects rights or reliance.

## 9. Building AI features for clients

Standards for LLM add-ons, agents and AI platforms we deliver:

1. **Define the use case and the harm.** Record purpose, users, data, failure modes and who can be affected.
2. **Evaluate.** Build an evaluation set before launch; measure quality, safety and cost; re-run on every model or prompt change; share results with the client (`SOW_POC.md`).
3. **Ground and cite** answers in the client's data where practical; respect existing permissions (a user must not see through the AI what they can't see directly).
4. **Guardrails.** Content filtering, input and output validation, prompt-injection defences, rate limits, spend limits, and tool allow-lists.
5. **Human oversight.** Design for review of consequential outputs; no fully automated significant decisions about people without legal review.
6. **Transparency.** Users are told when they are interacting with AI; AI-generated content is labelled where required.
7. **Privacy and security.** Data minimisation, data-region choices, retention settings, logging without unnecessary personal data, and a DPA when personal data is processed.
8. **Operate.** Monitoring, incident response, versioning of prompts and models, a rollback path, and a plan for model deprecation.
9. **Regulation.** Identify applicable AI and sector rules (for example the EU AI Act risk categories, sector regulators). Clients as deployers are responsible for their obligations (`MSA.md` 9.4), but we flag risks and do not build prohibited uses.

## 10. Incidents and exceptions

10.1 **Report immediately** to {{security contact/channel}} if you suspect: client or personal data entered into an unapproved tool; a secret exposed to an AI tool; an agent taking an unintended action; a prompt-injection attack; or AI output sent to a client with a material error.

10.2 The Policy Owner assesses, contains, notifies affected clients within the contractual timelines (72 hours for personal data breaches under `DPA.md`), and records lessons learned. Reporting in good faith will not be penalised.

10.3 **Exceptions** need written approval from the Policy Owner, stating scope, risks, safeguards and expiry, and are recorded in the tool register.

## 11. Training, monitoring and enforcement

- All personnel complete AI-use training on joining and annually ({{content: data classes, tool configurations, review standards, prompt injection, incident reporting}}).
- We may monitor use of company-provided tools, subject to law and our privacy notice.
- Breaches of this policy may lead to disciplinary action, up to termination of employment or contract. Subcontractor agreements must incorporate this policy.

## 12. Roles

| Role | Responsibility |
|---|---|
| Policy Owner | Maintains the policy and tool register; approves tools and exceptions; reviews incidents |
| Security lead | Reviews tool security; runs access reviews; incident response |
| Engagement leads | Apply the policy per engagement; tell clients which tools are used; get any client approvals |
| All personnel | Follow the policy; review all AI output; report incidents |

## Appendix A: One-page cheat sheet (for the team wiki)

**Before you prompt:** Is the tool Approved or Client-provided? Does the client's contract allow it? Is there anything in this prompt that is a secret or personal data?

**Never:** paste credentials, personal data or special-category data into AI; use personal or free accounts for work; let an agent touch production.

**Always:** review and test AI output; keep PRs honest about AI content; use least-privilege and sandboxes for agents; report mistakes fast.

**Unsure?** Ask {{contact}} before you proceed.

## Appendix B: Tool register template

| Tool | Version/plan | Owner | Approved for (data classes) | Configuration verified | Clients informed | Last review | Next review |
|---|---|---|---|---|---|---|---|
| {{}} | {{}} | {{}} | {{}} | {{date}} | {{list}} | {{date}} | {{date}} |

## Appendix C: Client disclosure wording (for SOW or onboarding)

> Northbound uses the following AI tools in delivering the Services: {{TOOL LIST}}. These are used under commercial terms, configured so that your data is not used to train provider models, and operated under Northbound's AI Acceptable-Use and Tooling Policy. All AI-assisted output is reviewed by a Northbound engineer before delivery. Please tell us before kickoff if you want any of these tools excluded or restricted for your project.

## Drafting notes (delete before issuing)

- **Do not over-promise.** Every statement here becomes something a client can hold you to. Verify tool configurations (training opt-outs, retention, public-code filters) in the vendor admin consoles, and write down the date you checked.
- **Vendor terms change often.** Tool terms, retention defaults and plan features move quickly; keep the register current and re-check before relying on any claim.
- **Align with contracts.** `NDA.md` 3.5 forbids public AI tools and training with confidential information; `MSA.md` 9.1 and `DPA.md` 12.1 promise no training; `SOW_POC.md` 9 requires listing approved tools per engagement; `DPA.md` Annex 3 needs the AI services and regions. Anything this policy permits must not contradict those.
- **Client rules override.** Large and regulated clients often prohibit or limit AI tools; build a simple way to flag this per engagement (tool-restriction field in the project record).
- **Scale it.** For a small team, keep the register and training lightweight; consider ISO/IEC 42001 or a SOC 2 programme later.
- **Legal.** Have counsel check employment-monitoring wording, AI regulation references and subcontractor flow-down.
