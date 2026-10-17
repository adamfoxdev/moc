# Statement of Work: 1-Week Proof of Concept

> **Draft template.** Replace every `{{PLACEHOLDER}}`, keep the options that apply and delete the rest, then remove this note. Prices come from `PRICING.md`; confirm them first. This SOW sits under the Master Services Agreement (`MSA.md`); have counsel review both before first use.

**SOW number:** {{SOW_NO}}
**Date:** {{DATE}}
**Governing agreement:** Master Services Agreement between {{NORTHBOUND_LEGAL_NAME}} ("Northbound") and {{CLIENT_LEGAL_NAME}} ("Client") dated {{MSA_DATE}}
**Proposed start date:** {{START_DATE}}  **Demo date:** {{START_DATE + 4 working days}}
**Valid until:** {{DATE + 30 days}}

---

## 1. Objective

Build and demonstrate, in five working days, a working proof of concept that tests whether {{HYPOTHESIS, e.g. "the existing prototype can be hardened and deployed to Azure for 500 users" / "an LLM assistant can answer support questions from the knowledge base with at least 85% accuracy"}}.

At the end Client will have: a running demonstration, evidence of what works and what does not, and a costed plan for production, so Client can make a go / no-go decision.

## 2. PoC type

*Keep one.*

- [ ] **Standard PoC.** Fixed price {{$12,500}}. For prototype hardening, migration feasibility, integration feasibility, or a new application idea.
- [ ] **AI / Foundry PoC.** Fixed price {{$18,500}}. Adds an Azure AI Foundry environment, a retrieval or agent prototype, and a small evaluation set with measured quality.
- [ ] **Extended PoC (two weeks).** Fixed price {{$28,000}}. Adds integration with one existing system and a security and cost review. *Use sections 5 and 6 with a 10-day schedule.*

## 3. Scope

### 3.1 In scope

| # | Activity | Detail |
|---|---|---|
| 1 | Framing | One kickoff session to confirm hypothesis, success criteria, data and access |
| 2 | Review of current state | {{e.g. Light review of the prototype repository and architecture; list of top risks}} |
| 3 | Build | {{DESCRIBE THE THIN SLICE, e.g. "deploy the prototype to an Azure test environment behind Entra ID with CI/CD and monitoring" / "retrieval assistant over the 200-document sample set with citations"}} |
| 4 | Data | Use of {{DATA SOURCES}}, limited to {{VOLUME / SAMPLE / ENVIRONMENT}} |
| 5 | Evaluation | {{e.g. Run the agreed test set; record results against the success criteria}} |
| 6 | Findings and plan | Demo, findings report, effort estimate and production plan |

### 3.2 Out of scope

The following are not included unless agreed under change control (MSA clause 3.3):

- Production deployment, production data, load or penetration testing
- Full feature development or user-interface polish
- Data cleansing or migration beyond the agreed sample
- Integration with systems not listed above
- Training, ongoing support and warranty beyond the PoC deliverables
- {{OTHER}}

### 3.3 Success criteria

*Agree these before day 1. Make them measurable.*

| # | Criterion | Target | Measure |
|---|---|---|---|
| 1 | {{e.g. Prototype runs in Azure test environment with authentication}} | {{Yes / No}} | {{Demo}} |
| 2 | {{e.g. Answer quality on test set}} | {{>= 85% correct, cited}} | {{Evaluation run}} |
| 3 | {{e.g. Response time}} | {{< 5 seconds p95}} | {{Test run}} |
| 4 | Production plan produced | Yes | Report delivered |

A PoC tests an idea. Missing a success criterion is a valid, useful result; the fee is not contingent on meeting the targets.

## 4. Deliverables and acceptance

| # | Deliverable | Acceptance criteria | Due |
|---|---|---|---|
| 1 | Working PoC | Runs in the agreed environment and demonstrates the scope in 3.1 | Day 5 |
| 2 | Demo | Live walkthrough of the PoC against the success criteria | Day 5 |
| 3 | Findings report (about 10 pages) | Results vs success criteria, key risks, architecture, AI evaluation results (if applicable) | Day 5 |
| 4 | Production estimate and plan | Phased plan, effort range, team, risks, and fixed-price quote options for the follow-on | Day 5 |
| 5 | Source code and configuration | Delivered in the agreed repository or tenant | Day 5 |

Acceptance follows MSA clause 4, with a review period of **{{5}} business days**.

## 5. Schedule

| Day | Activity | Client involvement |
|---|---|---|
| Before day 1 | Access, data and environments ready | Client provides access and an SME contact |
| Day 1 | Kickoff, framing, access verification | 2 hrs, decision-maker and SME |
| Days 2 to 4 | Build and evaluate; short daily check-in | 30 min per day, SME |
| Day 5 | Demo and findings readout; production plan | 1.5 hrs, decision-maker and SME |

If access or data is not ready on day 1, the start date moves and the schedule slips day for day (see assumptions).

## 6. Team

