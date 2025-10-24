import React from 'react';
import { Player, Team, Match, MatchStatus, MatchSet } from '../types';
import { ChevronDoubleLeftIcon, UsersIcon, ListIcon } from './icons';

interface PlayerProfileProps {
  player: Player;
  teams: Team[];
  matches: Match[];
  onBack: () => void;
}

const calculateAge = (birthDateString: string): string => {
    if (!birthDateString) return 'N/A';
    const birthDate = new Date(birthDateString);
    birthDate.setMinutes(birthDate.getMinutes() + birthDate.getTimezoneOffset());
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? `${age} años` : 'Fecha inválida';
};

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, teams, matches, onBack }) => {
  const finishedMatches = matches.filter(m => m.status === MatchStatus.Finished);

  return (
    <div className="bg-surface rounded-xl shadow-lg w-full h-full flex flex-col p-6 animate-fade-in">
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary-dark font-semibold transition-colors"
        >
          <ChevronDoubleLeftIcon className="w-6 h-6" />
          Volver al Panel
        </button>
        <h1 className="text-3xl font-bold text-text-primary">Perfil del Jugador</h1>
      </header>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-shrink-0">
          {player.photoUrl ? (
            <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-md" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-primary font-bold text-5xl border-4 border-primary shadow-md">
              {player.firstName[0]?.toUpperCase()}{player.lastName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h2 className="text-4xl font-extrabold text-primary">{player.firstName} {player.lastName}</h2>
          <div className="mt-2 space-y-1 text-text-secondary">
            <p><span className="font-semibold text-text-primary">C.I:</span> {player.idCard}</p>
            <p><span className="font-semibold text-text-primary">Fecha de Nacimiento:</span> {new Date(player.birthDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p><span className="font-semibold text-text-primary">Edad:</span> {calculateAge(player.birthDate)}</p>
          </div>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        {/* Teams Section */}
        <div className="bg-background rounded-lg p-4 flex flex-col border border-border">
          <h3 className="flex items-center gap-2 text-xl font-bold text-primary mb-3">
            <UsersIcon className="w-6 h-6" />
            Equipos
          </h3>
          <div className="flex-grow overflow-y-auto pr-2">
            {teams.length > 0 ? (
              <ul className="space-y-2">
                {teams.map(team => (
                  <li key={team.id} className="bg-surface p-3 rounded-md text-text-primary font-medium">
                    {team.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-secondary text-center py-4">Este jugador no está asignado a ningún equipo.</p>
            )}
          </div>
        </div>

        {/* Match History Section */}
        <div className="bg-background rounded-lg p-4 flex flex-col border border-border">
          <h3 className="flex items-center gap-2 text-xl font-bold text-primary mb-3">
            <ListIcon className="w-6 h-6" />
            Historial de Partidos
          </h3>
          <div className="flex-grow overflow-y-auto pr-2">
            {finishedMatches.length > 0 ? (
              <ul className="space-y-3">
                {finishedMatches.map(match => {
                  const isTeam1 = match.team1.playerIds.includes(player.id);
                  const playerTeam = isTeam1 ? match.team1 : match.team2;
                  const opponentTeam = isTeam1 ? match.team2 : match.team1;
                  const isWinner = match.winner?.id === playerTeam.id;

                  const formatSets = (sets: MatchSet[]) => {
                    return sets
                      .filter(set => set.team1 !== null && set.team2 !== null)
                      .map(set => `(${set.team1}-${set.team2})`)
                      .join(' ');
                  };

                  return (
                    <li key={match.id} className="bg-surface p-3 rounded-md border-l-4 transition-colors hover:bg-gray-800"
                        style={{ borderColor: isWinner ? '#00F5A0' : '#f87171' }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-text-secondary">vs <span className="font-semibold text-text-primary">{opponentTeam.name}</span></p>
                          <p className={`text-lg font-bold ${isWinner ? 'text-primary' : 'text-red-400'}`}>
                            {isWinner ? 'Victoria' : 'Derrota'}
                          </p>
                        </div>
                        <div className="text-right">
                           <p className="font-mono text-sm text-text-primary">{formatSets(match.sets)}</p>
                           {match.date && <p className="text-xs text-text-secondary">{new Date(match.date + 'T00:00:00').toLocaleDateString('es-ES')}</p>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-text-secondary text-center py-4">No hay partidos finalizados para mostrar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
