// A transparent, rule-based first read of a request. It does not call a model,
// so it is fast, free and explainable; a person always follows up.

const AI_TOOLS = /\b(lovable|bolt|cursor|v0|replit|windsurf|copilot|claude|chatgpt|vibe[- ]?cod\w*|ai[- ]generated|ai[- ]built|built (it |this )?with ai)\b/;
const PROTOTYPE = /\b(prototype|proof of concept|poc|demo|mvp|pilot|vibe[- ]?cod\w*|lovable|bolt|replit|v0)\b/;
const IDEA = /\b(idea|thinking (about|of)|want to build|planning|concept|explor\w+)\b/;
const LIVE = /\b(in production|go(ing)? live|live users|customers (are|use)|already (live|used))\b/;
const WANTS_AI = /\b(ai|llm|gpt|copilot|chatbot|agents?|rag|openai|foundry|assistant|summari[sz]\w+|extract\w*)\b/;
const MICROSOFT = /(azure|\.net|microsoft|entra|power platform|foundry|sharepoint|dynamics|teams|office 365|m365)/;
const WANTS_DATA = /\b(spreadsheets?|excel|data (quality|clean\w*|silos?|warehouse|migration|governance|management|integration|lake)|single source of truth|duplicate (records|data)|reporting|dashboards?|messy data|master data|crm data)\b/;
const WANTS_HOSTING = /\b(hosting|hosted|cloud|aws|azure|gcp|google cloud|vercel|netlify|heroku|supabase|firebase|digitalocean|uptime|downtime|backups?|servers?|devops|infrastructure)\b/;
const WANTS_SUPPORT = /\b(support|maintenance|maintain|keep (it )?running|on[- ]call|retainer|sla|monitoring)\b/;

// Which service line each route belongs to. A brand's "focus" lines are shown first.
const LINE = { 'vibe-migration': 'production', poc: 'production', build: 'production', 'ai-addon': 'ai', data: 'data', hosting: 'hosting', support: 'support', advice: 'support' };

function inferStage(text) {
  if (LIVE.test(text)) return 'live';
  if (PROTOTYPE.test(text)) return 'prototype';
  if (IDEA.test(text)) return 'idea';
  return null;
}

/**
 * `focus` is the list of service lines a brand leads with (production, support, ai, data, hosting).
 * Their routes get a boost, and are offered even when the request does not mention them.
 */
