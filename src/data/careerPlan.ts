// The 14 week career block: get job ready for a Software Engineer role in NZ (Azure AI-103, Python, TypeScript),
// alongside training. Ticks are saved per task id in table career_progress (schema v19), so ids must never be
// renumbered once in use: add new tasks at the end of a week, never in the middle.
import { A } from '../lib/theme';

export const CAREER_START = '2026-10-15';
export const CAREER_WEEKS = 14;

export type Phase = 'base' | 'build' | 'peak' | 'compete';
export const PHASES: Record<Phase, { label: string; blurb: string; color: string }> = {
  base: { label: 'Base', blurb: 'Get coding again', color: A.water },
  build: { label: 'Build', blurb: 'AI engineering on Azure', color: A.protein },
  peak: { label: 'Peak', blurb: 'Pass AI-103, ship to production', color: A.cardio },
  compete: { label: 'Compete', blurb: 'Interviews and applications', color: A.up },
};

export type Link = { label: string; url: string; kind?: string };
export type CareerTask = { id: string; text: string; links: Link[] };
export type CareerEvent = { when: string; text: string; url: string };
export type CareerWeek = { n: number; phase: Phase; title: string; goal: string; tasks: CareerTask[]; events: CareerEvent[] };

const yt = (q: string) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

export const U = {
  pack: 'https://education.github.com/pack',
  azStudents: 'https://azure.microsoft.com/en-us/free/students/',
  cs50p: 'https://cs50.harvard.edu/python/',
  pyTut: 'https://docs.python.org/3/tutorial/',
  gitGame: 'https://learngitbranching.js.org/',
  neet: 'https://neetcode.io/roadmap',
  leet: 'https://leetcode.com/',
  ts: 'https://www.typescriptlang.org/docs/handbook/intro.html',
  react: 'https://react.dev/learn',
  fso: 'https://fullstackopen.com/en/',
  sql: 'https://sqlbolt.com/',
  fastapi: 'https://fastapi.tiangolo.com/tutorial/',
  pg: 'https://www.postgresql.org/docs/current/tutorial.html',
  docker: 'https://docs.docker.com/get-started/',
  actions: 'https://docs.github.com/en/actions',
  next: 'https://nextjs.org/learn',
  ai103: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-apps-and-agents-developer-associate/',
  genai: 'https://microsoft.github.io/generative-ai-for-beginners/',
  agents: 'https://github.com/microsoft/ai-agents-for-beginners',
  foundry: 'https://learn.microsoft.com/en-us/azure/ai-foundry/',
  aoai: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/',
  aca: 'https://learn.microsoft.com/en-us/azure/container-apps/',
  pgvector: 'https://github.com/pgvector/pgvector',
  dlai: 'https://www.deeplearning.ai/short-courses/',
  hf: 'https://huggingface.co/learn',
  karpathy: 'https://www.youtube.com/@AndrejKarpathy',
  tih: 'https://www.techinterviewhandbook.org/',
  sdp: 'https://github.com/donnemartin/system-design-primer',
  seek: 'https://www.seek.co.nz/',
  jora: 'https://nz.jora.com/',
  indeed: 'https://nz.indeed.com/',
  hays: 'https://www.hays.net.nz/',
  randstad: 'https://www.randstad.co.nz/',
  rw: 'https://www.robertwalters.co.nz/',
  absolute: 'https://absoluteit.co.nz/',
  techevents: 'https://techevents.co.nz/',
  devevents: 'https://dev.events/OC/NZ/tech',
  aitWlg: 'https://wellington.aitinkerers.org/',
  azMeetup: 'https://www.meetup.com/wellington-azure-ai/',
  eventbrite: 'https://www.eventbrite.co.nz/d/new-zealand/technology-conference/',
  fulton: 'https://www.fultonhogan.com/join-our-team/career-pathways/earlycareers-nz/',
  smc: 'https://www.immigration.govt.nz/about-us/news-centre/further-changes-to-the-skilled-migrant-category-to-come-into-effect-in-august-2026',
  green: 'https://www.immigration.govt.nz/opsmanual/89117.htm',
  vercel: 'https://vercel.com/docs',
};

type RawTask = [string, [string, string, string?][]];
type RawWeek = { phase: Phase; title: string; goal: string; tasks: RawTask[]; events?: [string, string, string][] };

