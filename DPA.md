# Data Processing Agreement

> **Draft for legal review.** This is a starting-point template, not legal advice. Data-protection law varies by jurisdiction and changes often. Have a privacy lawyer qualified where you and your clients operate review it before use, particularly the transfer mechanisms (section 9), the sub-processor list (Annex 3) and the regional addenda (Annex 5). Replace every `{{PLACEHOLDER}}` and delete this note.
>
> **When to use:** whenever Consultant will process personal data on a client's behalf, as required by MSA clause 8.1. Where possible avoid it: use masked or synthetic data for assessments and PoCs (see `SOW_POC.md` section 8). Sign this before any such processing starts.

This Data Processing Agreement (the "**DPA**") forms part of the Master Services Agreement dated {{MSA_DATE}} (the "**MSA**") between:

**{{CLIENT_LEGAL_NAME}}** ("**Client**", the "**Controller**"); and
**{{COMPANY_LEGAL_NAME}}**, trading as **{{BRAND_NAME}}** ("**Consultant**", the "**Processor**").

It applies to the processing of Personal Data by Consultant on Client's behalf in providing the Services. If there is a conflict between this DPA and the MSA on data protection, this DPA prevails.

## 1. Definitions

Terms not defined here have the meaning in the MSA.

- "**Applicable Data Protection Law**" means laws governing the processing of personal data that apply to a party in connection with the Services, including, as applicable, the EU General Data Protection Regulation (2016/679) ("**GDPR**"), the UK GDPR and Data Protection Act 2018, the Swiss Federal Act on Data Protection, and US state privacy laws (for example the California Consumer Privacy Act as amended).
- "**Personal Data**" means any information relating to an identified or identifiable natural person that Consultant processes on Client's behalf under the MSA. It includes "personal information" under US state law.
- "**Controller**", "**Processor**", "**Data Subject**", "**Process/Processing**", "**Supervisory Authority**" and "**Personal Data Breach**" have the meanings in GDPR. For US state laws, "Controller" and "Processor" include "business" and "service provider" or "contractor" as relevant.
- "**Sub-processor**" means a third party engaged by Consultant to process Personal Data.
- "**SCCs**" means the standard contractual clauses approved by the European Commission (Decision 2021/914) for transfers to third countries.
- "**UK Addendum**" means the International Data Transfer Addendum to the SCCs issued by the UK Information Commissioner.

## 2. Roles and scope

2.1 For the Personal Data processed under this DPA, Client is the Controller and Consultant is the Processor. If Client is itself a processor for another controller, Client confirms it has authority to instruct Consultant and the obligations here apply on that basis.

2.2 The subject matter, duration, nature and purpose of processing, categories of Personal Data and Data Subjects are set out in **Annex 1**.

2.3 Each party will comply with the Applicable Data Protection Law that applies to it.

## 3. Client instructions

3.1 Consultant will process Personal Data only on Client's documented instructions, which are the MSA, the relevant SOW, this DPA and any further written instruction consistent with them, unless required to do otherwise by law (in which case Consultant will inform Client first, unless prohibited).

3.2 Consultant will inform Client if, in its opinion, an instruction infringes Applicable Data Protection Law. Consultant is not obliged to carry out an instruction it reasonably believes to be unlawful.

3.3 Client is responsible for the lawfulness of the processing, including having a lawful basis, giving required notices to Data Subjects, and the accuracy and minimisation of the Personal Data it provides.

3.4 Client will not provide special-category data (as in GDPR Art. 9), criminal-offence data, payment-card data, or children's data unless the SOW and **Annex 1** expressly include it and the safeguards in **Annex 2** are adjusted as needed.

## 4. Confidentiality and personnel

Consultant will ensure that persons authorised to process Personal Data are bound by written or statutory confidentiality duties, have received appropriate data-protection training, and access Personal Data only as needed for the Services.

## 5. Security

5.1 Consultant will implement and maintain the technical and organisational measures in **Annex 2**, appropriate to the risk, taking account of the state of the art, costs, and the nature, scope, context and purposes of processing.