export function recommend(a, { focus = [] } = {}) {
  const text = [a.goal, a.outcome, a.stack, a.timingNote, a.notes].filter(Boolean).join(' ').toLowerCase();
  const help = new Set(a.helpWith || []);
  const built = new Set(a.builtWith || []);

  // A brand that is about taking AI-built apps to production assumes visitors have one, unless they say otherwise.
  const stage = a.stage || inferStage(text) || (focus.includes('production') ? 'prototype' : null);
  const aiBuilt = built.has('ai-tools') || AI_TOOLS.test(text);
  const wantsAI = help.has('ai') || WANTS_AI.test(text);
  const microsoft = help.has('microsoft') || MICROSOFT.test(text + ' ' + (a.stack || '').toLowerCase());
  const hasPrototype = ['prototype', 'mvp', 'live'].includes(stage);
  const wantsData = help.has('data') || WANTS_DATA.test(text);
  const wantsHosting = help.has('hosting') || WANTS_HOSTING.test(text);
  const wantsSupport = help.has('support') || WANTS_SUPPORT.test(text);

  const candidates = [];

  if (hasPrototype || help.has('production')) {
    const alongside = a.team === 'some' || a.team === 'strong';
    const endToEnd = a.team === 'none';
    candidates.push({
      score: 90 + (aiBuilt ? 5 : 0) + (help.has('production') ? 5 : 0),
      id: 'vibe-migration',
      title: 'Take what you built to production',
      why: aiBuilt
        ? 'AI tools are brilliant at getting a working demo in front of people. The gap between that and something you can rely on is usually the same few things: sign-in and permissions, secrets, the data model, tests and a repeatable way to deploy. All fixable, and much of what you built is a good specification.'
        : 'You have something that works. The gap between that and something you can rely on is usually sign-in and permissions, secrets, the data model, tests and a repeatable way to deploy and support it.',
      how: endToEnd
        ? 'With no developers on your side, we can take it on end to end and hand back something hardened, tested and deployed.'
        : alongside
          ? 'With developers on your side, we can work alongside them: review, pair on the hard parts, and leave your team able to run it.'
          : 'Either we work alongside your developers or we take it on end to end, whichever suits you.',
      firstStep: 'A short call, then a look at the code together, so you know what is solid and what needs work before anyone commits to anything.',
    });
  }

  if (stage === 'idea' || help.has('poc') || help.has('unsure') || (!stage && !candidates.length)) {
    candidates.push({
      score: stage === 'idea' ? 95 : 70,
      id: 'poc',
      title: 'See it working in a week',
      why: 'If you are not yet sure it will work, or want to see it before deciding, a focused week against your real constraints gets you something running and an honest answer about what it would take.',
      how: 'We agree what success looks like on day one, build the thinnest slice that proves the risky part, and show you on day five.',
      firstStep: 'A conversation to pin down the one thing you most need to find out.',
    });
  }

  if (wantsAI || focus.includes('ai')) {
    candidates.push({
      score: wantsAI ? 80 + (stage === 'existing' || stage === 'live' ? 8 : 0) : 55,
      id: 'ai-addon',
      title: 'Add AI to what you already run',
      why: 'You do not need to rebuild anything to get useful AI into an existing application: search over your own documents, summarising, data extraction, or an assistant that can act through your existing systems.',
      how: microsoft
        ? 'We would build it on the Microsoft stack you already use, with Azure AI Foundry for model deployment, evaluation and governance, and your existing sign-in and permissions.'
        : 'We start with one use case, measure how well it works on your data, and add the guardrails before it goes near users.',
      firstStep: 'Pick the one workflow where AI would save the most time, and look at what data it needs.',
    });
  }

  if (help.has('build') || (stage === 'existing' && !wantsAI)) {
    candidates.push({
      score: 75,
      id: 'build',
      title: 'Build it properly',
      why: 'For something new, or a serious extension to something existing, we design for the people who will run it, so your team can own it afterwards.',
      how: 'A short discovery to settle scope and architecture, then delivery in small steps you can see.',
      firstStep: 'A scoping conversation, with an outline of how we would approach it.',
    });
  }

  if (wantsData || focus.includes('data')) {
    candidates.push({
      score: wantsData ? 88 : 55,
      id: 'data',
      title: 'Get your data organised and trustworthy',
      why: 'Data scattered across spreadsheets, old systems and apps usually costs more than it looks: people re-key it, trust it less, and cannot answer simple questions. The fix is usually to find where it lives, agree one source of truth, clean it up, and set simple rules for who owns what.',
      how: 'We start with an inventory of where your data lives and who uses it, then consolidate and clean what matters most, set up reporting you can rely on, and put backups and access rules in place.',
      firstStep: 'A short call, then a data inventory so you can see what you have and what is worth fixing first.',
    });
  }

  if (wantsHosting || focus.includes('hosting')) {
    candidates.push({
      score: wantsHosting ? 84 : 55,
      id: 'hosting',
      title: 'Run it somewhere reliable',
      why: 'Apps often start on a free tier or one person\'s account. A proper home means backups, monitoring, security updates, costs you can predict, and a safe way to release changes.',
      how: 'We set up hosting that fits the size of what you run: a managed platform where that is enough, a fuller cloud setup where you need it, with backups, monitoring and a cost cap from day one.',
      firstStep: 'A review of where it runs today and what it costs, then a plan with options.',
    });
  }

  if (help.has('support') || wantsSupport || stage === 'live' || focus.includes('support')) {
    candidates.push({
      score: help.has('support') ? 80 : wantsSupport ? 72 : stage === 'live' ? 62 : 55,
      id: 'support',
      title: 'Keep it running, with someone to call',
      why: 'Once people depend on a system, you need someone who knows it: to fix things quickly, apply security updates, watch for problems and make small changes safely.',
      how: 'A named team takes it on with agreed response times, monitoring, regular updates and a monthly check-in. Systems we did not build start with a short review.',
      firstStep: 'Tell us what you run and what happens when it goes wrong, and we will outline what support would look like.',
    });
  }

  if (help.has('advice')) {
    candidates.push({
      score: 78,
      id: 'advice',
      title: 'A senior second opinion',
      why: 'Sometimes what helps most is an experienced person to talk decisions through: architecture, vendors, AI strategy, hiring.',
      how: 'This can be a one-off conversation or a standing arrangement, whichever fits.',
      firstStep: 'Tell us the decision you are facing and we will say honestly whether we can help.',
    });
  }

  // A brand's focus lines lead.
  // Earlier focus lines get a slightly bigger boost, so the order of the list breaks ties.
  for (const c of candidates) {
    const i = focus.indexOf(LINE[c.id]);
    if (i >= 0) c.score += 40 + (focus.length - i);
  }

  if (!candidates.length) {
    candidates.push({
      score: 1,
      id: 'conversation',
      title: 'Let us talk it through',
      why: 'From what you have told us we cannot yet tell which route would help most, and that is fine. Half an hour usually makes it clear, including when the answer is that you do not need us.',
      how: 'We ask questions, you ask questions, and we tell you what we think.',
      firstStep: 'A no-obligation call.',
    });
  }

  const paths = candidates
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map(({ score, ...p }) => p);

  const flags = [];
  if (a.data === 'personal' || a.data === 'regulated') {
    flags.push('Because personal or regulated data is involved, we will sign an NDA before looking at anything, and agree a data processing agreement before touching real personal data. Until then, please use masked or sample data.');
  } else if (a.wantsNda) {
    flags.push('You asked for an NDA, so we will send our mutual NDA before we ask to see anything.');
  }
  if (a.timing === 'urgent') {
    flags.push('You mentioned time pressure, so we will put a short triage call first and sort out what needs doing now versus later.');
  }
  if (stage === 'idea') {
    flags.push('Since this is still at idea stage, there is no rush to build. A conversation to sharpen it may be all you need right now.');
  }

  const questions = ['What does success look like for you in the next three months?'];
  if (hasPrototype) {
    questions.push('Who uses it today, and what happens if it goes down?');
    questions.push('Where does it run, and who can change it?');
  }
  if (wantsAI) questions.push('Which task would you most like AI to take off someone\'s plate?');
  if (paths.some((x) => x.id === 'data')) questions.push('Which systems and spreadsheets hold the data today, and who owns each one?');
  if (paths.some((x) => x.id === 'hosting')) questions.push('Where does it run today, and roughly what does that cost each month?');
  if (paths.some((x) => x.id === 'support') && !hasPrototype) questions.push('What happens when it breaks, and who gets called?');
  if (!a.data) questions.push('What kind of data does it handle?');
  if (!a.team) questions.push('Do you have developers on your side, or would you like us to take the work on?');

  return {
    headline: paths[0].title,
    inferred: { stage: stage || null, aiBuilt, wantsAI, wantsData, wantsHosting, wantsSupport, microsoft },
    paths,
    flags,
    questions: questions.slice(0, 5),
  };
}