const GYM: RawTask = ['Gym: 4 sessions logged in Forge', []];
const neet: [string, string, string] = ['NeetCode roadmap', U.neet, 'site'];
const ai103: [string, string, string] = ['AI-103 page', U.ai103, 'Microsoft'];

const RAW: RawWeek[] = [
  { phase: 'base', title: 'Hands back on the keyboard', goal: 'Python fluency, Git without thinking, and the free student perks that pay for the rest of the block.', tasks: [
    ['Set up VS Code, Git and GitHub. Claim the GitHub Student Developer Pack (free Copilot and cloud credits)', [['Student Pack', U.pack, 'site']]],
    ['Claim Azure for Students: free credit, no card needed', [['Azure for Students', U.azStudents, 'Microsoft']]],
    ['CS50 Python lectures 0 to 4 at 1.5x speed, with every problem set', [['CS50P', U.cs50p, 'course'], ['Python tutorial', U.pyTut, 'docs']]],
    ['Finish every level of Learn Git Branching', [['Learn Git Branching', U.gitGame, 'site']]],
    ['DSA: 10 problems, Arrays and Hashing', [neet, ['Arrays and hashing videos', yt('NeetCode arrays and hashing'), 'YouTube']]],
    ['Fulton Hogan graduate programme closes 21 Oct. Apply if an IT stream fits', [['Fulton Hogan early careers', U.fulton, 'site']]],
    ['LinkedIn headline: Software Engineer, Python, TypeScript, Azure AI', []],
    GYM,
  ], events: [['21 to 22 Oct', 'Agentic Build Day NZ, Auckland. Go if you can travel, otherwise follow what people post from it.', U.devevents]] },
  { phase: 'base', title: 'TypeScript and React', goal: 'The frontend half of full stack, and SQL you can write from memory.', tasks: [
    ['CS50 Python weeks 5 to 9: tests, libraries, OOP', [['CS50P', U.cs50p, 'course']]],
    ['TypeScript Handbook: everyday types through generics', [['TS Handbook', U.ts, 'docs'], ['TypeScript crash course', yt('TypeScript crash course'), 'YouTube']]],
    ['React docs, the whole Learn section', [['react.dev/learn', U.react, 'docs']]],
    ['Full Stack Open parts 0 to 2', [['Full Stack Open', U.fso, 'course']]],
    ['All SQLBolt lessons', [['SQLBolt', U.sql, 'site']]],
    ['DSA: 10 problems, Two Pointers and Sliding Window', [neet]],
    GYM,
  ] },
  { phase: 'base', title: 'Backends and databases', goal: 'Node and FastAPI APIs on PostgreSQL, tested, on GitHub.', tasks: [
    ['Full Stack Open parts 3 and 4: Node, Express, testing', [['Full Stack Open', U.fso, 'course']]],
    ['FastAPI tutorial through dependencies and SQL databases', [['FastAPI tutorial', U.fastapi, 'docs'], ['FastAPI full course', yt('FastAPI full course freeCodeCamp'), 'YouTube']]],
    ['PostgreSQL: joins, indexes, transactions', [['Postgres tutorial', U.pg, 'docs']]],
    ['Mini project: FastAPI and Postgres REST API with tests, pushed to GitHub', []],
    ['DSA: 10 problems, Stack and Binary Search', [neet]],
    GYM,
  ], events: [['30 to 31 Oct', 'Kawaiicon, Michael Fowler Centre, Wellington. Security conference, very good for meeting Wellington engineers.', U.techevents]] },
  { phase: 'build', title: 'How LLMs actually work', goal: 'Understand the model, then call it from your own code on Azure. Start the AI-103 path.', tasks: [
    ['Karpathy: Intro to LLMs, then Deep Dive into LLMs', [['Karpathy channel', U.karpathy, 'YouTube']]],
    ['Microsoft Generative AI for Beginners, lessons 1 to 9', [['Course site', U.genai, 'Microsoft']]],
    ['Read the AI-103 skills outline and start its Microsoft Learn path', [['AI-103 certification page', U.ai103, 'Microsoft']]],
    ['Build: streaming chat app with Azure OpenAI through Foundry, in Python', [['Foundry docs', U.foundry, 'Microsoft'], ['Azure OpenAI docs', U.aoai, 'Microsoft']]],
    ['Forge: add unit tests for coach.ts and nutrition.ts, run them in GitHub Actions', [['GitHub Actions docs', U.actions, 'docs']]],
    ['DSA: 10 problems, Linked List and Trees', [neet]],
    GYM,
  ] },
  { phase: 'build', title: 'Retrieval (RAG)', goal: 'Start project 2: an assistant that answers from public NZ documents, such as Immigration NZ or council policy PDFs, and cites its sources.', tasks: [
    ['Generative AI for Beginners, lessons 10 to 21', [['Course site', U.genai, 'Microsoft']]],
    ['One DeepLearning.AI short course on RAG or embeddings', [['Short courses', U.dlai, 'course']]],
    ['Vector search: Azure AI Search on Microsoft Learn, or pgvector if you stay on Postgres', [['pgvector', U.pgvector, 'docs'], ['Azure AI Search RAG', yt('Azure AI Search RAG tutorial'), 'YouTube']]],
    ['Project 2: ingest 50 or more documents, answer with citations', []],
    ['DSA: 10 problems, Trees and Heaps', [neet]],
    GYM,
  ], events: [['12 to 13 Nov', 'Product Aotearoa, Tākina and Te Papa, Wellington.', U.techevents], ['13 Nov', 'HackAotearoa co-working for builders, Wellington CBD. Bring project 2.', U.techevents]] },
  { phase: 'build', title: 'Agents', goal: 'Give project 2 tools and a measured quality bar.', tasks: [
    ['AI Agents for Beginners, all lessons', [['GitHub course', U.agents, 'Microsoft']]],
    ['Foundry Agent Service: tools, function calling, multi agent', [['Foundry docs', U.foundry, 'Microsoft'], ['Foundry agents walkthrough', yt('Azure AI Foundry Agent Service tutorial'), 'YouTube']]],
    ['Project 2: add an agent that searches, summarises and drafts replies', []],
    ['Project 2: write a 20 question evaluation set and score every change against it', []],
    ['AI-103 Learn path: finish the generative AI and agents modules', [ai103]],
    ['DSA: 10 problems, Graphs', [neet]],
    GYM,
  ], events: [['25 Nov', 'AI Engineering Summit, Auckland City Centre.', U.eventbrite]] },
  { phase: 'peak', title: 'AI-103 exam prep', goal: 'Close the gaps, score well on the practice test, and book the exam.', tasks: [
    ['AI-103 Learn path: vision, language and document intelligence modules', [ai103]],
    ['Microsoft free practice assessment, 80% or more twice in a row', [['Linked on the AI-103 page', U.ai103, 'Microsoft']]],
    ['Watch one AI-103 cram video', [['AI-103 cram videos', yt('AI-103 exam cram'), 'YouTube']]],
    ['Book AI-103 for week 8', []],
    ['DSA: 8 problems, mixed review', [['LeetCode', U.leet, 'site']]],
    GYM,
  ], events: [['26 Nov', 'HackerX Auckland, a hiring event. Look for the developer ticket.', U.eventbrite], ['26 to 27 Nov', 'Indigenous Tech Summit, Wellington: AI and data sovereignty.', U.techevents], ['27 Nov', 'HackAotearoa co-working, Wellington CBD.', U.techevents]] },
  { phase: 'peak', title: 'Pass AI-103, ship project 2', goal: 'Certified, and project 2 running in production on Azure with a pipeline.', tasks: [
    ['Sit and pass AI-103', [ai103]],
    ['Containerise project 2 with Docker', [['Docker get started', U.docker, 'docs']]],
    ['Deploy to Azure Container Apps', [['Container Apps docs', U.aca, 'Microsoft']]],
    ['GitHub Actions: test, build and deploy on every push', [['GitHub Actions docs', U.actions, 'docs']]],
    ['Add logging, an error alert and a monthly cost limit', []],
    ['LinkedIn post: the cert and a short write up of project 2', []],
    GYM,
  ] },
  { phase: 'peak', title: 'Full stack front end and portfolio', goal: 'A real web front end on project 2 and one place that shows everything.', tasks: [
    ['Next.js Learn course', [['nextjs.org/learn', U.next, 'course']]],
    ['Next.js front end for project 2, with sign in and Postgres', []],
    ['Forge README: screenshots, architecture diagram, what you would do next', []],
    ['Portfolio site on Vercel linking Forge and project 2', [['Vercel docs', U.vercel, 'docs']]],
    ['DSA: 10 problems, 1D dynamic programming', [neet]],
    GYM,
  ] },
  { phase: 'compete', title: 'Interview ready, start applying', goal: 'CV, recruiters and the first applications. Use a $73k or higher salary filter so every role also clears the visa wage line.', tasks: [
    ['Tech Interview Handbook: resume and behavioural sections', [['Tech Interview Handbook', U.tih, 'site']]],
    ['One page NZ style CV: projects first, cert name in full, work rights line', []],
    ['System Design Primer: the basics section', [['System Design Primer', U.sdp, 'GitHub']]],
    ['10 applications on Seek, salary filter $73k or higher', [['Seek', U.seek, 'jobs'], ['Jora', U.jora, 'jobs']]],
    ['Register with 2 tech recruiters', [['Hays', U.hays, 'jobs'], ['Randstad', U.randstad, 'jobs'], ['Robert Walters', U.rw, 'jobs'], ['Absolute IT', U.absolute, 'jobs']]],
    ['DSA: 10 problems, mixed', [['LeetCode', U.leet, 'site']]],
    GYM,
  ] },
  { phase: 'compete', title: 'Holiday week, keep the streak', goal: 'Lighter on purpose. NZ mostly stops for Christmas, and roles posted now get fewer applicants.', tasks: [
    ['One project 2 improvement a day', []],
    ['One DSA problem a day', [['LeetCode', U.leet, 'site']]],
    ['Write a blog post: how you measured RAG quality in project 2', []],
    ['Record yourself explaining a project for 2 minutes, watch it back, redo it', []],
    ['5 applications', [['Seek', U.seek, 'jobs']]],
    ['Gym: 3 sessions logged in Forge', []],
  ] },
  { phase: 'compete', title: 'Reload', goal: 'Sharpen for the January hiring restart.', tasks: [
    ['Explain both projects in 2 minutes and in 10 minutes without notes', []],
    ['10 applications', [['Seek', U.seek, 'jobs'], ['Indeed NZ', U.indeed, 'jobs']]],
    ['DSA: 10 problems, weakest topic first', [neet]],
    ['Optional: start AZ-104 if you want the cloud support route as well', [['AZ-104 cram videos', yt('AZ-104 exam cram'), 'YouTube']]],
    GYM,
  ] },
  { phase: 'compete', title: 'Apply hard', goal: 'Hiring restarts. Volume plus personal messages.', tasks: [
    ['20 applications: Software Engineer, AI Engineer, Cloud Engineer (Azure) titles', [['Seek', U.seek, 'jobs']]],
    ['Message 10 engineers at companies you want to work for', []],
    ['2 mock technical interviews', [['Tech Interview Handbook', U.tih, 'site']]],
    GYM,
  ] },
  { phase: 'compete', title: 'Interviews and offers', goal: 'Convert interviews. Check every offer against the visa rules before you accept.', tasks: [
    ["20 applications and follow ups on last week's", [['Seek', U.seek, 'jobs']]],
    ['Prepare your questions for them and your salary answer (at least the visa line)', []],
    ["Check any offer's title and pay against Skilled Migrant rules", [['SMC changes', U.smc, 'INZ'], ['Green List', U.green, 'INZ']]],
    GYM,
  ] },
];

