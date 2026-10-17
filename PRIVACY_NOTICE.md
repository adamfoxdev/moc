# Privacy Notice (draft for counsel)

> **Status: draft for review by a privacy lawyer. Not legal advice and not ready to publish.**
>
> **What this covers.** The personal data handled by the Northbound website and the onboarding platform (`platform/`), as the code works today. The facts in section 2 and the data map in Part B were checked against the code; everything else (legal bases, retention, transfers, rights wording) is a proposal for counsel to confirm for the jurisdictions you will actually serve.
>
> **How to use.** Part A is the text for the public page. Part B is for counsel and the team only (delete before publishing). Replace every `{{PLACEHOLDER}}`. Part C lists what must change in the product before or alongside publishing.
>
> **Writing style.** Part A is deliberately plain English. Keep it that way when editing.

---

# Part A: Public text

# Privacy Notice

**{{NORTHBOUND_LEGAL_NAME}}** ("**Northbound**", "**we**", "**us**")
Last updated: {{DATE}}

## The short version

- When you tell us what you're working on, we collect what you type, plus your name and email, so we can reply and work out how we might help.
- We use it for that, and to keep our records. We don't sell it, we don't use it for advertising, and we don't use it to train AI models.
- A small number of service providers handle it for us (hosting and email). They're listed below.
- We keep it for {{RETENTION}} and then delete it. You can ask us to see it, correct it or delete it any time.
- We don't use advertising or analytics cookies, and we don't track you across other sites.

## 1. Who we are

{{NORTHBOUND_LEGAL_NAME}}, {{ENTITY_TYPE}} registered in {{JURISDICTION}} (number {{REG_NO}}), {{ADDRESS}}. We are the "controller" of the personal data described here, which means we decide why and how it is used.

Contact for anything in this notice: **{{PRIVACY_EMAIL}}**{{ if required: ", and our data protection officer / representative: NAME, ADDRESS"}}.

## 2. What we collect and why

### When you send us a request

| What | Why we need it |
|---|---|
| What you tell us you're working on, and anything optional you add (for example the stage of your project, how it was built, technology, a link to a demo, the kind of data it handles, timing, industry, your role) | To understand your situation, give you an initial view of how we might help, and prepare for a conversation |
| Your name and email address, and your company if you give it | To reply to you and keep track of who we're talking to |
| Your preference for how we contact you, and whether you want an NDA first | To respect your preferences |
| Your confirmation that we may email you about the request | We need your OK before we reply |
| A reference number for your request and the time it was received | To identify your request when we talk |
| Our own notes and the status of your request (for example "contacted", "call booked") | To follow up properly |

Please don't include passwords, keys, or personal data about other people (such as your customers) in your request. We will tell you if we need anything like that and how to share it safely.

### When we email you

We send you a confirmation of your request and may reply to it. Our email provider (below) processes these messages, and we keep a record that each message was sent and whether it was delivered, together with your email address, but not a second copy of the message content.

### Your browser

- While you're on our onboarding page, your browser keeps a reference number and a private code for your request in **session storage**. This lets you reload the page or add detail without losing your place. It is cleared when you close the tab or choose "Send another request". It is not a tracking cookie and isn't shared with anyone.
- We don't use cookies for analytics or advertising. {{Confirm before publishing: if any are added, update this section and add a cookie banner where required.}}
- Our servers may keep standard technical logs (for example the IP address, time and page requested) for security and to keep the service running, held by our hosting provider for {{LOG_RETENTION}}. We also use IP addresses briefly, in memory only, to limit how many requests can be sent in a short time and to block automated abuse.

### Our website and email addresses