5.2 Consultant may update the measures provided it does not materially reduce the overall level of protection.

5.3 Client is responsible for the security of its own systems, accounts and credentials, and for its choices in configuring any environment it controls.

## 6. Sub-processors

6.1 Client gives general authorisation for Consultant to engage the Sub-processors listed in **Annex 3**.

6.2 Consultant will give Client at least {{14}} days' written notice of any new or replacement Sub-processor. Client may object on reasonable data-protection grounds within that period. The parties will discuss in good faith; if the issue cannot be resolved, Client may terminate the affected Services without penalty on written notice and receive a refund of prepaid fees for the unused period.

6.3 Consultant will impose written data-protection obligations on each Sub-processor that are no less protective than this DPA and remains liable for their performance.

## 7. Assistance to Client

7.1 **Data Subject requests.** Taking account of the nature of processing, Consultant will promptly (and within {{5}} business days) forward to Client any Data Subject request it receives and will not respond except to acknowledge, unless instructed. Consultant will provide reasonable assistance, through appropriate measures, for Client to respond to requests to exercise rights under Applicable Data Protection Law.

7.2 **Impact assessments and consultations.** Consultant will provide reasonable assistance with data protection impact assessments and prior consultation with a Supervisory Authority relating to the Services, taking into account the information available to Consultant.

7.3 **Costs.** Assistance beyond what is reasonably incidental to the Services is chargeable at the rate card in the MSA, with Client's prior approval.

## 8. Personal Data Breach

8.1 Consultant will notify Client without undue delay and in any event within **{{72}} hours** after confirming a Personal Data Breach affecting Client's Personal Data.

8.2 The notice will, to the extent known, describe: the nature of the breach; the categories and approximate numbers of Data Subjects and records; the likely consequences; and the measures taken or proposed. Information may be provided in phases.

8.3 Consultant will take reasonable steps to contain and remediate the breach and cooperate with Client's reasonable investigation. Client is responsible for notifying Supervisory Authorities and Data Subjects where required, and for the content of those notices. Consultant's notification is not an admission of fault.

## 9. International transfers

