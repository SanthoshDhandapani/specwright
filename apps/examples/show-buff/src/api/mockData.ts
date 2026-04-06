import type { Show, CastMember, ShowImage } from '../types/movie';
import type { ShowsResponse } from './tmdb';

// Mock TV shows — used when TVMaze API is not reachable or for offline dev
const SHOWS_BY_YEAR: Record<number, Show[]> = {
  2022: [
    { id: 1, name: 'The Bear', type: 'Scripted', language: 'English', genres: ['Drama', 'Comedy'], status: 'Running', runtime: 30, premiered: '2022-06-23', ended: null, rating: { average: 8.3 }, image: null, summary: '<p>A young chef from the fine dining world returns to Chicago to run his family\'s sandwich shop.</p>' },
    { id: 2, name: 'House of the Dragon', type: 'Scripted', language: 'English', genres: ['Drama', 'Fantasy'], status: 'Running', runtime: 60, premiered: '2022-08-21', ended: null, rating: { average: 8.1 }, image: null, summary: '<p>The story of the Targaryen civil war that took place about 200 years before the events of Game of Thrones.</p>' },
    { id: 3, name: 'Wednesday', type: 'Scripted', language: 'English', genres: ['Comedy', 'Crime', 'Mystery'], status: 'Running', runtime: 45, premiered: '2022-11-23', ended: null, rating: { average: 7.8 }, image: null, summary: '<p>Wednesday Addams investigates a murder spree while navigating new relationships at Nevermore Academy.</p>' },
    { id: 4, name: 'Andor', type: 'Scripted', language: 'English', genres: ['Drama', 'Science-Fiction'], status: 'Running', runtime: 45, premiered: '2022-09-21', ended: null, rating: { average: 8.0 }, image: null, summary: '<p>The tale of the emerging rebellion against the Empire and how people and planets became involved.</p>' },
    { id: 5, name: 'The White Lotus', type: 'Scripted', language: 'English', genres: ['Drama', 'Comedy'], status: 'Running', runtime: 60, premiered: '2022-10-30', ended: null, rating: { average: 7.9 }, image: null, summary: '<p>Follows the exploits of various guests and employees at an exclusive resort over the span of a week.</p>' },
  ],
  2023: [
    { id: 6, name: 'The Last of Us', type: 'Scripted', language: 'English', genres: ['Drama', 'Action', 'Adventure'], status: 'Running', runtime: 60, premiered: '2023-01-15', ended: null, rating: { average: 8.4 }, image: null, summary: '<p>Joel and Ellie must survive a brutal journey across a post-apocalyptic United States.</p>' },
    { id: 7, name: 'Beef', type: 'Scripted', language: 'English', genres: ['Drama', 'Comedy'], status: 'Ended', runtime: 30, premiered: '2023-04-06', ended: '2023-04-06', rating: { average: 8.1 }, image: null, summary: '<p>Two strangers let a road rage incident burrow into their minds and slowly consume their every thought and action.</p>' },
    { id: 8, name: 'Succession', type: 'Scripted', language: 'English', genres: ['Drama'], status: 'Ended', runtime: 60, premiered: '2023-03-26', ended: '2023-05-28', rating: { average: 8.8 }, image: null, summary: '<p>The Roy family — owners of a global media empire — fight for control of the company amidst uncertainty about the health of the patriarch.</p>' },
    { id: 9, name: 'Silo', type: 'Scripted', language: 'English', genres: ['Drama', 'Science-Fiction', 'Thriller'], status: 'Running', runtime: 60, premiered: '2023-05-05', ended: null, rating: { average: 8.0 }, image: null, summary: '<p>In a ruined and toxic future, thousands live in a giant underground silo. After its sheriff breaks a cardinal rule, engineer Juliette starts to uncover shocking secrets.</p>' },
    { id: 10, name: 'Lessons in Chemistry', type: 'Scripted', language: 'English', genres: ['Drama'], status: 'Ended', runtime: 50, premiered: '2023-10-13', ended: '2023-11-24', rating: { average: 7.6 }, image: null, summary: '<p>A 1960s chemist whose career is derailed by the patriarchy becomes the unlikely star of a cooking show.</p>' },
  ],
  2024: [
    { id: 11, name: 'Shogun', type: 'Scripted', language: 'English', genres: ['Drama', 'War', 'History'], status: 'Running', runtime: 60, premiered: '2024-02-27', ended: null, rating: { average: 8.7 }, image: null, summary: '<p>Set in 1600 Japan, Lord Yoshii Toranaga fights for his life as his enemies unite against him, acquiring the assistance of a shipwrecked English sailor.</p>' },
    { id: 12, name: 'The Penguin', type: 'Scripted', language: 'English', genres: ['Drama', 'Crime'], status: 'Ended', runtime: 60, premiered: '2024-09-19', ended: '2024-11-10', rating: { average: 8.2 }, image: null, summary: '<p>Oz Cobb rises through the Gotham criminal underworld to seize the power left behind after the Riddler\'s attack.</p>' },
    { id: 13, name: 'Fallout', type: 'Scripted', language: 'English', genres: ['Drama', 'Action', 'Science-Fiction'], status: 'Running', runtime: 60, premiered: '2024-04-10', ended: null, rating: { average: 8.0 }, image: null, summary: '<p>In a future, post-apocalyptic Los Angeles brought about by nuclear decimation, citizens must live in underground bunkers to protect themselves from radiation and mutants.</p>' },
    { id: 14, name: '3 Body Problem', type: 'Scripted', language: 'English', genres: ['Drama', 'Science-Fiction', 'Mystery'], status: 'Running', runtime: 60, premiered: '2024-03-21', ended: null, rating: { average: 7.4 }, image: null, summary: '<p>A fateful decision made in 1960s China reverberates across space and time to a group of brilliant scientists in the present day.</p>' },
    { id: 15, name: 'Baby Reindeer', type: 'Scripted', language: 'English', genres: ['Drama', 'Comedy', 'Thriller'], status: 'Ended', runtime: 30, premiered: '2024-04-11', ended: '2024-04-11', rating: { average: 7.9 }, image: null, summary: '<p>A struggling comedian\'s life is turned upside down when a vulnerable woman starts stalking him.</p>' },
    { id: 16, name: 'Ripley', type: 'Scripted', language: 'English', genres: ['Drama', 'Crime', 'Thriller'], status: 'Ended', runtime: 60, premiered: '2024-04-04', ended: '2024-04-04', rating: { average: 8.1 }, image: null, summary: '<p>In 1960s Italy, Tom Ripley is hired to convince a wealthy man\'s son to return home, but his own ambitions get in the way.</p>' },
    { id: 17, name: 'True Detective: Night Country', type: 'Scripted', language: 'English', genres: ['Drama', 'Crime', 'Thriller'], status: 'Ended', runtime: 60, premiered: '2024-01-14', ended: '2024-02-18', rating: { average: 7.0 }, image: null, summary: '<p>Detectives Liz Danvers and Evangeline Navarro investigate the disappearance of six men in Ennis, Alaska.</p>' },
    { id: 18, name: 'The Gentlemen', type: 'Scripted', language: 'English', genres: ['Drama', 'Comedy', 'Crime'], status: 'Running', runtime: 55, premiered: '2024-03-07', ended: null, rating: { average: 7.8 }, image: null, summary: '<p>When aristocratic Eddie inherits the family estate, he discovers it\'s home to an enormous weed empire.</p>' },
  ],
  2025: [
    { id: 19, name: 'Severance', type: 'Scripted', language: 'English', genres: ['Drama', 'Science-Fiction', 'Thriller'], status: 'Running', runtime: 55, premiered: '2025-01-17', ended: null, rating: { average: 8.6 }, image: null, summary: '<p>Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.</p>' },
    { id: 20, name: 'The Studio', type: 'Scripted', language: 'English', genres: ['Comedy'], status: 'Running', runtime: 30, premiered: '2025-03-26', ended: null, rating: { average: 7.5 }, image: null, summary: '<p>A comedy about the inner workings of a Hollywood movie studio.</p>' },
    { id: 21, name: 'Adolescence', type: 'Scripted', language: 'English', genres: ['Drama', 'Crime'], status: 'Ended', runtime: 55, premiered: '2025-03-13', ended: '2025-03-13', rating: { average: 8.4 }, image: null, summary: '<p>When 13-year-old Jamie is arrested for the murder of a schoolmate, his family and community are left grappling with the unimaginable.</p>' },
    { id: 22, name: 'White Lotus Season 3', type: 'Scripted', language: 'English', genres: ['Drama', 'Comedy'], status: 'Running', runtime: 60, premiered: '2025-02-16', ended: null, rating: { average: 7.3 }, image: null, summary: '<p>A new group of guests arrives at an exclusive Thai resort, bringing their secrets and desires with them.</p>' },
    { id: 23, name: 'Daredevil: Born Again', type: 'Scripted', language: 'English', genres: ['Drama', 'Action', 'Crime'], status: 'Running', runtime: 55, premiered: '2025-03-04', ended: null, rating: { average: 7.8 }, image: null, summary: '<p>Matt Murdock resumes his fight for justice in Hell\'s Kitchen as both lawyer and vigilante.</p>' },
    { id: 24, name: 'Reacher Season 3', type: 'Scripted', language: 'English', genres: ['Action', 'Crime', 'Drama'], status: 'Running', runtime: 50, premiered: '2025-02-20', ended: null, rating: { average: 7.7 }, image: null, summary: '<p>Jack Reacher continues his journey of uncovering conspiracies and delivering his brand of justice.</p>' },
    { id: 25, name: 'Alien: Earth', type: 'Scripted', language: 'English', genres: ['Horror', 'Science-Fiction', 'Thriller'], status: 'Running', runtime: 55, premiered: '2025-07-22', ended: null, rating: { average: 7.6 }, image: null, summary: '<p>The Xenomorph threat arrives on Earth, and a group of survivors must fight to save humanity.</p>' },
    { id: 26, name: 'Stranger Things Season 5', type: 'Scripted', language: 'English', genres: ['Drama', 'Science-Fiction', 'Horror'], status: 'Ended', runtime: 75, premiered: '2025-10-02', ended: '2025-10-02', rating: { average: 8.5 }, image: null, summary: '<p>The final chapter of the Hawkins saga as the friends face the ultimate battle against the Upside Down.</p>' },
  ],
};