Our public website {{doesn't use analytics or third-party scripts / uses ANALYTICS TOOL for PURPOSE; update}}. If you email us directly, we keep the correspondence.

## 3. How we use it, and our legal basis

*{{Counsel: the table assumes the UK/EU GDPR. Adapt for other regimes.}}*

| What we do | Legal basis |
|---|---|
| Read your request, reply, and have a conversation about how we might help | Steps you ask us to take before entering a contract; and our legitimate interest in responding to business enquiries |
| Email you the confirmation and follow up on your request | Your consent (the box you ticked), and our legitimate interest in responding |
| Keep records of enquiries and our dealings with you | Our legitimate interest in running our business; legal obligations where they apply |
| Protect the service: rate limits, spam blocking, security logs | Our legitimate interest in keeping the service secure |
| Draw up and perform a contract, if we go on to work together | Contract. A separate agreement and, where relevant, data processing terms will then apply |

If we rely on legitimate interests, you can object (see section 8).

**The "first read" on the page is not a decision about you.** The suggestions you see after sending a request come from fixed rules based on what you've written. They don't use AI or profiling to make decisions with legal or similarly significant effects on you, and a person at Northbound reads each request.

**AI.** We do not use your request to train AI models. {{Counsel/engineering: update this paragraph if AI tools are later used to process requests, and say which, where, and under what terms.}}

## 4. Who we share it with

We share personal data only with providers who help us run the service, under written terms that limit what they can do with it, and where needed with professional advisers, regulators, or in a business sale. We don't sell your data.

| Provider type | What they do | Where |
|---|---|---|
| {{Hosting / cloud provider, e.g. Microsoft Azure}} | Runs our website, application and database | {{REGION}} |
| {{Email provider, e.g. Microsoft 365 / Azure Communication Services}} | Sends and receives email on our behalf | {{REGION}} |
| {{Other: scheduling, CRM, support tools, if any}} | {{PURPOSE}} | {{REGION}} |

We may also disclose information if the law requires it or to protect rights, safety or security.

## 5. Transfers outside your country

{{Counsel: describe where data is stored and which providers or staff are outside the UK/EEA, and the safeguard used for each (an adequacy decision, the EU Standard Contractual Clauses with the UK Addendum, or the EU-US Data Privacy Framework). If everything is hosted in one region, say so plainly.}}

## 6. How long we keep it

| Data | How long | Then |
|---|---|---|
| Requests that don't lead to work together | {{12}} months after our last contact | Deleted |
| Requests that lead to a client relationship | The life of the relationship, then as set out in our contract and legal record-keeping requirements | Deleted or archived as required |
| Records that an email was sent | {{12}} months | Deleted |
| Server and security logs | {{LOG_RETENTION}} | Deleted automatically |
| Data you ask us to delete | Without undue delay, subject to any legal duty to keep it | Deleted |

{{Counsel to confirm periods. See Part C: automatic deletion is not yet built.}}

## 7. Security

We protect your data with measures suited to the risk, including access limited to people who need it, a secret token for staff access, encryption in transit, a limit on how fast requests can be made, and logging. {{Add encryption at rest and backup details once the production hosting is decided and the statement can be verified.}} No system is perfectly secure; if a breach affects you, we'll tell you and the authorities where the law requires.

## 8. Your rights

Depending on where you live, you may have the right to: **be informed** (this notice); **access** your data; **correct** it; **delete** it; **restrict** or **object to** our use of it; **take it with you** (portability); and **withdraw consent** at any time, which doesn't affect earlier use. You can also complain to your data protection authority ({{UK: the Information Commissioner's Office, ico.org.uk; EU: your national authority; US states: your state attorney general, as applicable}}).

To use a right, email **{{PRIVACY_EMAIL}}** with your reference number if you have one. We'll reply within {{one month}}. We may need to confirm it's you before we share or change anything.

{{Counsel: add US state-law wording (rights to know, delete, correct, opt out of sale/sharing, non-discrimination) and any other regional notices needed. We do not sell or share personal data for advertising.}}

## 9. Children

Our services are for businesses and aren't directed at children. We don't knowingly collect data from anyone under {{16 / 18}}.

## 10. Changes

We'll update this notice when what we do changes, and change the date at the top. For significant changes, we'll tell you if you've sent us a request.

## 11. Contact

{{PRIVACY_EMAIL}} · {{POSTAL_ADDRESS}}

---

## Short notice for the consent checkbox

*Use next to the form's consent box and as the first line of the confirmation email footer.*

> We'll use your details only to reply to this request and keep a record of it. We don't sell them or use them for advertising. Read our [Privacy Notice]({{URL}}).

---

# Part B: Notes for counsel and the team (delete before publishing)

## B1. Data map (as the code works today)

| Data | Where stored | Who can access | Retention in code today |
|---|---|---|---|
| `name`, `email`, `company`, `goal`, all optional answers (stage, builtWith, team, helpWith, users, data, timing, timingNote, industry, role, stack, link, outcome, notes, contactPref, wantsNda), `consent` flag | `requests.answers_json` and the `name`/`email`/`company`/`goal` columns, in the SQLite file | Staff with the admin token; anyone with server or database access | **Kept indefinitely** |
| Recommendation shown (path titles, reasons, flags) | `requests.recommendation_json` | As above | Indefinite |
| Reference ID, timestamps, status, staff notes | `requests` | As above | Indefinite |
| Edit token (random secret that lets the submitter change their own request) | `requests.edit_token`, plain text; and the browser's session storage | Database access; the submitter's own browser | Indefinite (should be deleted or rotated at some point) |
| Email queue records: recipient address, kind, status, attempt count, error text, timestamps | `outbox` | Admin screen (per request); database access | Indefinite |
| Email content | Not stored. Rendered at send time; transits the SMTP provider and arrives in team and customer mailboxes | Mail provider; recipients | Governed by the mail provider and mailbox retention |
| Client IP address | In-memory rate limiter only (up to 15 minutes); not written to the database | Process memory | Auto-expires; but hosting/proxy logs may record it |
| Admin token | In admin's `sessionStorage` while the tab is open | The admin's browser | Closed with the tab |
| Console logs | Process output. In `MAIL_TRANSPORT=log` (dev default) this **prints full email text, including names and request content, to the console**; in `smtp` mode it logs only errors | Hosting log tooling | Hosting dependent |
| Honeypot-triggered submissions | Not stored | n/a | n/a |

