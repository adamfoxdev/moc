# Proposal: {{PROJECT_NAME}}

**Prepared for:** {{CLIENT_NAME}}, {{CLIENT_CONTACT_NAME}} ({{CLIENT_CONTACT_TITLE}})
**Prepared by:** Northbound Consulting, {{LEAD_NAME}}
**Date:** {{DATE}}  **Valid until:** {{DATE + 30 days}}
**Reference:** {{PROPOSAL_ID}}

> How to use: replace every `{{PLACEHOLDER}}`, keep the one engagement type that applies (delete the others in section 4), and remove this note and all guidance in *italics* before sending. Pull prices from `PRICING.md` and confirm them against the current rate card.

---

## 1. Summary

*Three to five sentences, in the client's language: what they have, what they need, what we propose, what it costs, when it is done.*

{{CLIENT_NAME}} has {{CURRENT_SITUATION, e.g. "a prototype built with Lovable that 40 pilot users rely on"}}. They need {{OUTCOME, e.g. "a secure, supported production service by Q1"}}. We propose {{ENGAGEMENT}} for {{PRICE}} over {{DURATION}}, delivering {{HEADLINE_DELIVERABLE}}.

## 2. Understanding of your situation

*Show you listened. Keep to facts the client has told us or we have verified.*

- **Business goal:** {{GOAL}}
- **Current system:** {{DESCRIPTION, how it was built, tools used, hosting, users}}
- **Data and integrations:** {{DATA_SOURCES, SYSTEMS}}
- **Constraints:** {{COMPLIANCE, DEADLINE, BUDGET, TEAM, EXISTING MICROSOFT LICENSING}}
- **Known risks:** {{RISKS RAISED BY CLIENT OR FOUND ON FIRST LOOK}}
- **Success looks like:** {{MEASURABLE CRITERIA}}

## 3. Approach

*Pick the relevant path; delete the rest.*

**Vibe migration**
1. **Assess:** code, dependency, security and data-flow review; risk-rated findings and fixed-price plan.
2. **Harden:** authentication, secrets, validation, dependencies, data model, error handling.
3. **Test:** characterization tests around current behavior, then CI quality gates.
4. **Deploy:** infrastructure as code, environments, pipelines, observability, backups.
5. **Support:** SLAs, runbooks and a named team.

**1-week PoC:** Day 1 framing and access, days 2-4 build the thinnest slice proving the riskiest assumption, day 5 demo, findings, estimate and production plan.

**AI / LLM add-on:** use case definition and evaluation set, build on {{Azure AI Foundry / Azure OpenAI}}, guardrails and cost controls, integration with {{EXISTING_SYSTEM}}, measured quality report.

**Application development:** discovery, architecture, iterative delivery in {{2}}-week sprints, test automation, deployment and handover.

## 4. Engagement and scope

*Keep one block.*

### Option A. Fixed-price project
| Item | Detail |
|---|---|
| Tier | {{e.g. Standard automatic migration}} |
| Duration | {{WEEKS}} weeks from kickoff |
| Price | {{AMOUNT}}, fixed |
| Billing | {{e.g. 40% at kickoff, 30% at milestone 1, 30% at acceptance}} |

### Option B. Retainer
| Item | Detail |
|---|---|
| Tier | {{Advisory / Embedded / Fractional CTO}} |
| Monthly hours | {{HOURS}}, rolling over one month |
| Price | {{AMOUNT}} per month |
| Term | {{3}}-month minimum, then {{30}} days notice |

### Option C. Support subscription
| Item | Detail |
|---|---|
| Tier | {{Essential / Standard / Premium}} |
| Applications covered | {{APP_LIST}} |
| Price | {{AMOUNT}} per month per application |
| Term | {{12}} months, auto-renewing |

## 5. Deliverables

| # | Deliverable | Acceptance criteria | Target date |
|---|---|---|---|
| 1 | {{e.g. Assessment report}} | {{e.g. Findings rated by severity, reviewed in a walkthrough}} | {{DATE}} |
| 2 | {{DELIVERABLE}} | {{CRITERIA}} | {{DATE}} |
| 3 | Handover pack | Architecture, runbooks and access transferred; walkthrough held | {{DATE}} |

## 6. Out of scope

*Be specific. Anything not listed in section 5 is out of scope and handled by change request.*

