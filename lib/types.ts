export type LearningTier = 'Sprout' | 'Scout' | 'Sovereign';

export type TrackName =
  | 'Truth-Based History'
  | 'Justice & Change-making'
  | "God's Creation & Science"
  | 'Mathematics & Logic'
  | 'Literature & Rhetoric'
  | 'Creative Economy & Practical Arts'
  | 'Discipleship & Stewardship';

export type CreditCategory =
  | 'Humanities & History'
  | 'Laboratory Science'
  | 'Mathematics'
  | 'Literature & Rhetoric'
  | 'Civics & Economics'
  | 'Practical Arts & Economy'
  | 'Worldview & Stewardship';

export type ExperienceMode =
  | 'investigation'
  | 'STEM'
  | 'STEAM'
  | 'maker/build'
  | 'family project'
  | 'public-interest investigation'
  | 'civic-action project';

export interface GraduationRequirement {
  category: CreditCategory;
  requiredCredits: number;
}

export interface ShortTermMemory {
  currentSessionTopics: string[];
  recentMisconceptions: string[];
  activeBookProgress: string | null;
  lastUpdated: string;
}

export interface LongTermMemory {
  learnedAboutStudent: string[];
  masteredConcepts: string[];
  recurringPassions: string[];
  identifiedGaps: string[];
}

export interface StudentMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
}

export interface GraduationGapItem {
  category: CreditCategory;
  earned: number;
  required: number;
  expectedByAge: number;
  deficit: number;
  pct: number;
  suggestedBridgeTopic: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  age: number;
  gradeLabel: string;
  tier: LearningTier;
  interests: string[];
  currentFocus: string;
  pace: 'Gentle' | 'Steady' | 'Accelerated';
  targetGraduationYear: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'adeline';
  content: string;
  timestamp: string;
  suggestedClassroom?: {
    topic: string;
    track: TrackName;
    experienceMode: ExperienceMode;
    drivingQuestion: string;
  };
  followUpPrompts?: string[];
  evidenceDistinction?: {
    established: string[];
    openQuestions: string[];
  };
  memoryNote?: string;
}

export interface TierGuide {
  tier: LearningTier;
  ageRange: string;
  focusVerb: string;
  taskDescription: string;
  deliverable: string;
}

export interface ClassroomStage {
  id: string;
  phase: 'Invitation' | 'Discovery' | 'Action' | 'Demonstration';
  title: string;
  slidePoints: string[];
  content: string;
  whiteboardSteps: string[];
  peerPerspectives: {
    speaker: string;
    role: 'Curious Peer' | 'Evidence Checker';
    comment: string;
  }[];
  keyTakeaway: string;
  socraticPrompt: string;
}

export interface ClassroomSimulation {
  title: string;
  variableLabel: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  outputLabel: string;
  outputUnit: string;
  multiplier: number;
  baselineOffset: number;
  lowRangeNote: string;
  optimalRangeNote: string;
  highRangeNote: string;
  optimalMin: number;
  optimalMax: number;
}

export interface InteractiveCheck {
  id: string;
  type: 'scenario' | 'evidence-distinction' | 'reasoning';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  misconceptionNote: string;
}

export interface ClassroomLesson {
  id: string;
  studentId: string;
  createdAt: string;
  topic: string;
  title: string;
  track: TrackName;
  experienceMode: ExperienceMode;
  drivingQuestion: string;
  whyItMatters: string;
  creationConnection: string;
  witnessProtocol: {
    governed: boolean;
    threshold: number | null;
    achievedConfidence: number;
    primaryEvidence: string[];
    competingInterpretations: string[];
    adelineSynthesis: string;
    researchMissionNote?: string;
  };
  stages: ClassroomStage[];
  interactiveSimulation: ClassroomSimulation;
  familyTiers: {
    sprout: TierGuide;
    scout: TierGuide;
    sovereign: TierGuide;
  };
  reinforcingActivity: {
    interactiveChecks: InteractiveCheck[];
    handsOnMission: {
      title: string;
      capabilityDeveloped: string;
      materials: string[];
      steps: string[];
      documentationPrompt: string;
      realWorldOutput: string;
    };
  };
  creditRecommendation: {
    subjectCategory: CreditCategory;
    estimatedHours: number;
    suggestedCredits: number;
  };
  status: 'in-progress' | 'completed';
}