Not present, so the notice says so: no analytics, advertising cookies, third-party scripts or fonts on the marketing site or platform; no tracking pixels in emails; no AI model processing of requests (the first read is fixed rules); no payment data.

## B2. Roles

- For the data above Northbound is the **controller**.
- Hosting, email and any other tool that holds this data are **processors**; each needs a DPA, and they belong in `DPA.md` Annex 3 only where Northbound acts as a processor for a client (different data). Keep two lists: processors for our own enquiries (this notice) and sub-processors for client work (the DPA annex).
- If a prospect's request includes personal data of their customers (which the form tells them not to do), treat it as an incident: delete and tell the sender.

## B3. Questions for counsel

1. **Legal basis and consent.** Is "legitimate interests / pre-contract steps" right for replying, and is the ticked checkbox appropriate as the additional consent, or should it be removed to avoid implying consent is the only basis (and creating withdrawal expectations)? Marketing emails are not sent; confirm none will be without separate opt-in.
2. **Jurisdictions.** Which regimes apply (UK, EU, US states, others) and do we need an EU/UK representative or a DPO? Do we need a separate US-state section?
3. **Transfers.** Confirm safeguards once hosting region and email provider are decided.
4. **Retention periods.** Confirm 12 months for unconverted enquiries and the other periods.
5. **ePrivacy / cookies.** Session storage here is "strictly necessary" for a service the user requested. Confirm no consent banner is needed in your target markets.
6. **Email.** Are the confirmation emails permitted communications as a response to an enquiry in each jurisdiction (PECR, CAN-SPAM, CASL)? Does the confirmation need a postal address and unsubscribe wording?
7. **Staff and contractors.** Do confidentiality terms and access controls for people who see enquiries meet your obligations?
8. **Breach process.** Confirm the notification wording and timelines for this notice, aligned with `DPA.md` (72 hours) and `AI_POLICY.md` section 10.
9. **Business-contact data.** Is a lighter-touch notice acceptable for business-to-business enquiries in your main markets? (Keep the full notice regardless for regulated regions.)
10. **Case studies.** Anything published about a client is governed by `MSA.md` clause 15.6 and `CASE_STUDY_TEMPLATE.md`, not this notice. Confirm that personal data in testimonials is handled separately.

## B4. Consistency with the other documents

- `DPA.md`: that is for personal data Northbound handles *for clients*; this notice is for Northbound's *own* enquiry data. Don't mix the two.
- `NDA.md` 6.2 and `SOW_POC.md` section 8: no production personal data before a DPA. The form's "please don't include..." line supports this.
- `AI_POLICY.md`: no use of enquiry data for model training; if AI is later used to analyse enquiries, the policy tool list, this notice and the DPA annex must all be updated first.

---

# Part C: Product changes needed (engineering)

Honest list of gaps between what the notice promises and what the code does today.

| # | Gap | Why it matters | Suggested fix |
|---|---|---|---|
| 1 | **No automatic deletion.** Requests, queue records and tokens are kept indefinitely | The notice states retention periods | Scheduled job deleting requests (and their `outbox` rows) older than the retention period unless marked as a client or on hold |
| 2 | **No way to delete or export one person's data** | Needed to honour deletion and access requests | Admin actions: "Export" (JSON) and "Delete request" (removes the request and its outbox rows), with an audit entry that keeps no personal data |
| 3 | **No link to the notice from the form, emails or site** | Transparency at the point of collection | Add the short notice next to the consent checkbox; add a footer link on `platform/` pages, in both emails and on `index.html` |
| 4 | **Consent isn't recorded with text and time** (only a `true` flag, plus the request timestamp) | Evidence of what was agreed | Store the notice version shown and the timestamp with the request |
| 5 | **Edit token never expires** | Long-lived bearer secret for personal data | Expire after, for example, 30 days; consider hashing it in the database |
| 6 | **`MAIL_TRANSPORT=log` prints personal data to console** | Fine for development, risky in a hosted environment | Fail startup in production if the transport is `log`, or redact the body in log mode |
| 7 | **Encryption at rest and backups undecided** (local SQLite file) | Notice section 7 can't claim it yet | Decide when moving to Azure SQL or similar; update section 7 |
| 8 | **Single shared admin token, no access log** | Weak accountability for who viewed personal data | Entra ID sign-in for staff, with an audit log of views and changes |
| 9 | **Hosting and proxy logs not configured** | Notice says logs are kept for a set period | Set retention on the hosting platform and mask IPs if possible |
| 10 | **Cookie/storage statement** | Must stay true | Re-check whenever anyone adds analytics, fonts, embeds or chat widgets |

*Gaps 1 to 3 should be fixed before the platform is promoted publicly. I can implement them when you're ready.*