- {{e.g. Rewrite into a different language or framework}}
- {{e.g. Third-party licence or cloud consumption costs}}
- {{e.g. Data cleansing beyond the agreed sources}}

## 7. Assumptions and client responsibilities

- Access to source code, environments and data by {{DATE}}.
- A named decision-maker responding within {{2}} business days.
- Availability of {{SME}} for {{HOURS}} per week.
- Cloud and model usage is billed to the client's subscription or passed through at cost.
- {{OTHER_ASSUMPTIONS}}

If an assumption proves false, we will raise it promptly and agree any change in scope, price or date before proceeding.

## 8. Timeline

| Phase | Start | End | Milestone |
|---|---|---|---|
| Kickoff | {{DATE}} | {{DATE}} | Access confirmed, plan agreed |
| {{PHASE}} | {{DATE}} | {{DATE}} | {{MILESTONE}} |
| Handover | {{DATE}} | {{DATE}} | Acceptance sign-off |

## 9. Team

| Role | Name | Responsibility | Allocation |
|---|---|---|---|
| Engagement lead / Principal | {{NAME}} | Accountable for outcome and quality | {{%}} |
| Senior engineer | {{NAME}} | {{AREA}} | {{%}} |
| Engineer | {{NAME}} | {{AREA}} | {{%}} |

## 10. Investment

| Line | Amount |
|---|---|
| {{LINE_ITEM}} | {{AMOUNT}} |
| {{LINE_ITEM}} | {{AMOUNT}} |
| **Total** | **{{TOTAL}}** |

- Prices are in {{CURRENCY}}, exclude tax, and exclude cloud and model usage.
- Credit: the assessment or PoC fee ({{AMOUNT}}) is credited if this proposal is signed within 30 days of delivery.
- Payment terms: {{NET 30}}. Expenses pre-approved, at cost.
- Change requests are estimated before work starts and billed at the rate card: Principal {{$275}}/hr, Senior {{$200}}/hr, Engineer {{$150}}/hr.

## 11. Risks and how we manage them

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| {{e.g. Hidden security issues in generated code}} | {{H/M/L}} | {{H/M/L}} | {{e.g. Security review in week 1; findings drive plan}} |
| {{RISK}} | | | |

## 12. Security, data and IP

- Work happens in {{client tenant / our tenant}}; credentials are held in a secrets manager and revoked at close.
- Client data is used only for this engagement and deleted or returned at close, unless agreed otherwise.
- Northbound does not use Client data to train its own models, and configures AI services so Client data is not used to train provider models where the provider offers that setting (the default for Azure OpenAI). See the MSA, clause 9.1.
- Ownership: {{deliverables become the client's property on payment; pre-existing Northbound tooling remains ours and is licensed for use with the deliverables}}.
- Confidentiality is governed by {{NDA reference / MSA clause}}.

## 13. Warranty and support

- {{30}}-day warranty on delivered work: defects against the agreed acceptance criteria are fixed at no charge.
- Post-launch support options are in section 4, Option C.
- AI output quality is measured against the evaluation set agreed in section 5; we do not warrant that a model will be error-free.

## 14. Why Northbound

- 25 years of delivery across global industries and verticals.
- A defined route from prototype to production to supported service.
- Depth in the Microsoft stack and Azure AI Foundry.
- AI added alongside the systems you already run.

*Add one or two relevant references or case studies here when available. Do not include any that are not real and cleared for use.*

## 15. Next steps

1. Review this proposal; we can walk through it on a call.
2. Sign below or reply with approval by {{DATE}}.
3. We issue the first invoice and schedule kickoff for {{DATE}}.

## 16. Acceptance

This proposal, together with {{MSA / terms reference}}, forms the agreement between the parties.

| | Northbound Consulting | {{CLIENT_NAME}} |
|---|---|---|
| Name | | |
| Title | | |
| Signature | | |
| Date | | |

---

## Internal checklist (delete before sending)

- [ ] Scope reflects an assessment or PoC where one was possible
- [ ] Price checked against `PRICING.md` and target margin
- [ ] Out-of-scope list is specific
- [ ] Assumptions cover access, decision-maker and cloud costs
- [ ] Security, IP and warranty wording reviewed by legal
- [ ] No unverified claims or references
- [ ] Placeholders and guidance text removed
