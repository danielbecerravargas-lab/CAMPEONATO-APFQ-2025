import React, { useState, useMemo, useRef } from 'react';
import { Player, Team, TeamImportPayload } from '../types';
import { TrashIcon, PlusIcon, PencilIcon, ExportIcon, ImportIcon, RefreshIcon } from './icons';
import { ConfirmationDialog } from './ConfirmationDialog';

// Make sure XLSX is globally available from the script tag
declare const XLSX: any;


interface TeamManagerProps {
  players: Player[];
  teams: Team[];
  onAddTeam: (name: string, playerIds: string[]) => void;
  onUpdateTeam: (id: string, name:string, playerIds: string[]) => void;
  onDeleteTeam: (id: string) => void;
  onImportTeams: (payload: TeamImportPayload) => void;
}

export const TeamManager: React.FC<TeamManagerProps> = ({ players, teams, onAddTeam, onUpdateTeam, onDeleteTeam, onImportTeams }) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for the new import flow
  const [importedTeams, setImportedTeams] = useState<{name: string, playerNames: string[]}[] | null>(null);
  const [unmatchedPlayers, setUnmatchedPlayers] = useState<string[]>([]);
  const [unmatchedPlayerActions, setUnmatchedPlayerActions] = useState<{ [key: string]: 'create' | 'skip' }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingTeamId !== null;
  
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    teams.forEach(team => {
        if (team.id !== editingTeamId) {
            team.playerIds.forEach(id => ids.add(id));
        }
    });
    return ids;
  }, [teams, editingTeamId]);

  const availablePlayers = players.filter(p => !assignedPlayerIds.has(p.id));

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeamName.trim() === '') return;
    
    if (isEditing) {
      onUpdateTeam(editingTeamId, newTeamName, selectedPlayerIds);
    } else {
      onAddTeam(newTeamName, selectedPlayerIds);
    }
    
    resetForm();
  };
  
  const handleEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setNewTeamName(team.name);
    setSelectedPlayerIds(team.playerIds);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (teamToDelete) {
        onDeleteTeam(teamToDelete.id);
    }
    setTeamToDelete(null);
  };

  const resetForm = () => {
    setNewTeamName('');
    setSelectedPlayerIds([]);
    setEditingTeamId(null);
  }

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };
  
  const handleExport = () => {
    const dataToExport = teams.map(t => ({
      name: t.name,
      jugadores: t.playerIds.map(pid => {
        const player = players.find(p => p.id === pid);
        return player ? `${player.firstName} ${player.lastName}` : '';
      }).join(', ')
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Equipos");
    XLSX.writeFile(workbook, "equipos.xlsx");
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as { name?: string, jugadores?: string }[];

        const existingPlayerNames = new Set(players.map(p => `${p.firstName} ${p.lastName}`.toLowerCase()));
        const allImportedPlayerNames = new Set<string>();
        
        const teamsData = json
          .filter(row => row.name && row.name.trim())
          .map(row => {
            const playerNames = row.jugadores ? row.jugadores.split(',').map(name => name.trim()).filter(Boolean) : [];
            playerNames.forEach(name => allImportedPlayerNames.add(name));
            return { name: row.name!.trim(), playerNames };
          });

        const newUnmatched: string[] = [];
        allImportedPlayerNames.forEach(name => {
            if (!existingPlayerNames.has(name.toLowerCase())) {
                newUnmatched.push(name);
            }
        });

        setImportedTeams(teamsData);
        setUnmatchedPlayers(newUnmatched);
        setUnmatchedPlayerActions(
          newUnmatched.reduce((acc, name) => ({ ...acc, [name]: 'skip' }), {})
        );
    };
    reader.readAsBinaryString(file);
    event.target.value = ''; // Reset file input
  };

  const handleUnmatchedPlayerAction = (name: string, action: 'create' | 'skip') => {
    setUnmatchedPlayerActions(prev => ({ ...prev, [name]: action }));
  };

  const handleConfirmImport = () => {
    if (!importedTeams) return;
    
    const payload: TeamImportPayload = {
        importedTeams: importedTeams,
        playersToCreate: Object.entries(unmatchedPlayerActions)
            .filter(([, action]) => action === 'create')
            .map(([name]) => name)
    };
    
    onImportTeams(payload);
    resetImportState();
  };

  const resetImportState = () => {
    setImportedTeams(null);
    setUnmatchedPlayers([]);
    setUnmatchedPlayerActions({});
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormValid = newTeamName.trim() !== '';
  const canConfirmImport = importedTeams && Object.keys(unmatchedPlayerActions).length === unmatchedPlayers.length;

  return (
    <>
    <ConfirmationDialog
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación de Equipo"
    >
        <p>¿Estás seguro de que quieres eliminar al equipo <strong>{teamToDelete?.name}</strong>?</p>
        <p className="text-sm text-yellow-400 mt-2">Esta acción eliminará el equipo, sus partidos asociados y lo desvinculará de cualquier categoría.</p>
    </ConfirmationDialog>

    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-4">
        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".xlsx, .xls" className="hidden" />
        <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-500 transition-colors"
        >
            <ImportIcon className="w-5 h-5" />
            <span>Importar</span>
        </button>
        <button
          onClick={handleExport}
          disabled={teams.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <ExportIcon className="w-5 h-5" />
          <span>Exportar</span>
        </button>
      </div>

      {importedTeams && (
        <div className="mb-4 p-4 border border-border rounded-lg bg-background">
          <h3 className="font-bold text-primary mb-2">Confirmar Importación</h3>
          {unmatchedPlayers.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-text-secondary mb-2">Jugadores no encontrados:</h4>
              <div className="space-y-2 max-h-24 overflow-y-auto pr-2">
                {unmatchedPlayers.map(name => (
                  <div key={name} className="flex items-center justify-between text-sm bg-gray-900 p-2 rounded">
                    <span className="truncate">{name}</span>
                    <div className="flex gap-2">
                        <button onClick={() => handleUnmatchedPlayerAction(name, 'create')} className={`px-2 py-1 text-xs rounded ${unmatchedPlayerActions[name] === 'create' ? 'bg-primary text-background' : 'bg-gray-700'}`}>Crear</button>
                        <button onClick={() => handleUnmatchedPlayerAction(name, 'skip')} className={`px-2 py-1 text-xs rounded ${unmatchedPlayerActions[name] === 'skip' ? 'bg-red-500 text-white' : 'bg-gray-700'}`}>Omitir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
                onClick={handleConfirmImport}
                disabled={!canConfirmImport}
                className="w-full flex items-center justify-center gap-2 bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-500 transition-colors"
            >
                <RefreshIcon className="w-5 h-5" />
                <span>Actualizar {importedTeams.length} Equipos</span>
            </button>
            <button onClick={resetImportState} className="bg-gray-600 text-text-primary font-bold py-2 px-4 rounded-md hover:bg-gray-500 transition-colors">
                Cancelar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-4 border-b border-border pb-4">
        <input
          type="text"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Nombre del equipo"
          className="w-full bg-gray-900 border border-border rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="mb-2">
            <p className="text-sm text-text-secondary mb-1">Selecciona jugadores:</p>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {availablePlayers.map(player => (
                    <label key={player.id} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${selectedPlayerIds.includes(player.id) ? 'bg-primary text-background' : 'bg-gray-900 hover:bg-gray-800'}`}>
                        <input
                            type="checkbox"
                            checked={selectedPlayerIds.includes(player.id)}
                            onChange={() => handlePlayerSelection(player.id)}
                            className="form-checkbox h-4 w-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium truncate">{player.firstName} {player.lastName}</span>
                    </label>
                ))}
            </div>
            {availablePlayers.length === 0 && <p className="text-xs text-text-secondary mt-1">No hay jugadores disponibles. Crea jugadores primero.</p>}
        </div>
        <div className="flex gap-2 mt-2">
            <button
                type="submit"
                disabled={!isFormValid}
                className="flex-grow w-full flex items-center justify-center gap-2 bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                {isEditing ? 'Actualizar Equipo' : 'Añadir Equipo'}
                {!isEditing && <PlusIcon className="w-4 h-4" />}
            </button>
            {isEditing && (
                 <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-600 text-text-primary font-bold py-2 px-4 rounded-md hover:bg-gray-500 transition-colors"
                >
                    Cancelar
                </button>
            )}
        </div>
      </form>
      <div className="flex-grow overflow-y-auto pr-2">
         <div className="mb-2">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar equipo por nombre..."
                className="w-full bg-gray-900 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
         </div>
        {teams.length > 0 ? (
          filteredTeams.length > 0 ? (
            <ul className="space-y-2">
              {filteredTeams.map((team) => (
                <li key={team.id} className="flex justify-between items-start bg-background p-3 rounded-md border border-border">
                  <div>
                    <p className="font-semibold text-text-primary">{team.name}</p>
                    <div className="text-xs text-text-secondary mt-1">
                      {team.playerIds.map(pid => {
                          const player = players.find(p => p.id === pid);
                          return player ? `${player.firstName[0]}. ${player.lastName}` : '';
                      }).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(team)}
                      className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-700 transition-colors"
                      aria-label={`Editar ${team.name}`}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTeamToDelete(team)}
                      className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-gray-700 transition-colors"
                      aria-label={`Eliminar ${team.name}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-text-secondary py-4">No se encontraron equipos con ese nombre.</p>
          )
        ) : (
           <p className="text-center text-text-secondary py-4">Añade equipos para empezar.</p>
        )}
      </div>
    </div>
    </>
  );
};