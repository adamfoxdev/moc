# Master Services Agreement

> **Draft for legal review.** This is a starting-point template, not legal advice. Have a lawyer qualified in the governing jurisdiction review and adapt it before use, particularly sections 8 to 11 (warranty, liability, indemnity), data protection, and anything specific to regulated industries. Replace every `{{PLACEHOLDER}}`. Delete this note before sending.

This Master Services Agreement (the "**Agreement**") is made on {{DATE}} (the "**Effective Date**") between:

**{{NORTHBOUND_LEGAL_NAME}}**, a {{ENTITY_TYPE}} registered in {{JURISDICTION}} under number {{REG_NO}}, with its registered office at {{ADDRESS}} ("**Consultant**" or "**Northbound**"); and

**{{CLIENT_LEGAL_NAME}}**, a {{ENTITY_TYPE}} registered in {{JURISDICTION}} under number {{REG_NO}}, with its registered office at {{ADDRESS}} ("**Client**").

## 1. Definitions

- "**Affiliate**" means an entity controlling, controlled by, or under common control with a party.
- "**AI Services**" means large language models, machine-learning models, and related hosted services (including Azure AI Foundry and Azure OpenAI) used in or with the Services.
- "**Client Data**" means all data, content, source code and materials supplied by or for Client, and outputs derived from them by the Services.
- "**Client Materials**" means Client Data and Client's pre-existing software, systems, trademarks and documentation.
- "**Confidential Information**" has the meaning in section 7.
- "**Consultant Tools**" means Consultant's pre-existing or independently developed software, templates, frameworks, migration tooling, methods, know-how and documentation, and improvements to them, other than Client Materials.
- "**Deliverables**" means the items identified as deliverables in a Statement of Work.
- "**Services**" means the services described in a Statement of Work.
- "**Statement of Work**" or "**SOW**" means a document signed by both parties that references this Agreement and describes Services, Deliverables, fees, timeline, assumptions and acceptance criteria. A proposal accepted in writing by both parties may serve as a SOW.
- "**Third-Party Materials**" means software, models, services and content owned by third parties, including open-source software and cloud platforms.

## 2. Structure and precedence

2.1 This Agreement governs all Services. Each SOW is a separate contract incorporating this Agreement.

2.2 If there is a conflict, the order of precedence is: (a) the SOW, but only for the specific point and only where it expressly states it overrides this Agreement; (b) the Data Processing Agreement, on data-protection matters only; (c) this Agreement; (d) any attached policy or schedule.

2.3 Terms in Client purchase orders or portals do not apply, even if signed or clicked, unless both parties sign an amendment.

## 3. Services

3.1 Consultant will provide the Services with reasonable skill and care, using appropriately qualified personnel.

3.2 Consultant controls the means and manner of performing the Services and may use subcontractors, remaining responsible for their work and for confidentiality obligations equivalent to those here.

3.3 **Change control.** Either party may propose changes to a SOW. No change binds a party until agreed in writing, including adjustments to fees, timeline and Deliverables. Consultant need not start changed work until agreed.

3.4 **Client responsibilities.** Client will provide timely access to systems, data, environments and personnel, a named decision-maker, and decisions and feedback within the period stated in the SOW (or five business days if none). Delay caused by Client may extend dates and, where Consultant incurs additional cost, fees, after notice.

3.5 **Personnel.** Consultant may replace personnel with comparably qualified individuals. Client will not solicit or hire Consultant personnel engaged on the Services during the term and for six months after, without Consultant's written consent. This does not restrict general recruitment advertising.

## 4. Acceptance

4.1 Consultant will notify Client when a Deliverable is ready. Client has {{10}} business days to test it against the acceptance criteria in the SOW and either accept it or provide a written description of material non-conformity.

4.2 Consultant will correct material non-conformities and resubmit. The review period then restarts for the corrected items only.

4.3 A Deliverable is deemed accepted on the earliest of: written acceptance; the end of the review period without a notice of non-conformity; or use in production.

## 5. Fees and payment

5.1 Client will pay the fees in each SOW. Unless a SOW states otherwise, work outside SOW scope is charged at Consultant's then-current rate card, provided to Client in writing and not increased more than once in any 12 months, on at least 60 days' notice.