export interface RegistrarEntry {
  id: string;
  studentId: string;
  date: string;
  title: string;
  track: TrackName;
  creditCategory: CreditCategory;
  hours: number;
  creditsEarned: number;
  masteryLevel: 'Emerging' | 'Developing' | 'Demonstrated' | 'Mastery';
  witnessVerified: boolean;
  sourceType: 'classroom' | 'library' | 'practical-life';
  notes: string;
}

export interface PortfolioArtifact {
  id: string;
  studentId: string;
  createdAt: string;
  title: string;
  track: TrackName;
  creditCategory: CreditCategory;
  drivingQuestion: string;
  studentDemonstration: string;
  handsOnNotes: string;
  evidenceSummary: string[];
  adelineFeedback: string;
  masteryLevel: 'Emerging' | 'Developing' | 'Demonstrated' | 'Mastery';
  creditsAwarded: number;
  hoursLogged: number;
}

export interface LibraryBookSummary {
  id: number;
  title: string;
  authors: string[];
  subjects: string[];
  downloadCount: number;
  coverUrl: string | null;
  textUrl: string | null;
  htmlUrl: string | null;
  recommendedTier?: LearningTier;
}

export interface ParsedBookContent {
  id: number;
  title: string;
  author: string;
  chapters: {
    index: number;
    title: string;
    paragraphs: string[];
  }[];
  totalWordCount: number;
}

export type OpportunityCategory =
  | 'All'
  | 'Art & Writing Contests'
  | 'Spelling & Academic Bees'
  | 'Science & County Fairs'
  | 'Grants & Scholarships'
  | 'Groups & Clubs'
  | 'Field Adventures';

export interface OpportunityItem {
  id: string;
  title: string;
  organizer: string;
  category: Exclude<OpportunityCategory, 'All'>;
  ageRange: string;
  deadlineOrSeason: string;
  locationScope: string;
  description: string;
  whyItFitsStudent: string;
  prepIdea: string;
  url: string;
}

export interface SavedOpportunity extends OpportunityItem {
  studentId: string;
  status: 'Exploring' | 'Preparing Entry' | 'Submitted' | 'Completed';
  savedAt: string;
}

export type AssessmentScope = 'All Domains' | CreditCategory;

export interface AssessmentQuestion {
  id: string;
  creditCategory: CreditCategory;
  track: TrackName;
  capabilityTested: string;
  scenarioContext: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AssessmentAnswerSubmission {
  questionId: string;
  selectedIndex: number;
  reasoningNote: string;
}

export interface GraduationMilestone {
  id: string;
  phase: 'Foundations' | 'Core Mastery' | 'Capstone & Launch';
  creditCategory: CreditCategory;
  track: TrackName;
  title: string;
  description: string;
  evidenceGoal: string;
  classroomTopic: string;
  creditValue: number;
  status: 'mastered' | 'in-progress' | 'upcoming';
  completedDate?: string;
  linkedEntryTitle?: string;
}

export interface DomainReadinessRating {
  category: CreditCategory;
  assessedLevel: 'Foundational' | 'Developing' | 'On Pace' | 'Accelerated';
  scorePct: number;
  summaryNote: string;
}

export interface GraduationMap {
  studentId: string;
  generatedAt: string;
  lastAssessedScope: AssessmentScope;
  overallReadinessSummary: string;
  strengthsObserved: string[];
  priorityGaps: string[];
  domainRatings: DomainReadinessRating[];
  milestones: GraduationMilestone[];
}

