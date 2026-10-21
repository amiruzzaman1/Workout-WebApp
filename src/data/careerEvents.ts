// Wellington events and groups for the Career tab. Dates, times, venues and prices come from techevents.co.nz
// and the groups' own Meetup pages, checked 21 Oct 2026. Past events are hidden by the page itself, so old ones
// can stay in the list. Where a page did not state a price the cost is 'Check', never guessed as free.

export type EventCost = 'Free' | 'Paid' | 'Check';

export type CareerEvent = {
  date: string; // ISO day it starts
  endDate?: string;
  time?: string;
  name: string;
  where: string; // venue, or "Online"
  cost: EventCost;
  price?: string;
  why: string;
  url: string;
  must?: boolean;
};

const T = 'https://techevents.co.nz/events/';
const WELLI_NET = 'https://www.meetup.com/wellidotnet/';

export const EVENTS: CareerEvent[] = [
  { date: '2026-10-21', time: '5:00 to 6:30 PM', name: 'Reverse engineering old games for fun (Hugh Davenport)', where: 'Wellington CBD', cost: 'Free',
    why: 'A relaxed talk by a local developer. Good first event: sit near the front and say hello at the end.', url: T + '357' },
  { date: '2026-10-22', time: '5:30 PM', name: 'GitHub Dev Days Wellington', where: 'Deloitte Wellington, Level 12, 20 Customhouse Quay', cost: 'Check',
    why: 'Run by the Wellington .NET User Group at Deloitte, which hires .NET developers. Register through the link on the group page (it uses Luma).', url: WELLI_NET, must: true },
  { date: '2026-10-29', time: '5:30 PM', name: 'Wellington UniVentures and Booster NZ Showcase 2026', where: 'Wellington CBD', cost: 'Free',
    why: 'Startup demo night. Founders are the people who hire first developers.', url: T + '415' },
  { date: '2026-10-30', endDate: '2026-10-31', time: '9:00 AM to 6:00 PM', name: 'Kawaiicon 4 (security conference)', where: 'Michael Fowler Centre', cost: 'Paid', price: '$29.95 to $99.95',
    why: 'The biggest developer crowd in Wellington this month. The cheapest ticket is about $30, so it is worth it for the contacts.', url: T + '416' },
  { date: '2026-10-30', time: '9:00 AM to 4:00 PM', name: 'HackAotearoa [WLG] co-working', where: 'Wellington CBD', cost: 'Free',
    why: 'Bring your laptop and work on project 2 next to startup builders. Easy way to meet people because you are already sitting together.', url: T + '363' },
  { date: '2026-11-04', time: '1:00 to 1:45 PM', name: 'How Re-Leased went all in on agentic engineering', where: 'Online', cost: 'Free',
    why: 'A New Zealand company explaining how it builds with AI agents. Useful to quote in interviews.', url: T + '368' },
  { date: '2026-11-13', time: '9:00 AM to 4:00 PM', name: 'HackAotearoa [WLG] co-working', where: 'Wellington CBD', cost: 'Free',
    why: 'Bring your retrieval project (week 5) and show it to someone.', url: T + '377' },
  { date: '2026-11-18', time: '12:00 PM', name: 'AI for Good Aotearoa lunch and learn', where: 'Online', cost: 'Free',
    why: 'A short lunchtime AI session you can watch from your desk.', url: T + '321' },
  { date: '2026-11-20', time: '9:30 AM', name: '.NET Conf 2026 Wellington', where: 'Microsoft, Level 12, 10 Brandon Street', cost: 'Check',
    why: 'The best event for your plan: .NET and Azure people, hosted in the Microsoft office. Register from the Wellington .NET User Group page.', url: WELLI_NET, must: true },
  { date: '2026-11-27', time: '9:00 AM to 4:00 PM', name: 'HackAotearoa [WLG] co-working', where: 'Wellington CBD', cost: 'Free',
    why: 'Show your agent work (week 6) and ask for feedback.', url: T + '385' },
  { date: '2026-12-11', time: '9:00 AM to 4:00 PM', name: 'HackAotearoa [WLG] co-working', where: 'Wellington CBD', cost: 'Free',
    why: 'This is also the suggested AI-103 exam day, so skip this one if you book the exam.', url: T + '392' },
  { date: '2026-12-17', time: '5:00 PM', name: 'SaaSmas Party Wellington 2026', where: 'Wellington CBD', cost: 'Paid', price: '$30',
    why: 'A cheap end of year party full of people from NZ software companies. Go with your CV link ready on your phone.', url: T + '329' },
];

export type Group = { name: string; what: string; often: string; cost: string; why: string; url: string };

