// A transparent, rule-based first read of a request. It does not call a model,
// so it is fast, free and explainable; a person always follows up.

const AI_TOOLS = /\b(lovable|bolt|cursor|v0|replit|windsurf|copilot|claude|chatgpt|vibe[- ]?cod\w*|ai[- ]generated|ai[- ]built|built (it |this )?with ai)\b/;
const PROTOTYPE = /\b(prototype|proof of concept|poc|demo|mvp|pilot|vibe[- ]?cod\w*|lovable|bolt|replit|v0)\b/;
const IDEA = /\b(idea|thinking (about|of)|want to build|planning|concept|explor\w+)\b/;
const LIVE = /\b(in production|go(ing)? live|live users|customers (are|use)|already (live|used))\b/;
const WANTS_AI = /\b(ai|llm|gpt|copilot|chatbot|agents?|rag|openai|foundry|assistant|summari[sz]\w+|extract\w*)\b/;
const MICROSOFT = /(azure|\.net|microsoft|entra|power platform|foundry|sharepoint|dynamics|teams|office 365|m365)/;

function inferStage(text) {
  if (LIVE.test(text)) return 'live';
  if (PROTOTYPE.test(text)) return 'prototype';
  if (IDEA.test(text)) return 'idea';
  return null;
}

export function recommend(a) {
  const text = [a.goal, a.outcome, a.stack, a.timingNote, a.notes].filter(Boolean).join(' ').toLowerCase();
  const help = new Set(a.helpWith || []);
  const built = new Set(a.builtWith || []);

  const stage = a.stage || inferStage(text);
  const aiBuilt = built.has('ai-tools') || AI_TOOLS.test(text);
  const wantsAI = help.has('ai') || WANTS_AI.test(text);
  const microsoft = help.has('microsoft') || MICROSOFT.test(text + ' ' + (a.stack || '').toLowerCase());
  const hasPrototype = ['prototype', 'mvp', 'live'].includes(stage);

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

  if (wantsAI) {
    candidates.push({
      score: 80 + (stage === 'existing' || stage === 'live' ? 8 : 0),
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

  if (help.has('advice') || stage === 'live') {
    candidates.push({
      score: help.has('advice') ? 78 : 60,
      id: 'advice',
      title: 'A senior second opinion, on call',
      why: stage === 'live'
        ? 'If people already depend on it, someone experienced who can look at it, answer questions and step in when something goes wrong is worth having close.'
        : 'Sometimes what helps most is an experienced person to talk decisions through: architecture, vendors, AI strategy, hiring.',
      how: 'This can be a one-off conversation or a standing arrangement, whichever fits.',
      firstStep: 'Tell us the decision you are facing and we will say honestly whether we can help.',
    });
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
  if (!a.data) questions.push('What kind of data does it handle?');
  if (!a.team) questions.push('Do you have developers on your side, or would you like us to take the work on?');

  return {
    headline: paths[0].title,
    inferred: { stage: stage || null, aiBuilt, wantsAI, microsoft },
    paths,
    flags,
    questions: questions.slice(0, 5),
  };
}
