// The Career tab's Exams page: the AI-103 facts, a dated plan for booking and sitting it, and every course with
// the week to start it. The exam facts are from Microsoft's own AI-103 pages and study guide, checked 21 Oct 2026.
// Dates here are written for the plan that starts 21 Oct 2026, see CAREER_START in careerPlan.ts.
import { U } from './careerPlan';

export const EXAM_NAME = 'AI-103: Developing AI Apps and Agents on Azure';
export const CERT_NAME = 'Microsoft Certified: Azure AI Apps and Agents Developer Associate';

/** What the exam is, so nothing about it is a surprise. */
export const EXAM_FACTS: { label: string; value: string }[] = [
  { label: 'Length', value: '120 minutes, proctored (watched by a supervisor)' },
  { label: 'Pass mark', value: '700 out of 1000' },
  { label: 'Where', value: 'Booked through Pearson VUE. The booking page shows which test centres and online options you can pick.' },
  { label: 'Price', value: 'Set by the country you sit it in. Sources put the usual price at about US$165. Check the New Zealand price on the booking page before you pay.' },
  { label: 'Code you need', value: 'Python and Microsoft Foundry. Microsoft says to have experience building apps in Python. That is why the plan adds a short Python task in week 4.' },
  { label: 'What it covers', value: 'Plan and manage an Azure AI solution 25 to 30 percent. Generative AI and agents 30 to 35 percent. Computer vision, text analysis and information extraction 10 to 15 percent each.' },
  { label: 'If you fail', value: 'You can retake after 24 hours. After that you wait 14 days between attempts, up to 5 attempts in 12 months, and you pay each time.' },
  { label: 'After you pass', value: 'It expires each year, and you renew with a free online assessment on Microsoft Learn, so it costs nothing to keep.' },
  { label: 'Sign in with', value: 'A personal Microsoft account, not a work or school one. Records tied to a work account are lost when you leave.' },
];

export type ExamStep = { date: string; week: number; title: string; detail: string; links: { label: string; url: string }[] };

/** The exam plan, in order, with dates. Exam day is Friday 11 December so there is room to retake. */
export const EXAM_PLAN: ExamStep[] = [
  { date: '2026-11-11', week: 4, title: 'Read the study guide and make a one page summary',
    detail: 'Open the AI-103 study guide and copy the five skill areas and their weights onto one page. Start the AI-103 learning path on Microsoft Learn. This tells you what to study, so nothing is a surprise later.',
    links: [{ label: 'AI-103 study guide', url: U.aiGuide }, { label: 'AI-103 certification page', url: U.ai103 }] },
  { date: '2026-11-11', week: 4, title: 'Learn enough Python for the exam labs',
    detail: 'Two evenings of Python for someone who already codes. You do not need to become a Python developer, only be able to read and write the short scripts the labs use.',
    links: [{ label: 'Python tutorial', url: U.pyTut }, { label: 'CS50 Python', url: U.cs50p }] },
  { date: '2026-11-18', week: 5, title: 'Do your first Foundry call in Python',
    detail: 'Deploy a model in the Microsoft Foundry portal and call it from Python. The exam expects you to have done this by hand at least once.',
    links: [{ label: 'Foundry docs', url: U.foundry }] },
  { date: '2026-11-25', week: 6, title: 'Finish the generative AI and agents modules',
    detail: 'These are the biggest part of the exam, 30 to 35 percent. Do the labs, not only the reading. Your project 2 work covers the same ground.',
    links: [{ label: 'AI-103 certification page', url: U.ai103 }] },
  { date: '2026-12-02', week: 7, title: 'Take the practice assessment, then fix your gaps',
    detail: 'Sign in to AI Skills Navigator and take the free practice assessment. Read every wrong answer. Retake until you score 80 percent twice in a row. Also try the exam sandbox once to see the question types and screen.',
    links: [{ label: 'Practice assessment', url: U.aiNav }, { label: 'Exam sandbox', url: U.aiSandbox }] },
  { date: '2026-12-03', week: 7, title: 'Book the exam for Friday 11 December',
    detail: 'Click Schedule exam on the certification page, which goes to Pearson VUE. Use your personal Microsoft account. Book by Thursday 3 December so you get a slot. Friday 11 December leaves you Saturday to Tuesday to retake if needed. Check the New Zealand price before paying.',
    links: [{ label: 'Schedule on Pearson VUE', url: U.aiSchedule }, { label: 'Pearson VUE for Microsoft', url: U.pearson }] },
  { date: '2026-12-10', week: 8, title: 'The day before: check your setup',
    detail: 'If you sit it online, test your camera, microphone and internet, and clear your desk. If you go to a test centre, check the address and travel time. Pack photo ID. Sleep early.',
    links: [{ label: 'Exam experience', url: U.examExperience }] },
  { date: '2026-12-11', week: 8, title: 'Sit AI-103',
    detail: 'You have 120 minutes. Read each scenario slowly. Skip a hard question and come back. You need 700 out of 1000. Afterwards, post the result on LinkedIn the same day.',
    links: [{ label: 'Exam sandbox', url: U.aiSandbox }] },
  { date: '2026-12-14', week: 8, title: 'If you did not pass: retake on Monday 14 December',
    detail: 'The first retake is allowed after 24 hours. Use the score report to see which areas were weak, study only those for the weekend, and book again. Later retakes need a 14 day wait, so do not leave it to chance.',
    links: [{ label: 'Retake rules', url: U.retake }] },
];