9.1 Consultant will process Personal Data only in the locations in **Annex 3** (for the hosting region, Client's chosen Azure region where applicable) and will not transfer it to another country without Client's authorisation, other than as permitted in this section.

9.2 If processing involves a transfer of Personal Data from the EEA, UK or Switzerland to a country that has not been recognised as providing adequate protection, the transfer is subject to the SCCs, which are incorporated by reference and completed as follows:

- Module Two (Controller to Processor), or Module Three (Processor to Processor) where Client is a processor;
- Clause 7 (docking): included;
- Clause 9(a): Option 2 (general authorisation), with the notice period in clause 6.2;
- Clause 11(a): optional language not used;
- Clause 17: the law of {{Ireland / another EU Member State}}; Clause 18: the courts of {{same}};
- Annexes I to III of the SCCs: completed using Annexes 1 to 3 of this DPA.

9.3 For UK transfers, the UK Addendum applies, with the tables completed from this DPA. For Swiss transfers, the SCCs apply with references to the GDPR read as references to the Swiss Federal Act on Data Protection, and the Swiss Federal Data Protection and Information Commissioner as the competent authority.

9.4 If a recognised alternative transfer mechanism (for example the EU-US Data Privacy Framework) applies to a recipient, the parties may rely on it for as long as it remains valid. If it is invalidated, the SCCs apply.

9.5 Consultant will carry out, and on request share a summary of, a transfer risk assessment where required, and will notify Client if it can no longer comply with the SCCs.

## 10. Audits and information

10.1 Consultant will make available to Client information reasonably necessary to demonstrate compliance with this DPA, including relevant security documentation, certifications or independent audit summaries it holds (for example from its cloud providers).

10.2 If that is not sufficient, or a Supervisory Authority requires it, Client may carry out an audit, no more than once in any 12 months (except after a Personal Data Breach), on at least {{30}} days' written notice, during business hours, subject to confidentiality, without unreasonable disruption, and with the scope agreed in advance. Client bears the costs of the audit, plus Consultant's reasonable time at the rate card.

10.3 Audits may not extend to the data of other customers or to Consultant's systems unrelated to the Services.

## 11. Return and deletion

11.1 On termination or expiry of the Services, or on Client's earlier request, Consultant will, at Client's choice, return or delete Personal Data within **{{30}} days** and certify deletion in writing, except to the extent that law requires storage (in which case the data remains protected and is processed only for that purpose).

11.2 Personal Data in routine backups will be deleted in line with the backup cycle (no longer than {{90}} days) and stays protected until then.

11.3 Where Consultant works in Client's tenant, Client controls retention of data in that environment. Consultant will remove its own copies and revoke its access on completion.

## 12. AI services

12.1 Consultant will not use Personal Data to train or fine-tune AI models of its own or of third parties, and will configure AI services used in the Services so that Personal Data is not used for provider model training, where such a setting is available (see MSA clause 9.1).

12.2 Where a SOW involves processing Personal Data with AI services, the AI service, region and data-retention settings are listed in **Annex 3**.

12.3 Client is responsible for determining whether its use of AI to process Personal Data requires additional assessments, transparency, or human oversight under Applicable Data Protection Law.

## 13. US state privacy law

To the extent US state privacy laws apply, Consultant will: process Personal Data only to provide the Services and for the business purposes in this DPA; not sell or share Personal Data; not retain, use or disclose it outside the direct business relationship or for any other purpose; not combine it with other data except as permitted by law; notify Client if it can no longer meet its obligations; and allow Client to take reasonable steps to stop and remediate unauthorised use.

## 14. Liability

The liability of each party under this DPA is subject to the limitations and exclusions in the MSA (clause 11), except that nothing limits liability that cannot be limited by law, or a party's liability to Data Subjects under the SCCs. {{Counsel to confirm whether to apply a separate, higher cap for data-protection liability, for example 2x annual fees or a fixed amount.}}

## 15. Term and general

15.1 This DPA takes effect on the date of the last signature and continues for as long as Consultant processes Personal Data under the MSA, and after that until all Personal Data is returned or deleted.

15.2 If Applicable Data Protection Law changes or a Supervisory Authority requires, the parties will negotiate in good faith to amend this DPA.

15.3 This DPA is governed by the law that governs the MSA, except as required by the SCCs or Applicable Data Protection Law.

## Signatures

| | {{CLIENT_LEGAL_NAME}} | {{COMPANY_LEGAL_NAME}} (trading as {{BRAND_NAME}}) |
|---|---|---|
| Name | | |
| Title | | |
| Signature | | |
| Date | | |

---

## Annex 1: Details of processing

| Item | Description |
|---|---|
| Subject matter | {{e.g. Migration of Client's application, AI feature development and testing}} |
| Duration | Term of {{SOW_NO}} and until deletion under section 11 |
| Nature and purpose | {{e.g. Hosting, access for debugging, testing, analysis, building retrieval indexes}} |
| Categories of Data Subjects | {{e.g. Client's employees, customers, end users}} |
| Types of Personal Data | {{e.g. names, business email addresses, user IDs, application usage logs}} |
| Special categories (if any) | {{None / list and justify}} |
| Frequency | {{Continuous during engagement / one-off transfer}} |
| Client's chosen environment | {{Client's Azure tenant, region / Consultant sandbox, region}} |
| Data source and production vs test | {{Masked sample / production extract}} |
| Retention | Deleted within {{30}} days after the end of the Services, per section 11 |
| Client contact for data protection | {{NAME, EMAIL}} |
| Consultant contact for data protection | {{NAME, EMAIL}} |

## Annex 2: Technical and organisational measures

*Confirm each measure is true and operated before signing. Remove anything not in place; do not over-promise.*

| Area | Measure |
|---|---|
| Governance | Named security owner; documented information-security policy; annual review |
| Access control | Least privilege; role-based access; MFA on all accounts that can reach client data; access reviewed at least quarterly; access revoked at project end |
| Authentication | Unique credentials; password manager; no shared accounts |
| Encryption | TLS 1.2 or higher in transit; encryption at rest for devices and cloud storage holding client data |
| Secrets | Stored in a secrets manager; never in source code or chat; rotated at project end |
| Environment segregation | Client data kept in a client-dedicated tenant, project or environment; no commingling |
| Devices | Managed laptops with disk encryption, endpoint protection, automatic updates and screen lock |
| Logging and monitoring | Access logs retained for {{90}} days; alerts for anomalous access |
| Development | Code review; dependency scanning; no production data in non-production unless agreed |
| AI use | Only approved AI services; training and data retention disabled where available; no personal data in public AI tools |
| Personnel | Background checks where permitted by law; confidentiality agreements; security and privacy training on joining and annually |
| Sub-processors | Due diligence on security and privacy before engagement; written data-protection terms |
| Incident response | Documented process; assessment, containment, notice per section 8; post-incident review |
| Business continuity | Backups of Consultant's own project records; recovery tested {{annually}} |
| Deletion | Secure deletion at end of engagement; certificate on request |
| Physical | No client data stored on removable media or in paper form; office and remote-work security rules |

## Annex 3: Sub-processors and processing locations

| Sub-processor | Service / purpose | Location | Safeguard for transfers |
|---|---|---|---|
| Microsoft Corporation (Azure, Azure OpenAI, Foundry, Microsoft 365) | Cloud hosting, AI services, collaboration | {{Client-chosen Azure region}} | {{DPF / SCCs per Microsoft DPA}} |
| {{GitHub, Inc.}} | Source control, CI/CD | {{Region}} | {{DPF / SCCs}} |
| {{Other tool}} | {{Purpose}} | {{Region}} | {{Mechanism}} |
| {{Subcontractor name}} | {{Engineering support}} | {{Country}} | {{SCCs / adequacy}} |

*List every third party that can access client Personal Data, including AI services and any subcontracted engineers. If an item is chosen and paid for by Client directly (for example the Client's own Azure subscription), say so: the provider is then Client's processor, not Consultant's Sub-processor.*

AI services in scope for Personal Data: {{service, model, region, retention and abuse-monitoring settings}}.

## Annex 4: Contacts for incidents

| | Client | Consultant |
|---|---|---|
| Name and role | {{}} | {{}} |
| Email | {{}} | {{}} |
| 24x7 phone | {{}} | {{}} |

## Annex 5: Regional addenda

*Add only those that apply to the engagement.*

- **EU/EEA:** SCCs completed per section 9.2.
- **UK:** UK Addendum tables completed from Annexes 1 to 3.
- **Switzerland:** adjustments per section 9.3.
- **US states:** section 13 applies; add any state-specific required terms (for example a statement of processing instructions, deletion obligations, or subcontractor notices).
- **Other (e.g. Australia, Canada, Singapore, UAE, Brazil, India):** {{add specific requirements, or confirm the DPA suffices after local advice}}.

## Drafting notes (delete before sending)

- **Avoid processing personal data where you can.** The best DPA is one you rarely need: use masked, synthetic or test data in assessments and PoCs.
- **Check roles.** If you decide the purposes and means (for example you run a product on your own infrastructure), you may be a controller or joint controller for some data; do not force a processor structure.
- **Honest Annex 2.** Only list measures you really have. Consider ISO 27001 or SOC 2 as your business grows; clients will ask.
- **Sub-processors.** Keep the Annex 3 list accurate. Microsoft, GitHub and AI vendors publish their own DPAs and sub-processor lists you can link to.
- **Breach notice.** 72 hours aligns with `MSA.md` clause 8.3; clients with their own regulatory clocks may ask for 24 or 48 hours.
- **Caps.** Privacy lawyers and clients often negotiate a higher cap for data-protection breaches. Decide your position in advance and align with `MSA.md` clause 11.
- **Regulated sectors** (health, finance, public sector) will bring their own data terms, e.g. HIPAA business associate agreements; this template does not cover them.
- Keep consistent with `MSA.md` clauses 8 and 9, `NDA.md` section 6.2 and `SOW_POC.md` section 9.