export const PLAN: CareerWeek[] = RAW.map((w, wi) => ({
  n: wi + 1,
  phase: w.phase,
  title: w.title,
  goal: w.goal,
  tasks: w.tasks.map(([text, links], ti) => ({ id: `w${wi + 1}t${ti}`, text, links: links.map(([label, url, kind]) => ({ label, url, kind })) })),
  events: (w.events ?? []).map(([when, text, url]) => ({ when, text, url })),
}));

export const ALL_TASK_IDS = PLAN.flatMap((w) => w.tasks.map((t) => t.id));

/** 12 hour times, as the rest of Forge shows them. */
export const RHYTHM: [string, string, string][] = [
  ['6:30 AM', 'Wake', 'Weigh in on Mondays. Log sleep in Forge.'],
  ['7:00 AM', 'Gym', 'Your Forge session, then a protein breakfast.'],
  ['8:30 AM', 'Learn', "Four hours of the week's course material. Phone in another room."],
  ['12:30 PM', 'Lunch', 'Away from the screen.'],
  ['1:30 PM', 'Build', "Four hours on the week's project. Push to GitHub before you stop."],
  ['5:30 PM', 'DSA', 'Two problems. Write the solution in your own words after.'],
  ['7:30 PM', 'Career', 'Thirty minutes: LinkedIn, one message to an engineer, applications from week 10.'],
  ['10:30 PM', 'Sleep', 'Seven and a half hours minimum. Recomp needs it.'],
];