export const GROUPS: Group[] = [
  { name: 'Wellington .NET User Group', what: 'Talks for .NET developers, recently on AI and agents. About 2,000 members. Hosted in company offices such as Deloitte, Microsoft and Chubb.',
    often: 'Roughly monthly', cost: 'Meetup group, join free', why: 'Your main stack. Join today and say yes to every event.', url: WELLI_NET },
  { name: 'Wellington Azure AI', what: 'Azure OpenAI, Semantic Kernel, vector search and Microsoft Foundry. About 1,000 members, sponsored by Microsoft and TEKSystems.',
    often: 'Every one to two months', cost: 'Meetup group, join free', why: 'Matches the AI-103 cert exactly. Recent talks: Copilot vs Claude Code vs Cursor.', url: 'https://www.meetup.com/wellington-azure-ai/' },
  { name: 'AI Tinkerers Wellington', what: 'Demo nights where local builders show what they made. The latest was 14 October at Hnry.',
    often: 'About monthly', cost: 'Free to join', why: 'Demo project 2 here once it works. People remember builders.', url: 'https://wellington.aitinkerers.org/' },
  { name: 'Wellington gen AI Meetup', what: 'Generative AI meetup, now run on Luma.', often: 'Check Luma', cost: 'Join free', why: 'More AI contacts.', url: 'https://luma.com/lg2vgwbq' },
  { name: 'Wellington DevOps Group', what: 'DevOps tools and practice for professionals and students.', often: 'Check the group', cost: 'Meetup group', why: 'Docker, pipelines and Azure DevOps, which you do in week 8.', url: 'https://www.meetup.com/wellington-devops-group/' },
  { name: 'WOSSAT (open source show and tell)', what: 'Monthly meetup on open source and open data.', often: 'Monthly', cost: 'Free', why: 'Friendly, small, good practice at talking about your code.', url: 'https://www.meetup.com/wellington-free-and-open-source-meetup/' },
  { name: 'GDG Wellington (Google Developer Group)', what: 'Android, cloud and Gemini talks.', often: 'Check the group', cost: 'Free', why: 'Extra contacts outside the Microsoft crowd.', url: 'https://gdg.community.dev/gdg-wellington/' },
  { name: 'Tech Leadership Wellington', what: 'Engineering managers and leads.', often: 'Check the group', cost: 'Meetup group', why: 'These are the people who decide hiring. Go once you have a project to show.', url: 'https://www.meetup.com/tech-leadership-wellington/' },
  { name: 'Code Camp Wellington', what: 'Free yearly conference for developers, with local speakers. The 2026 one was 21 March at Xero HQ. The 2027 date is not announced yet.',
    often: 'Once a year', cost: 'Free', why: 'The best free event of the year. Follow it so you hear when tickets open.', url: 'https://www.codecampwellington.nz/' },
];

/** Where to look for new dates, since this list is a snapshot. */
export const FIND_MORE: { label: string; note: string; url: string }[] = [
  { label: 'techevents.co.nz', note: 'NZ tech event calendar, filter by Wellington', url: 'https://techevents.co.nz/' },
  { label: 'Meetup: Wellington', note: 'All the groups above and more', url: 'https://www.meetup.com/find/nz--wellington/' },
  { label: 'Luma', note: 'Where several Wellington AI events take registrations', url: 'https://luma.com/' },
  { label: 'Creative HQ guide to Wellington tech groups', note: 'A longer list of groups', url: 'https://creativehq.co.nz/stories/tech-groups-in-wellington-how-to-find-your-community/' },
];

/** Paid events, listed so you know they exist, not as a recommendation. */
export const PAID_SKIP: { name: string; when: string; price: string; note: string; url: string }[] = [
  { name: 'Product Aotearoa Conference', when: '12 to 13 Nov', price: '$377 to $449', note: 'For product managers. Only worth it if an employer pays.', url: T + '375' },
  { name: 'Indigenous Tech Summit', when: '26 to 27 Nov', price: '$750', note: 'Expensive. Skip unless you are given a ticket.', url: T + '320' },
];

export const PLAYBOOK: string[] = [
  'Go to one event a week. Put it in your calendar when you plan the week, the same way you plan gym.',
  'The day before, look up who is hosting. If it is Deloitte, Microsoft or a company with a careers page, read the junior roles first.',
  'Have a one line intro ready: "I am finishing a Master\'s and building ASP.NET Core and Azure AI projects. I am looking for my first software role in NZ."',
  'Ask two questions: what does your team build with, and do you take on juniors? Then ask if you can send your CV.',
  'Put your LinkedIn QR code on your phone so people can connect on the spot.',
  'Send a LinkedIn note within 24 hours. Template: "Hi [name], great to meet you at [event]. I am building [project, with link]. If your team ever hires juniors I would love to send my CV. Thanks, Amir."',
  'Keep a list of every person you meet, the date, and what you promised. Follow up again in two weeks.',
];
