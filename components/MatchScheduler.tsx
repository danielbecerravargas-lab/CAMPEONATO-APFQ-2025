import React, { useState, useEffect, useRef } from 'react';
import { Match, Team, MatchStatus, Player, MatchSet } from '../types';
import { Card } from './Card';
import { ListIcon, ImportIcon, ExportIcon, PencilIcon, PdfIcon } from './icons';

// Make sure XLSX and jspdf are globally available from the script tag
declare const XLSX: any;
declare const jspdf: any;

interface MatchSchedulerProps {
  matches: Match[];
  teams: Team[];
  players: Player[];
  categoryName?: string;
  onGenerateMatches: (twoLegged: boolean) => void;
  onUpdateMatch: (matchId: string, newMatchData: Partial<Pick<Match, 'sets' | 'date'>>) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

const TeamPlayersTooltip: React.FC<{ team: Team, players: Player[] }> = ({ team, players }) => {
    const teamPlayers = players.filter(p => team.playerIds.includes(p.id));
    if (teamPlayers.length === 0) return null;
    
    return (
        <div className="absolute bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded py-1 px-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {teamPlayers.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
            <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
            </svg>
        </div>
    );
}


const MatchCard: React.FC<{ match: Match; players: Player[], onUpdateMatch: (matchId: string, newMatchData: Partial<Pick<Match, 'sets' | 'date'>>) => void; }> = ({ match, players, onUpdateMatch }) => {
    const [sets, setSets] = useState<MatchSet[]>(match.sets);
    const [date, setDate] = useState<string>(match.date || '');
    const [isEditing, setIsEditing] = useState(false);

    const isFinished = match.status === MatchStatus.Finished;
    const isDisabled = isFinished && !isEditing;

    const firstTwoSets = sets.slice(0, 2);
    const team1FirstTwoSetWins = firstTwoSets.filter(s => s.team1 !== null && s.team2 !== null && s.team1 > s.team2).length;
    const team2FirstTwoSetWins = firstTwoSets.filter(s => s.team1 !== null && s.team2 !== null && s.team2 > s.team1).length;
    const areFirstTwoSetsPlayed = firstTwoSets.every(s => s.team1 !== null && s.team2 !== null);
    const isThirdSetRelevant = areFirstTwoSetsPlayed && team1FirstTwoSetWins === 1 && team2FirstTwoSetWins === 1;

    useEffect(() => {
        // Sync local state with parent state if match data changes
        setSets(match.sets);
        setDate(match.date || '');
        // If the parent component re-renders (e.g., after a global state update),
        // we should exit editing mode to prevent stale data.
        if (isFinished) {
            setIsEditing(false);
        }
    }, [match, isFinished]);


    const handleSetScoreChange = (setIndex: number, team: 'team1' | 'team2', value: string) => {
        const newSets = JSON.parse(JSON.stringify(sets));
        const maxScore = setIndex < 2 ? 18 : 16;
        let score = parseInt(value, 10);
        if (isNaN(score)) {
            newSets[setIndex][team] = null;
        } else {
            if(score < 0) score = 0;
            if(score > maxScore) score = maxScore;
            newSets[setIndex][team] = score;
        }
        setSets(newSets);
    };

    const handleSave = () => {
        const validSets = sets.map(s => ({
            team1: s.team1 === null || isNaN(s.team1) ? null : s.team1,
            team2: s.team2 === null || isNaN(s.team2) ? null : s.team2,
        }));
        onUpdateMatch(match.id, { sets: validSets, date });
        setIsEditing(false);
    };

    const handleDateBlur = () => {
        if (date !== match.date) {
            onUpdateMatch(match.id, { date });
        }
    };

    const handleCancelEdit = () => {
        setSets(match.sets);
        setDate(match.date || '');
        setIsEditing(false);
    };


    return (
        <div className="bg-background p-4 rounded-lg border border-border transition-shadow hover:shadow-lg hover:border-primary">
            <div className="flex justify-between items-center mb-3">
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    onBlur={handleDateBlur}
                    disabled={isDisabled}
                    className="bg-gray-900 border border-border rounded-md px-2 py-1 text-sm text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${isFinished ? 'bg-green-500 text-white' : 'bg-yellow-500 text-background'}`}>
                    {isFinished ? 'Finalizado' : 'Pendiente'}
                </span>
            </div>
            {match.winner && <span className="text-sm text-text-secondary mb-2 block">Ganador: <span className="font-bold text-primary">{match.winner.name}</span></span>}
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="group relative flex-1 text-center">
                    <p className="font-bold text-lg text-text-primary truncate">{match.team1.name}</p>
                    <TeamPlayersTooltip team={match.team1} players={players} />
                </div>
                <div className="text-xl font-bold text-text-secondary">VS</div>
                <div className="group relative flex-1 text-center">
                    <p className="font-bold text-lg text-text-primary truncate">{match.team2.name}</p>
                    <TeamPlayersTooltip team={match.team2} players={players} />
                </div>
            </div>
            
            <div className="space-y-2">
                {sets.map((set, index) => {
                    const isSetDisabled = isDisabled || (index === 2 && !isThirdSetRelevant);
                    return (
                        <div key={index} className={`flex items-center gap-2 transition-opacity ${isSetDisabled && index === 2 ? 'opacity-50' : 'opacity-100'}`}>
                            <label className="text-sm font-semibold text-text-secondary w-12">Set {index + 1}:</label>
                            <input 
                                type="number"
                                min="0"
                                max={index < 2 ? 18 : 16}
                                value={set.team1?.toString() || ''}
                                onChange={e => handleSetScoreChange(index, 'team1', e.target.value)}
                                disabled={isSetDisabled}
                                className="w-full text-center bg-gray-900 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                            <span className="font-bold text-text-secondary">-</span>
                            <input 
                                type="number"
                                 min="0"
                                 max={index < 2 ? 18 : 16}
                                value={set.team2?.toString() || ''}
                                onChange={e => handleSetScoreChange(index, 'team2', e.target.value)}
                                disabled={isSetDisabled}
                                className="w-full text-center bg-gray-900 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex gap-2">
                {isFinished ? (
                    isEditing ? (
                        <>
                            <button onClick={handleSave} className="w-full bg-primary text-background font-semibold py-2 px-3 rounded-md hover:bg-primary-dark transition-colors text-sm">
                                Guardar Cambios
                            </button>
                            <button onClick={handleCancelEdit} className="w-full bg-gray-600 text-text-primary font-semibold py-2 px-3 rounded-md hover:bg-gray-500 transition-colors text-sm">
                                Cancelar
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-blue-500 transition-colors text-sm">
                            <PencilIcon className="w-4 h-4" />
                            Editar Resultados
                        </button>
                    )
                ) : (
                    <button onClick={handleSave} className="w-full bg-primary text-background font-semibold py-2 px-3 rounded-md hover:bg-primary-dark transition-colors text-sm">
                        Guardar Resultados
                    </button>
                )}
            </div>
        </div>
    );
};


export const MatchScheduler: React.FC<MatchSchedulerProps> = ({ matches, teams, players, categoryName, onGenerateMatches, onUpdateMatch, isMaximized, onToggleMaximize }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | MatchStatus>('all');
  const [filterTeamId, setFilterTeamId] = useState<'all' | string>('all');


  const handleExport = () => {
    if (!categoryName) {
      alert("No se puede exportar sin una categoría activa.");
      return;
    }
    const dataToExport = matches.map(match => ({
        'Categoría': categoryName,
        'Fecha': match.date,
        'Equipo 1': match.team1.name,
        'Equipo 2': match.team2.name,
        'Set 1': match.sets[0]?.team1 !== null && match.sets[0]?.team2 !== null ? `${match.sets[0].team1}-${match.sets[0].team2}` : '',
        'Set 2': match.sets[1]?.team1 !== null && match.sets[1]?.team2 !== null ? `${match.sets[1].team1}-${match.sets[1].team2}` : '',
        'Set 3': match.sets[2]?.team1 !== null && match.sets[2]?.team2 !== null ? `${match.sets[2].team1}-${match.sets[2].team2}` : '',
        'Ganador': match.winner?.name || '',
        'Estado': match.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
    XLSX.writeFile(workbook, "resultados_partidos.xlsx");
  };

  const handleExportToPdf = () => {
    if (!categoryName || matches.length === 0 || typeof jspdf === 'undefined') {
        alert("No hay partidos para exportar o la librería de exportación no está disponible.");
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = 0;

    const addHeader = () => {
        doc.setFillColor('#1a202c'); // background
        doc.rect(0, 0, pageW, pageH, 'F');

        doc.setTextColor('#EDF2F7'); // text-primary
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('ROL DE PARTIDOS', pageW / 2, 22, { align: 'center' });

        doc.setTextColor('#a0aec0'); // text-secondary
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(`Categoría: ${categoryName}`, pageW / 2, 30, { align: 'center' });
        
        currentY = 45;
    };

    const addFooter = (pageNumber: number) => {
        doc.setFontSize(8);
        doc.setTextColor('#a0aec0');
        doc.text(`Página ${pageNumber}`, pageW - margin, pageH - 8, { align: 'right' });
        doc.text('Generado por Gestor de Torneos de Frontón', pageW / 2, pageH - 8, { align: 'center' });
    };

    addHeader();
    let pageCount = 1;

    const sortedMatches = [...matches].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    let lastDate: string | null = null;

    sortedMatches.forEach((match, index) => {
        const matchCardHeight = 25;
        const dateHeaderHeight = (match.date && match.date !== lastDate) ? 12 : 0;
        
        if (currentY + matchCardHeight + dateHeaderHeight > pageH - margin) {
            addFooter(pageCount);
            doc.addPage();
            pageCount++;
            addHeader();
            lastDate = null; // Reset date for new page header
        }
        
        // Draw date header if it's a new date
        if (match.date && match.date !== lastDate) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#00F5A0'); // primary color
            doc.text(new Date(match.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), margin, currentY);
            currentY += 10;
            lastDate = match.date;
        }

        // Draw match card
        const cardY = currentY;
        const teamBoxWidth = 70;
        const teamBoxHeight = 10;
        const vsWidth = 10;
        const contentWidth = teamBoxWidth * 2 + vsWidth;
        const startX = (pageW - contentWidth) / 2;
        
        // Team 1
        doc.setFillColor('#2d3748'); // surface
        doc.setDrawColor('#4a5568'); // border
        doc.roundedRect(startX, cardY, teamBoxWidth, teamBoxHeight, 2, 2, 'FD');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#EDF2F7');
        doc.text(match.team1.name, startX + teamBoxWidth / 2, cardY + teamBoxHeight / 2 + 2, { align: 'center' });

        // VS
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#a0aec0');
        doc.text('VS', startX + teamBoxWidth + vsWidth / 2, cardY + teamBoxHeight / 2 + 2, { align: 'center' });
        
        // Team 2
        doc.roundedRect(startX + teamBoxWidth + vsWidth, cardY, teamBoxWidth, teamBoxHeight, 2, 2, 'FD');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#EDF2F7');
        doc.text(match.team2.name, startX + teamBoxWidth + vsWidth + teamBoxWidth / 2, cardY + teamBoxHeight / 2 + 2, { align: 'center' });
        
        // Status
        const statusText = match.status === 'Finished' ? 'Finalizado' : 'Pendiente';
        const statusColor = match.status === 'Finished' ? '#00F5A0' : '#f59e0b'; // primary-green or amber-500
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(statusColor);
        doc.text(statusText, pageW - margin, cardY + teamBoxHeight / 2 + 2, { align: 'right' });
        
        currentY += matchCardHeight;
    });

    addFooter(pageCount);

    doc.save(`rol_partidos_${categoryName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            const matchMap = new Map<string, Match>();
            matches.forEach(m => matchMap.set(`${m.team1.name}|${m.team2.name}`, m));
            
            let updatedCount = 0;
            json.forEach(row => {
                const team1Name = row['Equipo 1'];
                const team2Name = row['Equipo 2'];
                if (!team1Name || !team2Name) return;

                const match = matchMap.get(`${team1Name}|${team2Name}`);
                if (!match) {
                    console.warn(`Partido no encontrado: ${team1Name} vs ${team2Name}`);
                    return;
                }

                const newSets: MatchSet[] = JSON.parse(JSON.stringify(match.sets));
                for (let i = 1; i <= 3; i++) {
                    const setStr = row[`Set ${i}`];
                    if (typeof setStr === 'string' && setStr.includes('-')) {
                        const [s1, s2] = setStr.split('-').map(s => parseInt(s.trim(), 10));
                        if (!isNaN(s1) && !isNaN(s2)) {
                            newSets[i - 1] = { team1: s1, team2: s2 };
                        }
                    } else if (setStr === '' || setStr === undefined || setStr === null) {
                         newSets[i - 1] = { team1: null, team2: null };
                    }
                }
                
                let newDate = match.date;
                if (row['Fecha'] instanceof Date) {
                    const dateObj: Date = row['Fecha'];
                    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
                    newDate = dateObj.toISOString().split('T')[0];
                }

                onUpdateMatch(match.id, { date: newDate, sets: newSets });
                updatedCount++;
            });

            alert(`${updatedCount} partidos actualizados exitosamente.`);

        } catch (error) {
            console.error("Error al importar el archivo:", error);
            alert("Hubo un error al procesar el archivo. Asegúrate de que el formato sea correcto.");
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };
  
  const headerActions = (
    <>
        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".xlsx, .xls" className="hidden" />
        <button
            onClick={() => fileInputRef.current?.click()}
            className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors"
            aria-label="Importar desde Excel"
            title="Importar desde Excel"
        >
            <ImportIcon className="w-5 h-5" />
        </button>
        <button
            onClick={handleExport}
            disabled={matches.length === 0}
            className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exportar a Excel (XLSX)"
            title="Exportar a Excel (XLSX)"
        >
            <ExportIcon className="w-5 h-5" />
        </button>
        <button
            onClick={handleExportToPdf}
            disabled={matches.length === 0}
            className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exportar a PDF"
            title="Exportar a PDF"
        >
            <PdfIcon className="w-5 h-5" />
        </button>
    </>
  );

  const filteredMatches = matches.filter(match => {
    const statusMatch = filterStatus === 'all' || match.status === filterStatus;
    const teamMatch = filterTeamId === 'all' || match.team1.id === filterTeamId || match.team2.id === filterTeamId;
    return statusMatch && teamMatch;
  });

  return (
    <Card 
        title="Partidos" 
        icon={<ListIcon />}
        headerActions={headerActions}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
    >
      {matches.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-text-secondary mb-4">Elige el formato del calendario de partidos.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onGenerateMatches(false)}
              disabled={teams.length < 2}
              className="bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              Generar Partidos (Solo Ida)
            </button>
             <button
              onClick={() => onGenerateMatches(true)}
              disabled={teams.length < 2}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              Generar Partidos (Ida y Vuelta)
            </button>
          </div>
          {teams.length < 2 && <p className="text-xs text-text-secondary mt-4">Necesitas al menos 2 equipos en la categoría para generar el calendario.</p>}
        </div>
      ) : (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4 border-b border-border pb-4">
                <div className="flex gap-2" role="group" aria-label="Filtrar por estado">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            filterStatus === 'all'
                                ? 'bg-primary text-background'
                                : 'bg-surface hover:bg-gray-600 text-text-secondary'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterStatus(MatchStatus.Pending)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            filterStatus === MatchStatus.Pending
                                ? 'bg-yellow-500 text-background'
                                : 'bg-surface hover:bg-gray-600 text-text-secondary'
                        }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilterStatus(MatchStatus.Finished)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            filterStatus === MatchStatus.Finished
                                ? 'bg-green-500 text-white'
                                : 'bg-surface hover:bg-gray-600 text-text-secondary'
                        }`}
                    >
                        Finalizados
                    </button>
                </div>
                 <div className="w-full sm:w-48">
                    <label htmlFor="team-filter" className="sr-only">Filtrar por equipo</label>
                    <select
                        id="team-filter"
                        value={filterTeamId}
                        onChange={(e) => setFilterTeamId(e.target.value)}
                        className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
                    >
                        <option value="all">Todos los equipos</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            {filteredMatches.length > 0 ? (
              <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                {filteredMatches.map((match) => (
                  <MatchCard key={match.id} match={match} players={players} onUpdateMatch={onUpdateMatch} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-text-secondary">No se encontraron partidos para el filtro seleccionado.</p>
              </div>
            )}
        </div>
      )}
    </Card>
  );
};