const MOCK_CAST: Record<number, CastMember[]> = {
  1: [
    { person: { id: 101, name: 'Jeremy Allen White', image: null }, character: { id: 201, name: 'Carmen Berzatto', image: null } },
    { person: { id: 102, name: 'Ayo Edebiri', image: null }, character: { id: 202, name: 'Sydney Adamu', image: null } },
    { person: { id: 103, name: 'Ebon Moss-Bachrach', image: null }, character: { id: 203, name: 'Richard Jerimovich', image: null } },
  ],
  11: [
    { person: { id: 301, name: 'Hiroyuki Sanada', image: null }, character: { id: 401, name: 'Lord Yoshii Toranaga', image: null } },
    { person: { id: 302, name: 'Cosmo Jarvis', image: null }, character: { id: 402, name: 'John Blackthorne', image: null } },
    { person: { id: 303, name: 'Anna Sawai', image: null }, character: { id: 403, name: 'Toda Mariko', image: null } },
  ],
  19: [
    { person: { id: 501, name: 'Adam Scott', image: null }, character: { id: 601, name: 'Mark Scout', image: null } },
    { person: { id: 502, name: 'Britt Lower', image: null }, character: { id: 602, name: 'Helly Riggs', image: null } },
    { person: { id: 503, name: 'Zach Cherry', image: null }, character: { id: 603, name: 'Dylan George', image: null } },
    { person: { id: 504, name: 'John Turturro', image: null }, character: { id: 604, name: 'Irving Bailiff', image: null } },
  ],
};

function getShowById(id: number): Show | undefined {
  for (const shows of Object.values(SHOWS_BY_YEAR)) {
    const found = shows.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getMockShowsByYear(year: number, page: number): ShowsResponse {
  const shows = SHOWS_BY_YEAR[year] ?? [];
  const perPage = 10;
  const start = (page - 1) * perPage;
  const paged = shows.slice(start, start + perPage);

  return {
    page,
    results: paged,
    total_pages: Math.ceil(shows.length / perPage) || 1,
    total_results: shows.length,
  };
}

export function getMockShowDetail(id: number): Show | null {
  return getShowById(id) ?? null;
}

export function getMockShowCast(id: number): CastMember[] {
  if (MOCK_CAST[id]) return MOCK_CAST[id];
  // Default cast for shows without specific cast data
  return [
    { person: { id: 900 + id, name: 'Lead Actor', image: null }, character: { id: 800 + id, name: 'Main Character', image: null } },
    { person: { id: 901 + id, name: 'Supporting Actor', image: null }, character: { id: 801 + id, name: 'Supporting Role', image: null } },
  ];
}

export function getMockShowImages(_id: number): ShowImage[] {
  // No mock images available
  return [];
}
