import {
  GraduationRequirement,
  LibraryBookSummary,
  PortfolioArtifact,
  RegistrarEntry,
  StudentMemory,
  StudentProfile,
} from './types';

export const GRADUATION_REQUIREMENTS: GraduationRequirement[] = [
  { category: 'Humanities & History', requiredCredits: 4.0 },
  { category: 'Laboratory Science', requiredCredits: 4.0 },
  { category: 'Mathematics', requiredCredits: 4.0 },
  { category: 'Literature & Rhetoric', requiredCredits: 4.0 },
  { category: 'Civics & Economics', requiredCredits: 2.5 },
  { category: 'Practical Arts & Economy', requiredCredits: 3.5 },
  { category: 'Worldview & Stewardship', requiredCredits: 2.0 },
];

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'student-ellie',
    name: 'Ellie',
    age: 11,
    gradeLabel: '6th Grade · Scout',
    tier: 'Scout',
    interests: [],
    currentFocus: 'Clean slate — ready to explore, assess knowledge, and discover interests',
    pace: 'Steady',
    targetGraduationYear: 2033,
  },
  {
    id: 'student-cash',
    name: 'Cash',
    age: 13,
    gradeLabel: '8th Grade · Sovereign',
    tier: 'Sovereign',
    interests: [],
    currentFocus: 'Clean slate — ready to explore, assess knowledge, and discover interests',
    pace: 'Steady',
    targetGraduationYear: 2031,
  },
  {
    id: 'student-della',
    name: 'Della',
    age: 14,
    gradeLabel: '9th Grade · Sovereign',
    tier: 'Sovereign',
    interests: [],
    currentFocus: 'Clean slate — ready to explore, assess knowledge, and discover interests',
    pace: 'Steady',
    targetGraduationYear: 2030,
  },
  {
    id: 'student-addy',
    name: 'Addy',
    age: 16,
    gradeLabel: '11th Grade · Sovereign',
    tier: 'Sovereign',
    interests: [],
    currentFocus: 'Clean slate — ready to explore, assess knowledge, and discover interests',
    pace: 'Steady',
    targetGraduationYear: 2028,
  },
];

export const INITIAL_REGISTRAR_ENTRIES: RegistrarEntry[] = [];

export const INITIAL_PORTFOLIO_ARTIFACTS: PortfolioArtifact[] = [];