| Role | Responsibility | Allocation |
|---|---|---|
| Engagement lead (Principal or Senior) | Accountable for outcome, framing, findings | Part time |
| Engineer | Build and evaluation | Full time for 5 days |
| {{Client SME}} | Domain answers, data access, daily check-in | About 1 hr per day |
| {{Client decision-maker}} | Success criteria, go / no-go | Kickoff and demo |

## 7. Fees and invoicing

| Item | Amount |
|---|---|
| {{Standard / AI / Extended}} PoC, fixed price | {{AMOUNT}} |
| **Total** | **{{AMOUNT}}** |

- **Invoicing:** {{50%}} on signature, {{50%}} on delivery of the demo and findings report. Payment terms per the MSA ({{30}} days).
- **Cloud and model costs:** {{Client's Azure subscription / passed through at cost, estimated at up to {{AMOUNT}}}}. Not included in the fixed price.
- **Fee credit:** The PoC fee is credited in full against the fees of a follow-on SOW (migration, build or AI add-on) signed within **30 days** of the demo.
- **Cancellation and rescheduling:** Rescheduling with at least 5 business days' notice is free. With less notice, or if the start is delayed by Client for more than 10 business days, Northbound may reschedule on its next availability and charge the committed costs of the reserved team, up to {{25%}} of the fee.

## 8. Assumptions and Client responsibilities

- Access to the repository, environments, accounts and sample data is provided before day 1, with credentials via a secure channel.
- A named decision-maker and SME are available as in section 5, with answers within one business day.
- Data provided is limited to the agreed sample, with sensitive and production personal data removed or masked (MSA clause 8.4) unless the parties agree otherwise in writing here: {{EXCEPTIONS}}.
- Client has authority to share the code and data provided, including AI-generated code (MSA clause 6.5).
- Required Azure subscriptions, quotas and AI model access (for example Azure OpenAI or Foundry deployments) are available or Northbound is given rights to create them in a sandbox. Model-quota delays may affect results.
- The PoC is built for demonstration. It is not production-ready, is not covered by the warranty or by a support commitment, and should not be used with live data or live users.
- Evaluation results depend on the sample data and may not be representative of production performance.
- {{OTHER_ASSUMPTIONS}}

## 9. Data, security and AI use

- Work is performed in {{Client's tenant / Northbound's sandbox tenant}}. If in Northbound's tenant, Client data is deleted within {{15}} days of the demo unless Client requests earlier or the parties proceed to a follow-on.
- Credentials are held in a secrets manager and revoked at close.
- AI services are configured so that Client data is not used to train provider models (MSA clause 9.1). Approved tools for this PoC: {{e.g. Azure OpenAI / Foundry in the specified tenant, GitHub Copilot with training disabled, Claude Code with data retention disabled}}.
- No security testing of Client systems is included without separate written authorisation.

## 10. Intellectual property

IP follows MSA clause 6. For this PoC:

- Client Materials remain Client's. 
- PoC code is assigned to Client on payment, excluding Northbound Consultant Tools.
- {{Optional: Northbound may reuse generic, non-client-specific learnings and tooling.}}

## 11. Next steps and acceptance

Sign below to confirm scope and fees. On signature Northbound will invoice the first instalment, issue an access checklist, and confirm the kickoff date.

| | {{NORTHBOUND_LEGAL_NAME}} | {{CLIENT_LEGAL_NAME}} |
|---|---|---|
| Name | | |
| Title | | |
| Signature | | |
| Date | | |

---

## Appendix A. Pre-kickoff access checklist

*Send with the signed SOW.*

- [ ] Source repository access (read; write to a branch if hardening) 
- [ ] Architecture notes, README, or a 30-minute walkthrough from the original builder
- [ ] Which AI tool created the prototype and any prompt history
- [ ] Hosting and database details; copy of the schema; non-production data sample
- [ ] Azure subscription or resource group with contributor access (or approval to use Northbound's sandbox)
- [ ] AI model access or quota (Azure OpenAI / Foundry) if applicable
- [ ] Authentication provider details (Entra ID tenant, test users)
- [ ] Integration endpoints and test credentials
- [ ] Named decision-maker and SME with calendar availability for the week
- [ ] Any compliance, security or data-residency requirements

## Appendix B. Findings report outline

1. Executive summary and recommendation (go, no-go, go with changes)
2. Results against success criteria
3. Current-state findings: architecture, security, data, scalability, maintainability
4. AI evaluation results (if applicable): test set, metrics, failure analysis, cost per request
5. Risks and unknowns
6. Production plan: scope, phases, team, timeline, effort range, price options
7. Appendices: repository inventory, dependency and licence notes, environment details

## Internal checklist (delete before sending)

- [ ] Success criteria are measurable and agreed with the decision-maker
- [ ] A realistic thin slice, not a mini project
- [ ] Access and data confirmed before committing the team
- [ ] Out-of-scope list is specific
- [ ] Price checked against `PRICING.md`; cloud costs addressed
- [ ] Data in scope is non-production or masked
- [ ] Follow-on options and credit expiry stated
- [ ] Placeholders and guidance text removed
