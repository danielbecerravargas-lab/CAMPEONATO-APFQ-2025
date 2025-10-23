// FIX: Removed self-import of 'Team' that conflicted with the local declaration.
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  idCard: string;
  birthDate: string;
  photoUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export enum MatchStatus {
  Pending = 'Pending',
  Finished = 'Finished',
}

export interface MatchSet {
  team1: number | null;
  team2: number | null;
}

export interface Match {
  id: string;
  categoryId: string;
  team1: Team;
  team2: Team;
  sets: MatchSet[];
  winner: Team | null;
  status: MatchStatus;
  date: string;
}

export interface Standings {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
}

export interface Category {
  id: string;
  name: string;
  teamIds: string[];
}

export interface TeamImportPayload {
  importedTeams: { name: string; playerNames: string[] }[];
  playersToCreate: string[];
}

export interface CategoryImportPayload {
  name: string;
  teamNames: string[];
}