export const LIBRARY: { title: string; items: { label: string; note?: string; url: string }[] }[] = [
  { title: 'Microsoft, free', items: [
    { label: 'AI-103 certification page', note: 'Skills outline, Learn path and free practice assessment', url: U.ai103 },
    { label: 'Generative AI for Beginners', note: '21 lessons, Python and TypeScript', url: U.genai },
    { label: 'AI Agents for Beginners', note: 'Agent Framework and Foundry Agent Service', url: U.agents },
    { label: 'Microsoft Foundry docs', note: 'Models, agents, evaluation', url: U.foundry },
    { label: 'Azure for Students', note: 'Free credit with a student email', url: U.azStudents },
    { label: 'Azure Container Apps docs', note: 'Where project 2 runs', url: U.aca },
  ] },
  { title: 'Coding fundamentals', items: [
    { label: 'CS50 Python', note: 'Harvard, free, with problem sets', url: U.cs50p },
    { label: 'Full Stack Open', note: 'Helsinki: React, Node, TypeScript, testing, CI', url: U.fso },
    { label: 'TypeScript Handbook', note: 'The official guide', url: U.ts },
    { label: 'React docs', note: 'react.dev Learn section', url: U.react },
    { label: 'Next.js Learn', note: 'Official course', url: U.next },
    { label: 'FastAPI tutorial', note: 'Official user guide', url: U.fastapi },
  ] },
  { title: 'Data and DevOps', items: [
    { label: 'SQLBolt', note: 'Interactive SQL lessons', url: U.sql },
    { label: 'PostgreSQL tutorial', note: 'Official', url: U.pg },
    { label: 'pgvector', note: 'Vector search inside Postgres', url: U.pgvector },
    { label: 'Docker get started', note: 'Official', url: U.docker },
    { label: 'GitHub Actions docs', note: 'CI and deploy pipelines', url: U.actions },
    { label: 'Learn Git Branching', note: 'Visual Git practice', url: U.gitGame },
  ] },
  { title: 'AI engineering', items: [
    { label: 'Andrej Karpathy', note: 'The best explanations of how LLMs work', url: U.karpathy },
    { label: 'DeepLearning.AI short courses', note: '1 to 2 hour hands on courses', url: U.dlai },
    { label: 'Hugging Face Learn', note: 'LLM and agents courses', url: U.hf },
    { label: 'AI-103 cram videos', note: 'YouTube search, pick the newest', url: yt('AI-103 exam cram') },
  ] },
  { title: 'Interviews', items: [
    { label: 'NeetCode roadmap', note: 'The order to learn DSA in, with videos', url: U.neet },
    { label: 'LeetCode', note: 'Practice problems', url: U.leet },
    { label: 'Tech Interview Handbook', note: 'CV, behavioural, coding interviews', url: U.tih },
    { label: 'System Design Primer', note: 'Free on GitHub', url: U.sdp },
  ] },
  { title: 'NZ jobs and recruiters', items: [
    { label: 'Seek', note: 'Main NZ job board', url: U.seek },
    { label: 'Jora NZ', note: 'Collects many boards', url: U.jora },
    { label: 'Indeed NZ', url: U.indeed },
    { label: 'Hays NZ', note: 'Tech recruiter', url: U.hays },
    { label: 'Randstad NZ', note: 'Tech recruiter', url: U.randstad },
    { label: 'Robert Walters NZ', note: 'Tech recruiter', url: U.rw },
    { label: 'Absolute IT', note: 'NZ IT recruiter', url: U.absolute },
  ] },
  { title: 'Events and community', items: [
    { label: 'techevents.co.nz', note: 'NZ tech event calendar', url: U.techevents },
    { label: 'AI Tinkerers Wellington', note: 'Builder demos, subscribe for dates', url: U.aitWlg },
    { label: 'Wellington Azure AI', note: 'Meetup group', url: U.azMeetup },
    { label: 'dev.events NZ', note: 'Conference listings', url: U.devevents },
  ] },
  { title: 'Visa', items: [
    { label: 'Skilled Migrant changes, August 2026', note: 'Immigration NZ announcement', url: U.smc },
    { label: 'Green List', note: 'Immigration NZ operational manual', url: U.green },
  ] },
];