5.2 Fixed fees are invoiced as set out in the SOW. Time-and-materials fees and retainers are invoiced monthly in arrears (retainers in advance). Unused retainer hours roll over for one month and then expire unless the SOW says otherwise.

5.3 Invoices are payable within {{30}} days of the invoice date, in the currency stated, without set-off. Expenses are charged at cost if approved in advance.

5.4 Fees exclude taxes, which Client will pay (except taxes on Consultant's income). If withholding is required by law, Client will gross up the payment unless a treaty or exemption is documented.

5.5 Cloud, model and third-party usage charges are borne by Client, either directly through Client's subscription or passed through at cost. Consultant is not responsible for charges arising from Client's configuration, usage volumes or quotas.

5.6 Late amounts bear interest at {{1.0}}% per month or the maximum lawful rate, if lower. Consultant may suspend Services on 10 days' notice of non-payment. Disputed amounts must be notified in good faith within 14 days of the invoice; the undisputed portion remains payable.

5.7 Where a SOW provides that an assessment or proof-of-concept fee is credited against follow-on work, the credit applies only if the follow-on SOW is signed within the period stated in the SOW (30 days if none).

## 6. Intellectual property

6.1 **Client Materials.** As between the parties, Client owns Client Materials. Client grants Consultant a non-exclusive licence to use Client Materials solely to perform the Services.

6.2 **Deliverables.** On receipt of full payment for the relevant Deliverable, Consultant assigns to Client its rights in the Deliverable, excluding Consultant Tools and Third-Party Materials. Until payment, Client has a licence to use the Deliverable for internal business purposes.

6.3 **Consultant Tools.** Consultant retains all rights in Consultant Tools. To the extent Consultant Tools are embedded in or necessary to use a Deliverable, Consultant grants Client a perpetual, worldwide, non-exclusive, royalty-free, non-transferable (except to a successor to the business) licence to use, copy and modify them as part of the Deliverable for Client's and its Affiliates' internal business purposes.

6.4 **Third-Party Materials.** These are licensed under their own terms, which Consultant will identify in the Deliverables or SOW where relevant. Consultant makes no warranty for Third-Party Materials beyond what the supplier provides.

6.5 **Prototype and generated code.** Client acknowledges that Client Materials may include code generated by AI tools, and that rights, licensing status and security of such code may be uncertain. Consultant's assessment will identify issues it finds but does not warrant the origin, ownership or licensing of such code.

6.6 **General skills and know-how.** Nothing prevents Consultant from using general knowledge, experience and skills, or from performing similar services for others, provided it does not use or disclose Client's Confidential Information.

6.7 **Feedback.** Client grants Consultant a licence to use suggestions about Consultant's services and tools without restriction or compensation.

## 7. Confidentiality

7.1 "**Confidential Information**" means non-public information disclosed by a party ("**Discloser**") to the other ("**Recipient**") in connection with this Agreement that is marked confidential or would reasonably be understood to be confidential, including Client Data, source code, business plans and pricing. It excludes information that is or becomes public without breach, was lawfully known to or independently developed by Recipient, or was lawfully received from a third party without restriction.

7.2 Recipient will: (a) use Confidential Information only to perform or receive the Services; (b) protect it with at least reasonable care; (c) disclose it only to personnel, Affiliates and advisers who need to know it and are bound by equivalent obligations.

7.3 Recipient may disclose Confidential Information as required by law or court order, after giving Discloser prompt notice where lawful.

7.4 These obligations continue for {{five}} years after termination, and for trade secrets and Client Data for as long as they remain confidential.

7.5 On request or at termination, Recipient will return or delete Confidential Information, except for copies in routine backups (which remain protected) and copies required by law.

## 8. Data protection and security

8.1 Each party will comply with data-protection laws that apply to it. If Consultant processes personal data on Client's behalf, the parties will sign a data processing agreement ({{DPA reference}}) before processing begins, including appropriate international-transfer terms if needed.

8.2 Consultant will maintain reasonable technical and organisational security measures appropriate to the risk, including access control, encryption in transit, secure credential handling, and restricted use of Client credentials, which will be revoked at the end of the engagement.

8.3 Consultant will notify Client without undue delay (and within {{72}} hours of confirmation) of any unauthorised access to Client Data in Consultant's control.

8.4 Client will not provide production personal data, special-category data, payment-card data or health data to Consultant unless the SOW states that it is in scope and the necessary safeguards are agreed.

8.5 Client is responsible for the lawfulness of the Client Data it provides and for its own regulatory obligations, including those arising from its use of the Deliverables.

## 9. AI Services

9.1 **No training on Client Data.** Consultant will configure AI Services used in the Services, where the provider offers the option, so that Client Data is not used to train or improve provider models. Consultant will not use Client Data to train its own models.

9.2 **Provider terms.** Use of AI Services is subject to the provider's terms, content policies and quotas. Client accepts those terms where it holds the subscription.

9.3 **Outputs.** AI outputs may be inaccurate, incomplete or biased. Consultant will test AI features against the evaluation criteria in the SOW, but does not warrant that outputs will be error-free or suitable for decisions with legal or similarly significant effects without human oversight. Client is responsible for appropriate human review in its operation of the Deliverables.

9.4 **Regulatory compliance.** Client is responsible for determining whether its use of AI is subject to specific regulation (for example the EU AI Act or sector rules) and for the related obligations as deployer or operator, unless the SOW expressly includes Consultant support for that analysis.

## 10. Warranties

10.1 Each party warrants it has authority to enter into this Agreement.

10.2 **Services warranty.** For {{30}} days after acceptance of a Deliverable (the "**Warranty Period**"), Consultant warrants that the Deliverable will materially conform to its acceptance criteria. Client's remedy is for Consultant to correct the non-conformity at no charge, or, if Consultant cannot do so within a reasonable time, to refund the fees paid for the non-conforming Deliverable.

10.3 The warranty does not apply to defects caused by Client or third-party changes, misuse, Client Materials, Third-Party Materials, changes in third-party platforms or models, or use outside the documented environment.

10.4 **Disclaimer.** Except as expressly stated, all warranties and conditions, express or implied, including merchantability, fitness for a particular purpose and non-infringement, are excluded to the maximum extent permitted by law. Consultant does not warrant that the Services or Deliverables will be uninterrupted, error-free or free of all vulnerabilities.

## 11. Limitation of liability

11.1 Nothing in this Agreement limits liability for: death or personal injury caused by negligence; fraud or fraudulent misrepresentation; wilful misconduct; Client's obligation to pay fees; or any liability that cannot be limited by law.

11.2 Subject to 11.1, neither party is liable for indirect, consequential or special loss, or for loss of profit, revenue, goodwill, anticipated savings or data, whether in contract, tort (including negligence) or otherwise.

11.3 Subject to 11.1, each party's total aggregate liability arising under or in connection with each SOW is limited to the greater of (a) {{100%}} of the fees paid and payable under that SOW in the 12 months before the claim, and (b) {{AMOUNT}}.

11.4 The limits in 11.2 and 11.3 do not apply to a party's liability under section 7 (Confidentiality) except for loss of profit or revenue, which remains excluded; liability for breach of section 7 is capped at {{AMOUNT or multiple}}. *Counsel to confirm the approach to confidentiality and data breach caps.*

11.5 Consultant is not liable for losses to the extent they arise from Client's failure to follow Consultant's written recommendations (including security recommendations) or from Client Materials that Consultant was directed to retain unchanged.

## 12. Indemnities

12.1 **By Consultant.** Consultant will defend Client against third-party claims alleging that a Deliverable, as delivered and used in accordance with this Agreement, infringes that third party's intellectual property rights, and pay damages and costs finally awarded or agreed in settlement. This does not apply to claims arising from Client Materials, Third-Party Materials, AI-generated content not created by Consultant, combinations with materials not supplied by Consultant, or modifications not made by Consultant.

12.2 **By Client.** Client will defend Consultant against third-party claims arising from Client Materials or Client's use of Client Data in breach of law or of third-party rights, and pay damages and costs finally awarded or agreed in settlement.

12.3 **Procedure.** The indemnified party must give prompt notice, allow the indemnifying party sole control of defence and settlement (no settlement admitting fault without consent), and provide reasonable cooperation at the indemnifying party's expense.

12.4 If a Deliverable is, or is likely to be, subject to an infringement claim, Consultant may modify or replace it, procure a licence, or, if neither is commercially reasonable, take it back and refund fees for it. This section sets out Client's sole remedy for infringement claims.

## 13. Term and termination

13.1 This Agreement begins on the Effective Date and continues until terminated. It may be terminated by either party on {{60}} days' written notice, provided no SOW is in force; an SOW in force continues under this Agreement until completed or terminated.

13.2 Either party may terminate this Agreement or an SOW immediately by written notice if the other: (a) materially breaches and fails to remedy within 30 days of notice (10 days for non-payment); (b) becomes insolvent, enters bankruptcy or similar proceedings, or ceases business.

13.3 Client may terminate an SOW for convenience on {{30}} days' written notice. Client will pay for Services performed and Deliverables completed to the termination date, committed third-party costs, and, for fixed-fee work, a proportion of the fixed fee reflecting work done. For retainers and support subscriptions, fees are due through the end of the minimum term.

13.4 On termination or expiry: Client will pay all fees due; each party will return or delete Confidential Information per section 7.5; Consultant will deliver work in progress that Client has paid for; and Consultant will revoke access to Client systems.

13.5 Sections 1, 5 (for amounts due), 6, 7, 10.4, 11, 12, 13.4, 14 and 15 survive termination.

## 14. Support services

If the parties agree on a support subscription, the SOW will specify covered applications, hours of cover, response targets, included change hours, exclusions and service credits (if any). Support is available only for applications built or migrated by Consultant, or that have passed a Consultant assessment. Response targets are targets, not guarantees, and the stated service credit (if any) is Client's sole remedy for missed targets.

## 15. General

15.1 **Governing law and disputes.** This Agreement is governed by the laws of {{JURISDICTION}}. The parties will first try to resolve disputes through escalation to senior executives for 20 business days. Unresolved disputes will be submitted to {{courts / arbitration under RULES, seat, language}}. Either party may seek urgent injunctive relief for breach of sections 6 or 7.

15.2 **Force majeure.** Neither party is liable for delay or failure (other than payment) caused by events beyond its reasonable control, including outages of third-party cloud or AI platforms, provided it gives prompt notice and uses reasonable efforts to mitigate.

15.3 **Independent contractors.** The parties are independent contractors. Nothing creates a partnership, agency, employment or joint venture.

15.4 **Assignment.** Neither party may assign this Agreement without the other's written consent, not unreasonably withheld, except to a successor in a merger or sale of substantially all of its business.

15.5 **Notices.** Notices must be in writing and sent to the addresses above (or as updated by notice) by courier or email with confirmation of receipt. Email is valid for operational notices; legal notices of breach or termination require courier or registered email.

15.6 **Publicity.**

(a) *Default.* Neither party will use the other's name, logo or trademarks, or state publicly that the other is a customer or supplier, without the other's prior written consent. This applies to websites, social media, proposals, decks, press and awards.

(b) *Consent in a SOW.* A SOW may record Client's consent at one of these levels, and if it does not, level 1 applies:

1. **No publicity.** No use of Client's name or the existence of the engagement.
2. **Reference use.** Consultant may name Client and show its logo in customer lists and in confidential proposals to prospects, and may act as a reference on request.
3. **Case study.** In addition to level 2, Consultant may prepare a case study about the engagement, which is published only after Client has approved the final text, figures, quotations and images in writing (c) below.

(c) *Approval before publication.* Even where level 3 applies, Consultant will not publish a case study, testimonial or quotation until Client (and any individual quoted) has approved the specific text in writing. Client will respond within {{10}} business days; silence is not approval. Every figure published must be one that Consultant can show came from the engagement or from Client's data, and be approved by Client.

(d) *Limits.* No consent allows Consultant to publish Client's Confidential Information, Client Data, security details, the identity of Client's own customers or personnel (other than a person who has approved being quoted), or any statement implying that Client endorses Consultant's services beyond what Client has approved. Consent is also not consent to describe a third party's product or service in a way that implies that party's endorsement.

(e) *Anonymised use.* Consultant may describe the engagement in a way that does not identify Client or any individual, and does not disclose Confidential Information, where Client has agreed (level 3, or in writing).

(f) *Withdrawal.* Client may withdraw consent at any time on {{30}} days' written notice. Consultant will then stop new use and remove the name, logo and published case study from its website and social channels it controls within that period. Withdrawal does not require recall of material already distributed in print or sent to third parties, but Consultant will not redistribute it.

(g) *Client's use of Consultant's name.* Client may state truthfully that Consultant performed services for it, but will not use Consultant's name or logo in marketing, or imply Consultant's endorsement, without Consultant's written consent.

(h) *Survival.* This clause survives termination or expiry of the Agreement for as long as published material remains in use.

15.7 **Compliance.** Each party will comply with applicable anti-bribery, sanctions and export-control laws. Client will not use the Services in breach of such laws.

15.8 **Insurance.** Consultant will maintain professional indemnity, cyber and general liability insurance at levels of at least {{AMOUNT}} during the term and {{two}} years after, and provide certificates on request.

15.9 **Entire agreement.** This Agreement and each SOW are the entire agreement on their subject matter and supersede prior discussions. Each party acknowledges it has not relied on statements not set out in them, except in the case of fraud.

15.10 **Amendments and waiver.** Changes must be in writing and signed by both parties. A failure to enforce a right is not a waiver.

15.11 **Severability.** If a provision is unenforceable, the remainder continues in effect and the provision is modified to the minimum extent necessary.

15.12 **Counterparts and e-signature.** This Agreement may be signed in counterparts and electronically.

## Signatures

| | {{NORTHBOUND_LEGAL_NAME}} | {{CLIENT_LEGAL_NAME}} |
|---|---|---|
| Name | | |
| Title | | |
| Signature | | |
| Date | | |

---

## Schedule 1: Statement of Work template

**SOW number:** {{NO}}  **Date:** {{DATE}}  **Governing agreement:** MSA dated {{DATE}}

1. **Services and approach:** {{DESCRIPTION}}
2. **Deliverables and acceptance criteria:** {{TABLE: deliverable, criteria, target date}}
3. **Out of scope:** {{LIST}}
4. **Assumptions and Client responsibilities:** {{LIST}}
5. **Timeline and milestones:** {{TABLE}}
6. **Team and key personnel:** {{TABLE}}
7. **Fees and invoicing:** {{FIXED / T&M / RETAINER}}, {{AMOUNTS}}, {{SCHEDULE}}
8. **Cloud and model costs:** {{Client subscription / pass-through at cost}}
9. **Credits and discounts:** {{e.g. assessment fee credited if follow-on SOW signed within 30 days}}
10. **Support and warranty overrides (if any):** {{TEXT}}
11. **Data in scope and security requirements:** {{TEXT}}
12. **Acceptance review period (if not 10 business days):** {{DAYS}}
13. **Publicity consent (MSA clause 15.6):** {{Level 1 No publicity / Level 2 Reference use / Level 3 Case study}}; permitted elements: {{name / logo / quote / figures}}; Client approver: {{NAME, TITLE}}
14. **Signatures:** {{BOTH PARTIES}}

## Schedule 2: Rate card

| Role | Rate (per hour) |
|---|---|
| Principal | {{$275}} |
| Senior engineer | {{$200}} |
| Engineer | {{$150}} |

*Rates are provided as at the Effective Date and subject to section 5.1.*

## Drafting notes (delete before sending)

- Section 9 (AI Services) and 6.5 (generated code) are specific to this business model; keep, but have counsel review against current law and provider terms.
- Liability caps (11.3, 11.4) and the indemnity scope (12) are the most negotiated terms; decide your fallback positions in advance.
- Check mandatory consumer, employment (contractor classification) and data-protection rules in each jurisdiction you serve.
- If clients are regulated (financial services, healthcare, public sector), expect to add their required security, audit, subcontracting and exit terms as a schedule.
- Keep consistent with `PROPOSAL_TEMPLATE.md` (30-day warranty, no training on client data, assessment fee credit) and `PRICING.md`.
