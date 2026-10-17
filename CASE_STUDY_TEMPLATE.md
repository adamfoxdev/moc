# Case Study Template

> **How to use.** Copy this file per case study, fill every `{{PLACEHOLDER}}`, delete the guidance in *italics* and this note. Publish nothing until the approval checklist (section 5) is complete.
>
> **Rules that matter more than polish:**
> 1. **Every number must be real, sourced and client-approved.** No invented clients, quotes or metrics. If a result can't be evidenced, describe it qualitatively or leave it out.
> 2. **Client permission first.** `MSA.md` clause 15.6 bars naming a client or using its logo without written consent. Ask for the consent level in the SOW at signing (level 3 allows a case study), then get the client's written approval of the final text, figures and quotes before publishing. Honour withdrawal within 30 days.
> 3. **Protect confidentiality.** Don't reveal architecture details, vulnerabilities, data or people that the client or the NDA/MSA (clause 7) protects. If the client won't be named, anonymise (section 4).
> 4. **Be honest about AI.** Say what was AI-generated, what was human-engineered, and what the AI features achieved, measured against the agreed evaluation (`SOW_POC.md`).

---

## 1. Case study (public version)

### Title

*Outcome-led, under 12 words. Example: "From weekend prototype to a secure service for 2,000 users in six weeks".*

{{TITLE}}

### At a glance

| | |
|---|---|
| **Client** | {{Name, or anonymised description, e.g. "A regional logistics provider (400 staff)"}} |
| **Industry** | {{VERTICAL}} |
| **Engagement type** | {{Vibe migration (consulted / automatic) / 1-week PoC / LLM add-on / App development / Retainer / Support}} |
| **Duration** | {{WEEKS}} |
| **Stack** | {{e.g. .NET, Azure App Service, Azure SQL, Entra ID, Azure AI Foundry}} |
| **Headline result** | {{ONE MEASURED OUTCOME, e.g. "Prototype live in production with SSO, monitoring and 99.9% measured availability"}} |

### The challenge

*Three to five sentences, from the client's point of view. What was the business need, what did they have, and why was it not good enough? For a vibe migration, name the tool category (for example "an AI-generated prototype") only if the client approves.*

{{CLIENT}} had {{SITUATION}}. It {{WORKED / DEMOED / WAS ALREADY USED BY X PEOPLE}}, but {{PROBLEM: no authentication, secrets in the repo, no tests, no way to deploy or support it, data stored insecurely, compliance gap, would not scale}}. They needed {{OUTCOME}} by {{DEADLINE OR DRIVER}}.

### What we found

*Optional but powerful for migration work. Findings from the assessment, in plain language. No exploitable details.*

- {{FINDING 1, e.g. "No role-based access: any signed-in user could see all records"}}
- {{FINDING 2}}
- {{FINDING 3}}

### Our approach

*Three to five steps in the order they happened. Use the firm's pipeline vocabulary where it fits: Assess, Harden, Test, Deploy, Support.*

1. **{{Assess}}:** {{what was done and decided}}
2. **{{Harden}}:** {{...}}
3. **{{Test}}:** {{...}}
4. **{{Deploy}}:** {{...}}
5. **{{Support}}:** {{...}}

*For AI add-ons, include: the use case, how quality was evaluated, the guardrails, how data stayed within the client's environment.*

**Why this approach:** {{KEY DECISION AND TRADE-OFF, e.g. "Keep the working front end and rebuild the data layer rather than a full rewrite"}}

### The solution

*What exists now, in plain language, with one simple diagram if possible. Name technologies only where useful to the reader.*

{{DESCRIPTION}}

*Diagram: {{FILE or description; show the flow, not internal hostnames or secrets}}*

### Results

*Only measured, dated, approved figures. State the baseline and the period. If you can't evidence it, cut it.*

| Measure | Before | After | How measured |
|---|---|---|---|
| {{e.g. Time to deploy a change}} | {{2 days, manual}} | {{20 minutes, automated pipeline}} | {{CI/CD logs, {{month}}}} |
| {{e.g. Automated test coverage of critical flows}} | {{0}} | {{{N} tests; critical paths covered}} | {{test report}} |
| {{e.g. High-severity findings open}} | {{N from assessment}} | {{0}} | {{re-test report}} |
| {{e.g. AI answer accuracy on the agreed test set}} | n/a | {{N%}} | {{evaluation run, {{date}}}} |
| {{e.g. Cost per query / monthly cloud cost}} | {{}} | {{}} | {{Azure cost report}} |

**Qualitative outcomes:** {{e.g. "Pilot expanded from one team to the whole business", "Passed customer security review"}} 

### What the client says

> "{{QUOTE, exact words, approved by the speaker}}"
>
> {{NAME, TITLE, ORGANISATION}}

*Only a real quote the person has approved in writing. No quote is better than a weak or invented one.*

### Lessons learned

*Two or three honest takeaways for readers in a similar position. This builds credibility.*

