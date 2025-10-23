import { Team, Match, MatchStatus, Standings, Category } from '../types';

export const generateRoundRobinMatches = (teams: Team[], category: Category, twoLegged: boolean = false): Match[] => {
  const matches: Match[] = [];
  if (teams.length < 2) {
    return [];
  }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      // First leg (ida)
      const match1: Match = {
        id: `match-${Date.now()}-${i}-${j}-1`,
        categoryId: category.id,
        team1: teams[i],
        team2: teams[j],
        sets: [
          { team1: null, team2: null }, // Set 1
          { team1: null, team2: null }, // Set 2
          { team1: null, team2: null }, // Set 3 (Tiebreaker)
        ],
        winner: null,
        status: MatchStatus.Pending,
        date: '',
      };
      matches.push(match1);

      if (twoLegged) {
        // Second leg (vuelta)
        const match2: Match = {
          id: `match-${Date.now()}-${j}-${i}-2`, // Swapped indices for a more unique ID
          categoryId: category.id,
          team1: teams[j], // Swap teams
          team2: teams[i],
          sets: [
            { team1: null, team2: null },
            { team1: null, team2: null },
            { team1: null, team2: null },
          ],
          winner: null,
          status: MatchStatus.Pending,
          date: '',
        };
        matches.push(match2);
      }
    }
  }
  // Shuffle matches to mix legs for a more varied schedule
  return matches.sort(() => Math.random() - 0.5);
};


export const calculateStandings = (teams: Team[], matches: Match[]): Standings[] => {
  const standingsMap: Map<string, Standings> = new Map(
    teams.map(team => [
      team.id,
      {
        team,
        played: 0,
        wins: 0,
        losses: 0,
        points: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifference: 0,
      },
    ])
  );

  const relevantMatches = matches.filter(match => 
    teams.some(t => t.id === match.team1.id) && teams.some(t => t.id === match.team2.id)
  );

  relevantMatches.forEach(match => {
    if (match.status !== MatchStatus.Finished || !match.winner) {
        return;
    }

    const winnerId = match.winner.id;
    const loserId = winnerId === match.team1.id ? match.team2.id : match.team1.id;
    const winnerStandings = standingsMap.get(winnerId);
    const loserStandings = standingsMap.get(loserId);

    if (!winnerStandings || !loserStandings) return;

    let team1SetWins = 0;
    let team2SetWins = 0;
    let team1TotalPoints = 0;
    let team2TotalPoints = 0;

    match.sets.forEach(set => {
        if (set.team1 !== null && set.team2 !== null) {
            team1TotalPoints += set.team1;
            team2TotalPoints += set.team2;
            if (set.team1 > set.team2) team1SetWins++;
            else if (set.team2 > set.team1) team2SetWins++;
        }
    });
    
    const isTeam1Winner = match.team1.id === winnerId;

    winnerStandings.played += 1;
    winnerStandings.wins += 1;
    loserStandings.played += 1;
    loserStandings.losses += 1;

    const winnerSets = Math.max(team1SetWins, team2SetWins);
    const loserSets = Math.min(team1SetWins, team2SetWins);
    
    if (winnerSets === 2 && loserSets === 0) {
        winnerStandings.points += 3;
    } else if (winnerSets === 2 && loserSets === 1) {
        winnerStandings.points += 2;
        loserStandings.points += 1;
    }

    if (isTeam1Winner) {
        winnerStandings.pointsFor += team1TotalPoints;
        winnerStandings.pointsAgainst += team2TotalPoints;
        loserStandings.pointsFor += team2TotalPoints;
        loserStandings.pointsAgainst += team1TotalPoints;
    } else {
        winnerStandings.pointsFor += team2TotalPoints;
        winnerStandings.pointsAgainst += team1TotalPoints;
        loserStandings.pointsFor += team1TotalPoints;
        loserStandings.pointsAgainst += team2TotalPoints;
    }

    winnerStandings.pointsDifference = winnerStandings.pointsFor - winnerStandings.pointsAgainst;
    loserStandings.pointsDifference = loserStandings.pointsFor - loserStandings.pointsAgainst;

    standingsMap.set(winnerId, winnerStandings);
    standingsMap.set(loserId, loserStandings);
  });

  const standings = Array.from(standingsMap.values());
  
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
    return b.pointsFor - a.pointsFor;
  });

  return standings;
};