export const CURATED_LIBRARY_BOOKS: LibraryBookSummary[] = [
  {
    id: 14474,
    title: 'The Chemical History of a Candle',
    authors: ['Michael Faraday'],
    subjects: ['Chemistry', 'Science Lectures', 'Natural History'],
    downloadCount: 2450,
    coverUrl: 'https://www.gutenberg.org/cache/epub/14474/pg14474.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/14474/pg14474.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/14474',
  },
  {
    id: 21,
    title: "Aesop's Fables",
    authors: ['Aesop'],
    subjects: ['Fables', 'Classic Literature', 'Wisdom'],
    downloadCount: 18400,
    coverUrl: 'https://www.gutenberg.org/cache/epub/21/pg21.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/21/pg21.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/21',
  },
  {
    id: 23,
    title: 'Narrative of the Life of Frederick Douglass, an American Slave',
    authors: ['Frederick Douglass'],
    subjects: ['Primary History', 'Autobiography', 'Civil Rights'],
    downloadCount: 26300,
    coverUrl: 'https://www.gutenberg.org/cache/epub/23/pg23.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/23/pg23.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/23',
  },
  {
    id: 20203,
    title: 'Autobiography of Benjamin Franklin',
    authors: ['Benjamin Franklin'],
    subjects: ['American History', 'Entrepreneurship', 'Autobiography'],
    downloadCount: 14200,
    coverUrl: 'https://www.gutenberg.org/cache/epub/20203/pg20203.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/20203/pg20203.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/20203',
  },
  {
    id: 147,
    title: 'Common Sense',
    authors: ['Thomas Paine'],
    subjects: ['American Revolution', 'Political Philosophy', 'Primary Source'],
    downloadCount: 19800,
    coverUrl: 'https://www.gutenberg.org/cache/epub/147/pg147.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/147/pg147.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/147',
  },
  {
    id: 131,
    title: "The Pilgrim's Progress",
    authors: ['John Bunyan'],
    subjects: ['Christian Allegory', 'Classic Literature'],
    downloadCount: 9500,
    coverUrl: 'https://www.gutenberg.org/cache/epub/131/pg131.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/131/pg131.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/131',
  },
  {
    id: 514,
    title: 'Little Women',
    authors: ['Louisa May Alcott'],
    subjects: ['Family Fiction', '19th Century Literature'],
    downloadCount: 41200,
    coverUrl: 'https://www.gutenberg.org/cache/epub/514/pg514.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/514/pg514.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/514',
  },
  {
    id: 1342,
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    subjects: ['British Literature', 'Social Commentary'],
    downloadCount: 68900,
    coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/1342',
  },
  {
    id: 201,
    title: 'Flatland: A Romance of Many Dimensions',
    authors: ['Edwin Abbott Abbott'],
    subjects: ['Mathematics', 'Geometry', 'Satire'],
    downloadCount: 11200,
    coverUrl: 'https://www.gutenberg.org/cache/epub/201/pg201.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/201/pg201.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/201',
  },
  {
    id: 3836,
    title: 'The Swiss Family Robinson',
    authors: ['Johann David Wyss'],
    subjects: ['Adventure', 'Practical Homesteading', 'Natural History'],
    downloadCount: 8400,
    coverUrl: 'https://www.gutenberg.org/cache/epub/3836/pg3836.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/3836/pg3836.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/3836',
  },
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    authors: ['Lewis Carroll'],
    subjects: ['Logic & Language', 'Classic Fiction'],
    downloadCount: 49300,
    coverUrl: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/11/pg11.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/11',
  },
  {
    id: 205,
    title: 'Walden, and On The Duty Of Civil Disobedience',
    authors: ['Henry David Thoreau'],
    subjects: ['Natural Observation', 'Philosophy', 'Civics'],
    downloadCount: 22100,
    coverUrl: 'https://www.gutenberg.org/cache/epub/205/pg205.cover.medium.jpg',
    textUrl: 'https://www.gutenberg.org/cache/epub/205/pg205.txt',
    htmlUrl: 'https://www.gutenberg.org/ebooks/205',
  },
];

export const CONVERSATION_STARTERS = [
  {
    label: 'Why do autumn leaves turn red and gold?',
    track: "God's Creation & Science" as const,
    mode: 'investigation' as const,
  },
  {
    label: 'Read the Boston Tea Party through eyewitness accounts',
    track: 'Truth-Based History' as const,
    mode: 'investigation' as const,
  },
  {
    label: 'Price and bake a real family market recipe using ratios',
    track: 'Creative Economy & Practical Arts' as const,
    mode: 'family project' as const,
  },
  {
    label: 'How do local water utilities and watersheds actually work?',
    track: 'Justice & Change-making' as const,
    mode: 'public-interest investigation' as const,
  },
];

const EMPTY_MEMORY: StudentMemory = {
  shortTerm: {
    currentSessionTopics: [],
    recentMisconceptions: [],
    activeBookProgress: null,
    lastUpdated: '',
  },
  longTerm: {
    learnedAboutStudent: [],
    masteredConcepts: [],
    recurringPassions: [],
    identifiedGaps: [],
  },
};

export const INITIAL_MEMORIES: Record<string, StudentMemory> = {
  'student-ellie': EMPTY_MEMORY,
  'student-cash': EMPTY_MEMORY,
  'student-della': EMPTY_MEMORY,
  'student-addy': EMPTY_MEMORY,
};