- {{e.g. "AI-generated code gave a fast, valid spec; the data model was where the risk lived"}}
- {{LESSON 2}}

### What's next

{{e.g. "Phase 2 adds an LLM assistant over the knowledge base; the system is supported under a Standard subscription"}}

### Call to action

*Match the offer to the case study type.*

- Migration: **Book a free assessment call** to see what it would take to bring your prototype to production.
- PoC: **Test your idea in a week**, with a fixed-price proof of concept.
- AI add-on: **See how an LLM could fit your existing applications.**

---

## 2. Short versions (derive from the long version)

### Website card (about 40 words)

**{{TITLE}}**
{{ONE-SENTENCE CHALLENGE}} {{ONE-SENTENCE RESULT WITH ONE NUMBER}}
*{{Industry}} · {{Engagement type}} · {{Duration}}*

### LinkedIn post (about 120 words)

{{HOOK: the problem in one line}}

{{Client or anonymised description}} built {{WHAT}} with AI tools. It worked, but {{GAP}}.

In {{DURATION}} we {{3 VERBS: assessed, hardened, deployed}} it on {{STACK}}.

Result: {{MEASURED RESULT 1}}, {{MEASURED RESULT 2}}.

The lesson: {{ONE TAKEAWAY}}.

If you have a prototype that needs to grow up: {{LINK}}

### One-slide summary (for proposals and decks)

| Challenge | Approach | Result |
|---|---|---|
| {{ONE LINE}} | {{ONE LINE}} | {{ONE MEASURED LINE}} |

---

## 3. Interview guide

*Use in a 30-minute call with the client sponsor, around 2 to 8 weeks after go-live, once there is something to measure. Record only with permission.*

**Context**
1. What does your organisation do, and what was this system for?
2. Who uses it, and how many people?

**Challenge**
3. What had you built before we met, and how did it come about?
4. What worried you about running it as it was? Was there a trigger (customer, audit, outage, growth)?
5. What had you tried or considered, and why choose a partner?

**Engagement**
6. What was the engagement like? What stood out about how we worked?
7. Was there a moment you were glad you had us? Any bumps?

**Results**
8. What has changed since go-live? What numbers do you track? (Ask for the figures and where they come from.)
9. What did this unlock for the business?
10. What would have happened if you had left it as it was?

**Wrap-up**
11. What would you tell someone in your position?
12. May we use your name, logo, quote and the figures above? Which parts need your internal approval?

## 4. Anonymising

If the client will not be named:

- [ ] Describe by size, sector and region at a level that cannot identify them ("a regional logistics provider", not "a Midlands freight firm with 412 staff")
- [ ] Remove or round figures that identify the client (round to ranges where needed)
- [ ] Remove product names, URLs, customer names, internal systems names, screenshots with identifying detail
- [ ] Keep the technical lessons: the reader's value is the pattern, not the name
- [ ] Mark the piece "Client name withheld at their request"

## 5. Approval checklist (complete before publishing)

- [ ] SOW publicity level is 3 (case study), or anonymised use is agreed (MSA clause 15.6(b)/(e)); record the SOW reference: {{SOW_NO}}
- [ ] Client's written approval of the final text, figures, images and quote (MSA clause 15.6(c)); record location: {{LINK}}
- [ ] Every figure traced to a source and re-checked by the client
- [ ] Contract check: MSA clause 7 (confidentiality), clause 15.6 (publicity), NDA terms, any client AI or media policy
- [ ] No security details that could help an attacker (hosts, versions, specific vulnerabilities, credentials, configurations)
- [ ] No personal data, or individuals identified without consent
- [ ] AI claims reflect the evaluation actually run, with its limits stated
- [ ] Technology and third-party names used accurately; no implication of endorsement by Microsoft or others
- [ ] Quote reviewed and approved in writing by the person quoted
- [ ] Northbound lead and Policy Owner sign-off
- [ ] Client has a right to withdraw; process documented: {{how to unpublish within X days}}
- [ ] Dated, with a review date ({{12 months}}) so stale results are retired

## 6. Filing

Store each finished case study as `case-studies/{{yyyy-mm}}-{{slug}}.md` with its consent record and source data alongside, outside the public site.

---

## Worked example structure (illustration only, fictional)

*This shows the shape and tone. The content is invented for illustration; never publish an example like this as a real result.*

**Title:** From weekend prototype to supported production service in six weeks

**Challenge:** A professional-services firm's operations lead built a scheduling tool with AI coding tools. Forty staff used it daily, but it had no sign-in, stored credentials in the code and could not be deployed without its author.

**Approach:** Assess (3 days) → Harden (2 weeks: SSO, role-based access, secrets, data model) → Test (characterization tests on the booking flow) → Deploy (IaC, pipeline, monitoring) → Support (Standard subscription).

**Results (illustrative):** [Before/after table with measured values, each sourced.]

**Lesson:** The prototype was a good specification. The risk lived in identity and data, not in the screens.
