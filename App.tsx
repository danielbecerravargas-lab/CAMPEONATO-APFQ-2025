import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ManagementPanel } from './components/ManagementPanel';
import { MatchScheduler } from './components/MatchScheduler';
import { StandingsTable } from './components/StandingsTable';
import { TournamentSummary } from './components/TournamentSummary';
import { PlayerProfile } from './components/PlayerProfile';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { Player, Team, Category, Match, MatchStatus, TeamImportPayload, CategoryImportPayload } from './types';
import { generateRoundRobinMatches, calculateStandings } from './utils/tournamentUtils';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, SaveIcon, DocumentPlusIcon, DocumentArrowUpIcon } from './components/icons';

// Make FileSaver.js `saveAs` function available
declare const saveAs: any;

// A custom hook for state persistence in localStorage
function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const persistedValue = localStorage.getItem(key);
      return persistedValue ? JSON.parse(persistedValue) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error writing to localStorage for key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

const App: React.FC = () => {
    const [players, setPlayers] = usePersistentState<Player[]>('players', []);
    const [teams, setTeams] = usePersistentState<Team[]>('teams', []);
    const [categories, setCategories] = usePersistentState<Category[]>('categories', []);
    const [matches, setMatches] = usePersistentState<Match[]>('matches', []);
    const [activeCategoryId, setActiveCategoryId] = usePersistentState<string | null>('activeCategoryId', null);
    
    const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
    const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null);
    const [isPanelCollapsed, setIsPanelCollapsed] = usePersistentState<boolean>('isPanelCollapsed', false);
    const [isNewChampionshipConfirmOpen, setIsNewChampionshipConfirmOpen] = useState(false);
    
    const [isLoadConfirmOpen, setIsLoadConfirmOpen] = useState(false);
    const [pendingChampionshipData, setPendingChampionshipData] = useState<string | null>(null);
    const loadFileInputRef = useRef<HTMLInputElement>(null);

    // Derived state
    const activeCategory = useMemo(() => categories.find(c => c.id === activeCategoryId) || null, [categories, activeCategoryId]);
    const activeCategoryTeams = useMemo(() => {
        if (!activeCategory) return [];
        return teams.filter(t => activeCategory.teamIds.includes(t.id));
    }, [teams, activeCategory]);
    
    const activeCategoryMatches = useMemo(() => {
        if (!activeCategory) return [];
        return matches.filter(m => m.categoryId === activeCategory.id);
    }, [matches, activeCategory]);

    const standings = useMemo(() => {
        if (!activeCategory || activeCategoryTeams.length === 0) return [];
        return calculateStandings(activeCategoryTeams, activeCategoryMatches);
    }, [activeCategory, activeCategoryTeams, activeCategoryMatches]);

    const viewingPlayer = useMemo(() => {
        if (!viewingPlayerId) return null;
        return players.find(p => p.id === viewingPlayerId) || null;
    }, [players, viewingPlayerId]);

    const viewingPlayerTeams = useMemo(() => {
        if (!viewingPlayer) return [];
        return teams.filter(t => t.playerIds.includes(viewingPlayer.id));
    }, [teams, viewingPlayer]);

    const viewingPlayerMatches = useMemo(() => {
        if (!viewingPlayer) return [];
        const playerTeamIds = new Set(viewingPlayerTeams.map(t => t.id));
        return matches.filter(m => playerTeamIds.has(m.team1.id) || playerTeamIds.has(m.team2.id));
    }, [matches, viewingPlayer, viewingPlayerTeams]);


    // Handlers
    const handleAddPlayer = (playerData: Omit<Player, 'id'>) => {
        const newPlayer: Player = { id: `player-${Date.now()}`, ...playerData };
        setPlayers(prev => [...prev, newPlayer]);
    };

    const handleUpdatePlayer = (id: string, playerData: Omit<Player, 'id'>) => {
        setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...playerData } : p));
    };

    const handleDeletePlayer = (id: string) => {
        // Also remove from any team
        setTeams(prevTeams => prevTeams.map(team => ({
            ...team,
            playerIds: team.playerIds.filter(pid => pid !== id)
        })));
        setPlayers(prev => prev.filter(p => p.id !== id));
    };

    const handleImportPlayers = (playersToImport: Omit<Player, 'id'>[]) => {
        const newPlayers: Player[] = playersToImport.map(playerData => ({
            id: `player-${Date.now()}-${Math.random()}`,
            ...playerData,
        }));
        setPlayers(prev => [...prev, ...newPlayers]);
    };

    const handleAddTeam = (name: string, playerIds: string[]) => {
        const newTeam: Team = { id: `team-${Date.now()}`, name, playerIds };
        setTeams(prev => [...prev, newTeam]);
    };

    const handleUpdateTeam = (id: string, name: string, playerIds: string[]) => {
        setTeams(prev => prev.map(t => t.id === id ? { ...t, name, playerIds } : t));
    };

    const handleDeleteTeam = (id: string) => {
        // Also remove from any category
        setCategories(prev => prev.map(cat => ({
            ...cat,
            teamIds: cat.teamIds.filter(tid => tid !== id)
        })));
        // Delete associated matches
        setMatches(prev => prev.filter(m => m.team1.id !== id && m.team2.id !== id));
        setTeams(prev => prev.filter(t => t.id !== id));
    };

    const handleAddCategory = (name: string, teamIds: string[]) => {
        const newCategory: Category = { id: `category-${Date.now()}`, name, teamIds };
        setCategories(prev => [...prev, newCategory]);
    };

    const handleUpdateCategory = (id: string, name: string, teamIds: string[]) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name, teamIds } : c));
    };

    const handleDeleteCategory = (id: string) => {
        if (activeCategoryId === id) {
            setActiveCategoryId(null);
        }
        // Delete associated matches
        setMatches(prev => prev.filter(m => m.categoryId !== id));
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    const handleGenerateMatches = (twoLegged: boolean) => {
        if (!activeCategory) return;
        const newMatches = generateRoundRobinMatches(activeCategoryTeams, activeCategory, twoLegged);
        // Remove old matches for this category and add new ones
        setMatches(prev => [
            ...prev.filter(m => m.categoryId !== activeCategory.id),
            ...newMatches
        ]);
    };

    const handleUpdateMatch = (matchId: string, newMatchData: Partial<Pick<Match, 'sets' | 'date'>>) => {
        setMatches(prevMatches => prevMatches.map(match => {
            if (match.id !== matchId) return match;

            const updatedMatch = { ...match, ...newMatchData };

            // Determine winner
            let team1SetWins = 0;
            let team2SetWins = 0;
            
            updatedMatch.sets.forEach(set => {
                if (set.team1 !== null && set.team2 !== null) {
                    if (set.team1 > set.team2) team1SetWins++;
                    if (set.team2 > set.team1) team2SetWins++;
                }
            });

            if (team1SetWins >= 2) {
                updatedMatch.winner = updatedMatch.team1;
            } else if (team2SetWins >= 2) {
                updatedMatch.winner = updatedMatch.team2;
            } else {
                updatedMatch.winner = null;
            }

            if (updatedMatch.winner) {
                updatedMatch.status = MatchStatus.Finished;
            } else {
                updatedMatch.status = MatchStatus.Pending;
            }
            
            // Clean up third set if match is decided in two
            if (team1SetWins === 2 || team2SetWins === 2) {
                const thirdSet = updatedMatch.sets[2];
                if (thirdSet && thirdSet.team1 === null && thirdSet.team2 === null) {
                    // No need to do anything if it was already empty
                }
            }
            
            return updatedMatch;
        }));
    };

    const handleSelectCategory = (id: string | null) => {
        setActiveCategoryId(id);
    };
    
    const handleViewPlayerProfile = (id: string) => {
        setViewingPlayerId(id);
    };

    const handleBackToMainView = () => {
        setViewingPlayerId(null);
    };

    const handleImportTeams = (payload: TeamImportPayload) => {
        const { importedTeams: teamsToImport, playersToCreate } = payload;
        
        // 1. Create new players
        const newPlayers: Player[] = playersToCreate.map(fullName => {
            const [firstName, ...lastNameParts] = fullName.split(' ');
            return {
                id: `player-${Date.now()}-${Math.random()}`,
                firstName,
                lastName: lastNameParts.join(' ') || '',
                idCard: '',
                birthDate: '',
            };
        });
        const updatedPlayers = [...players, ...newPlayers];
        setPlayers(updatedPlayers);
        
        // 2. Map player names to IDs
        const playerMap = new Map<string, string>();
        updatedPlayers.forEach(p => playerMap.set(`${p.firstName} ${p.lastName}`.toLowerCase(), p.id));
        
        // 3. Create/update teams
        const updatedTeams = [...teams];
        const teamMap: Map<string, Team> = new Map();
        teams.forEach(t => teamMap.set(t.name.toLowerCase(), t));
        
        teamsToImport.forEach(importedTeam => {
            const playerIds = importedTeam.playerNames
                .map(name => playerMap.get(name.toLowerCase()))
                .filter((id): id is string => !!id);
                
            const existingTeam = teamMap.get(importedTeam.name.toLowerCase());
            if (existingTeam) {
                const updatedTeam = {...existingTeam, name: importedTeam.name, playerIds};
                 const index = updatedTeams.findIndex(t => t.id === existingTeam.id);
                 updatedTeams[index] = updatedTeam;

            } else {
                // Create new team
                const newTeam: Team = {
                    id: `team-${Date.now()}-${Math.random()}`,
                    name: importedTeam.name,
                    playerIds,
                };
                updatedTeams.push(newTeam);
            }
        });

        setTeams(updatedTeams);
    };

    const handleImportCategories = (payload: CategoryImportPayload[]) => {
        const teamMap = new Map<string, string>(teams.map(t => [t.name.toLowerCase(), t.id]));
        
        const updatedCategories = [...categories];
        const categoryMap: Map<string, Category> = new Map();
        categories.forEach(c => categoryMap.set(c.name.toLowerCase(), c));

        payload.forEach(importedCategory => {
            const teamIds = importedCategory.teamNames
                .map(name => teamMap.get(name.toLowerCase()))
                .filter((id): id is string => !!id);

            const existingCategory = categoryMap.get(importedCategory.name.toLowerCase());
            if (existingCategory) {
                 const updatedCategory = {...existingCategory, name: importedCategory.name, teamIds};
                 const index = updatedCategories.findIndex(c => c.id === existingCategory.id);
                 updatedCategories[index] = updatedCategory;
            } else {
                // Create new category
                const newCategory: Category = {
                    id: `category-${Date.now()}-${Math.random()}`,
                    name: importedCategory.name,
                    teamIds,
                };
                updatedCategories.push(newCategory);
            }
        });
        
        setCategories(updatedCategories);
    };
    
    const handleSaveChampionship = () => {
        const tournamentData = {
            players,
            teams,
            categories,
            matches,
            activeCategoryId,
            isPanelCollapsed,
            version: '1.0.0', // For future compatibility
            savedAt: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(tournamentData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        saveAs(blob, `championship_backup_${new Date().toISOString().split('T')[0]}.json`);
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                setPendingChampionshipData(text);
                setIsLoadConfirmOpen(true);
            }
        };
        reader.onerror = () => {
            alert('Error al leer el archivo.');
            if (loadFileInputRef.current) {
                loadFileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const confirmLoadChampionship = () => {
        if (!pendingChampionshipData) return;

        try {
            const data = JSON.parse(pendingChampionshipData);

            if (
                !data ||
                !Array.isArray(data.players) ||
                !Array.isArray(data.teams) ||
                !Array.isArray(data.categories) ||
                !Array.isArray(data.matches)
            ) {
                throw new Error("El archivo no tiene un formato válido.");
            }

            setPlayers(data.players);
            setTeams(data.teams);
            setCategories(data.categories);
            setMatches(data.matches);
            setActiveCategoryId(data.activeCategoryId || null);
            setIsPanelCollapsed(data.isPanelCollapsed || false);
            setViewingPlayerId(null);
            setMaximizedWidget(null);
        } catch (error) {
            console.error("Error al cargar el campeonato:", error);
            alert(`Error al cargar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`);
        } finally {
            cancelLoadChampionship();
        }
    };
    
    const cancelLoadChampionship = () => {
        setIsLoadConfirmOpen(false);
        setPendingChampionshipData(null);
        if (loadFileInputRef.current) {
            loadFileInputRef.current.value = '';
        }
    };

    const confirmNewChampionship = () => {
        setPlayers([]);
        setTeams([]);
        setCategories([]);
        setMatches([]);
        setActiveCategoryId(null);
        setViewingPlayerId(null);
        setMaximizedWidget(null);
        setIsNewChampionshipConfirmOpen(false);
    };

    const toggleMaximize = (widgetName: string) => {
        setMaximizedWidget(prev => prev === widgetName ? null : widgetName);
    };

    const renderMaximizedWidget = () => {
        const commonProps = { isMaximized: true };
        switch (maximizedWidget) {
            case 'management':
                return <ManagementPanel {...{...commonProps, ...managementPanelProps}} onToggleMaximize={() => toggleMaximize('management')} />;
            case 'scheduler':
                return <MatchScheduler {...{...commonProps, ...matchSchedulerProps}} onToggleMaximize={() => toggleMaximize('scheduler')} />;
            case 'standings':
                return <StandingsTable {...{...commonProps, ...standingsTableProps}} onToggleMaximize={() => toggleMaximize('standings')} />;
            case 'summary':
                return <TournamentSummary {...{...commonProps, ...tournamentSummaryProps}} onToggleMaximize={() => toggleMaximize('summary')} />;
            default:
                return null;
        }
    };

    const managementPanelProps = {
        players, teams, categories, activeCategoryId,
        onAddPlayer: handleAddPlayer, onUpdatePlayer: handleUpdatePlayer, onDeletePlayer: handleDeletePlayer,
        onImportPlayers: handleImportPlayers,
        onAddTeam: handleAddTeam, onUpdateTeam: handleUpdateTeam, onDeleteTeam: handleDeleteTeam,
        onAddCategory: handleAddCategory, onUpdateCategory: handleUpdateCategory, onDeleteCategory: handleDeleteCategory,
        onSelectCategory: handleSelectCategory,
        onImportTeams: handleImportTeams, onImportCategories: handleImportCategories,
        onViewPlayerProfile: handleViewPlayerProfile,
    };
    const matchSchedulerProps = {
        matches: activeCategoryMatches, teams: activeCategoryTeams, players, categoryName: activeCategory?.name,
        onGenerateMatches: handleGenerateMatches, onUpdateMatch: handleUpdateMatch,
    };
    const standingsTableProps = { standings, categoryName: activeCategory?.name };
    const tournamentSummaryProps = { standings, matches: activeCategoryMatches, categoryName: activeCategory?.name || '' };

    return (
        <div className="bg-background text-text-primary min-h-screen p-4 sm:p-6 lg:p-8">
            <ConfirmationDialog
                isOpen={isNewChampionshipConfirmOpen}
                onClose={() => setIsNewChampionshipConfirmOpen(false)}
                onConfirm={confirmNewChampionship}
                title="Crear Nuevo Campeonato"
                confirmButtonText="Sí, Crear Nuevo"
                confirmButtonClass="bg-primary text-background hover:bg-primary-dark focus:ring-primary-dark"
            >
                <p>¿Estás seguro de que quieres empezar un nuevo campeonato?</p>
                <p className="text-sm text-yellow-400 mt-2">Todos los datos actuales (jugadores, equipos, categorías y partidos) se borrarán permanentemente. Esta acción no se puede deshacer.</p>
            </ConfirmationDialog>
            <ConfirmationDialog
                isOpen={isLoadConfirmOpen}
                onClose={cancelLoadChampionship}
                onConfirm={confirmLoadChampionship}
                title="Cargar Campeonato"
                confirmButtonText="Sí, Cargar"
                confirmButtonClass="bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400"
            >
                <p>¿Estás seguro de que quieres cargar este archivo de campeonato?</p>
                <p className="text-sm text-yellow-400 mt-2">Todos los datos actuales se sobrescribirán con el contenido del archivo. Esta acción no se puede deshacer.</p>
            </ConfirmationDialog>
            
            <header className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl font-extrabold text-primary tracking-tight">
                        Gestor de Torneos de Frontón
                    </h1>
                    <p className="text-text-secondary mt-2">
                        Organiza y sigue tus competiciones de pelota a mano con facilidad.
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                     <button
                        onClick={handleSaveChampionship}
                        className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-500 transition-colors"
                        title="Guardar todos los datos del campeonato en un archivo"
                    >
                        <SaveIcon className="w-5 h-5" />
                        <span>Guardar</span>
                    </button>
                    <button
                        onClick={() => loadFileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-yellow-600 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-500 transition-colors"
                        title="Cargar campeonato desde un archivo"
                    >
                        <DocumentArrowUpIcon className="w-5 h-5" />
                        <span>Cargar</span>
                    </button>
                    <button
                        onClick={() => setIsNewChampionshipConfirmOpen(true)}
                        className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 transition-colors"
                        title="Empezar un nuevo campeonato desde cero"
                    >
                        <DocumentPlusIcon className="w-5 h-5" />
                        <span>Nuevo</span>
                    </button>
                    <input
                        type="file"
                        ref={loadFileInputRef}
                        onChange={handleFileSelected}
                        accept=".json"
                        className="hidden"
                    />
                </div>
            </header>

            {viewingPlayer ? (
                <div className="h-[calc(100vh-165px)]">
                    <PlayerProfile 
                        player={viewingPlayer}
                        teams={viewingPlayerTeams}
                        matches={viewingPlayerMatches}
                        onBack={handleBackToMainView}
                    />
                </div>
            ) : (
                <div className="relative">
                    <button
                        onClick={() => setIsPanelCollapsed(p => !p)}
                        className={`
                            absolute top-1/2 -translate-y-1/2 z-30 bg-surface border-2 border-primary
                            p-1 rounded-full text-primary hover:bg-primary hover:text-background
                            transition-all duration-300 transform
                            ${isPanelCollapsed ? 'left-2' : 'left-1/3 -translate-x-1/2'}
                            hidden lg:block
                        `}
                        aria-label={isPanelCollapsed ? "Expandir menú" : "Contraer menú"}
                    >
                        {isPanelCollapsed ? <ChevronDoubleRightIcon className="w-6 h-6" /> : <ChevronDoubleLeftIcon className="w-6 h-6" />}
                    </button>

                    <main className={`grid grid-cols-1 ${!isPanelCollapsed ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 h-[calc(100vh-165px)]`}>
                        {maximizedWidget ? (
                            <div className={`${!isPanelCollapsed ? 'lg:col-span-3' : 'lg:col-span-2'} h-full`}>
                                {renderMaximizedWidget()}
                            </div>
                        ) : (
                            <>
                                {!isPanelCollapsed && (
                                    <div className="lg:col-span-1 h-full">
                                        <ManagementPanel {...managementPanelProps} onToggleMaximize={() => toggleMaximize('management')} />
                                    </div>
                                )}
                                {activeCategory ? (
                                    <>
                                        <div className="lg:col-span-1 h-full">
                                           <MatchScheduler {...matchSchedulerProps} onToggleMaximize={() => toggleMaximize('scheduler')} />
                                        </div>
                                        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                                            <div className="flex-1 min-h-0">
                                                <StandingsTable {...standingsTableProps} onToggleMaximize={() => toggleMaximize('standings')} />
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                <TournamentSummary {...tournamentSummaryProps} onToggleMaximize={() => toggleMaximize('summary')} />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="lg:col-span-2 flex items-center justify-center bg-surface rounded-xl shadow-lg p-8">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold text-text-primary mb-2">Bienvenido</h2>
                                            <p className="text-text-secondary">
                                                Selecciona una categoría del panel de gestión para ver sus detalles, o crea una nueva para empezar.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
};

export default App;