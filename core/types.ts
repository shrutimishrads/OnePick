/**
 * OnePick Core Data Contracts
 * Pure types shared across Fire TV app, scoring engine, and AWS Bedrock handlers.
 */

export interface Viewer {
  id: string;
  name: string;
  avatar?: string;
  likes: string[]; // genres, directors, themes
  mood?: string;
  maxMinutes?: number;
  excludes: string[]; // dealbreaker genres or themes
}

export interface Title {
  id: string;
  name: string;
  genres: string[];
  moods: string[];
  minutes: number;
  rating: string; // e.g. "PG-13", "R", "TV-MA"
  year: number;
  art: string; // poster / backdrop image url
  synopsis?: string;
}

export interface Constraints {
  viewers: Viewer[];
  watched: string[];
  maxMinutes?: number;
  requiredGenre?: string;
  targetMood?: string;
}

export interface ViewerScoreDetail {
  viewerId: string;
  viewerName: string;
  score: number; // 0 to 100
  reasons: string[];
}

export interface Candidate {
  title: Title;
  groupScore: number; // 0 to 100, fairness-adjusted
  minViewerScore: number;
  perViewer: ViewerScoreDetail[];
}

export interface ConstraintPatch {
  maxMinutes?: number;
  watched?: string[];
  addedExcludes?: { viewerId?: string; exclude: string }[];
  targetMood?: string;
  requiredGenre?: string;
}

export interface BedrockExplainRequest {
  candidate: Candidate;
  viewers: Viewer[];
  userQuery?: string;
}

export interface BedrockExplainResponse {
  summary: string;
  tradeOff?: string;
  consensusHighlight: string;
}

export interface BedrockParseRequest {
  userUtterance: string;
  currentConstraints: Constraints;
  availableTitles?: { id: string; name: string }[];
}

export interface BedrockParseResponse {
  patch: ConstraintPatch;
  interpretedIntent: string;
}