/** Ways to pay less for the exam. Offers change often, so these are places to look, not promises. */
export const SAVE_MONEY: { label: string; note: string; url: string }[] = [
  { label: 'Microsoft exam offers page', note: 'Shows current deals such as Exam Replay (a second chance if you fail). Check it before you book.', url: U.deals },
  { label: 'Microsoft Virtual Training Days', note: 'Free live online sessions. Some include a discounted or free exam voucher, but I could not confirm one for New Zealand or for AI-103, so look before you pay.', url: 'https://learn.microsoft.com/en-us/training/' },
  { label: 'Ask a recruiter or employer', note: 'Many NZ employers pay for certifications after you start. Passing it yourself first is fine, but ask before you pay for your next one.', url: U.pearson },
];

export type Course = { name: string; week: number; hours: string; why: string; url: string };

/** Every course in the plan: free ones first in the order you do them, with the week to start. */
export const COURSES: Course[] = [
  { name: 'Get started with C# (Microsoft Learn path)', week: 1, hours: '8 to 10', why: 'Your main language. Start here on day one.', url: U.csPart1 },
  { name: 'Learn Git Branching', week: 1, hours: '2', why: 'Git without fear, needed on day one of any job.', url: U.gitGame },
  { name: 'NeetCode roadmap (data structures and algorithms)', week: 1, hours: '3 a week', why: 'Interview practice, done a little every week until week 11.', url: U.neet },
  { name: 'React docs (react.dev Learn)', week: 2, hours: '6', why: 'The front end most NZ .NET jobs ask for.', url: U.react },
  { name: 'Full Stack Open parts 0 to 2', week: 2, hours: '6', why: 'University of Helsinki course. Good exercises for React.', url: U.fso },
  { name: 'TypeScript Handbook', week: 2, hours: '3', why: 'Typed JavaScript, used with React.', url: U.ts },
  { name: 'ASP.NET Core web API tutorials', week: 3, hours: '6', why: 'Building the back end of your projects.', url: U.minApi },
  { name: 'Entity Framework Core first app', week: 3, hours: '4', why: 'Talking to a database from C#.', url: U.efcore },
  { name: 'Querying with T-SQL (Microsoft Learn)', week: 3, hours: '4', why: 'SQL for SQL Server and Azure SQL.', url: U.tsql },
  { name: 'Azure App Service quickstart', week: 4, hours: '3', why: 'Putting your API live on Azure.', url: U.appService },
  { name: 'AI-103 learning path (Microsoft Learn)', week: 4, hours: '30 over weeks 4 to 7', why: 'The official course for the exam. Free.', url: U.ai103 },
  { name: 'Karpathy: Intro to LLMs (YouTube)', week: 4, hours: '2', why: 'How a language model actually works, explained clearly.', url: U.karpathy },
  { name: 'Generative AI for Beginners .NET', week: 5, hours: '8', why: 'Microsoft course on Azure OpenAI and retrieval in C#.', url: U.genaiDotnet },
  { name: 'DeepLearning.AI short course on RAG', week: 5, hours: '2', why: 'Free one to two hour courses on retrieval.', url: U.dlai },
  { name: 'AI Agents for Beginners', week: 6, hours: '6', why: 'Microsoft course on building agents.', url: U.agents },
  { name: 'Microsoft AI Skills Navigator practice assessment', week: 7, hours: '3', why: 'The free AI-103 practice test.', url: U.aiNav },
  { name: 'Docker get started', week: 8, hours: '3', why: 'Packaging your app so it runs anywhere.', url: U.docker },
  { name: 'GitHub Actions docs', week: 8, hours: '4', why: 'Automatic tests and deploys on every push.', url: U.actions },
  { name: 'Tech Interview Handbook', week: 11, hours: '6', why: 'CV, behavioural and coding interviews.', url: U.tih },
];

/** What to do after AI-103, and when not to bother. */
export const AFTER_EXAM: string[] = [
  'Once you pass, put the full certification name on your CV and LinkedIn, so recruiters find it by searching for Azure and AI.',
  'Do not book a second certification before you have a job. Employers often pay for the next one, and a deployed project matters more to a hiring manager than a second badge.',
  'If a recruiter specifically asks for another one, check on Microsoft Learn that it is still current first, because Microsoft retired several exams in 2026.',
];
