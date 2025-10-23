import React, { useState, useRef, useMemo } from 'react';
import { Player } from '../types';
import { TrashIcon, PlusIcon, PencilIcon, ExportIcon, ImportIcon, RefreshIcon } from './icons';
import { ConfirmationDialog } from './ConfirmationDialog';

// Make sure XLSX is globally available from the script tag
declare const XLSX: any;

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (playerData: Omit<Player, 'id'>) => void;
  onUpdatePlayer: (id: string, playerData: Omit<Player, 'id'>) => void;
  onDeletePlayer: (id: string) => void;
  onImportPlayers: (players: Omit<Player, 'id'>[]) => void;
}

const initialFormState = {
  firstName: '',
  lastName: '',
  idCard: '',
  birthDate: '',
  photoUrl: '',
};

const calculateAge = (birthDateString: string): string => {
    if (!birthDateString) return 'N/A';
    try {
        const birthDate = new Date(birthDateString);
        // Adjust for timezone issues if the date is parsed as UTC
        birthDate.setMinutes(birthDate.getMinutes() + birthDate.getTimezoneOffset());
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? `${age} años` : 'Fecha inválida';
    } catch (error) {
        return 'N/A';
    }
};


export const PlayerManager: React.FC<PlayerManagerProps> = ({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer, onImportPlayers }) => {
  const [newPlayerData, setNewPlayerData] = useState(initialFormState);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [importReview, setImportReview] = useState<{ newPlayers: Omit<Player, 'id'>[], duplicatePlayers: any[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingPlayerId !== null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlayerData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              setNewPlayerData(prev => ({...prev, photoUrl: event.target?.result as string}));
          };
          reader.readAsDataURL(file);
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(newPlayerData).some(value => typeof value === 'string' && value.trim() === '' && value !== newPlayerData.photoUrl)) return;

    if (isEditing) {
      onUpdatePlayer(editingPlayerId, newPlayerData);
    } else {
      onAddPlayer(newPlayerData);
    }
    
    setNewPlayerData(initialFormState);
    setEditingPlayerId(null);
  };
  
  const handleEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setNewPlayerData({
      firstName: player.firstName,
      lastName: player.lastName,
      idCard: player.idCard,
      birthDate: player.birthDate,
      photoUrl: player.photoUrl || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setNewPlayerData(initialFormState);
  };

  const handleConfirmDelete = () => {
    if (playerToDelete) {
        onDeletePlayer(playerToDelete.id);
    }
    setPlayerToDelete(null);
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(players.map(p => ({
      'Nombre Completo': `${p.firstName} ${p.lastName}`,
      'Carnet de Identidad': p.idCard,
      'Fecha de Nacimiento': p.birthDate,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jugadores");
    XLSX.writeFile(workbook, "jugadores.xlsx");
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

            const existingPlayerNames = new Set(players.map(p => `${p.firstName} ${p.lastName}`.toLowerCase().trim()));
            const newPlayers: Omit<Player, 'id'>[] = [];
            const duplicatePlayers: any[] = [];

            json.forEach(row => {
                const fullName = row['Nombre Completo'] || row['nombre completo'];
                const birthDateRaw = row['Fecha de Nacimiento'] || row['fecha de nacimiento'];
                
                if (typeof fullName !== 'string' || !fullName.trim()) return;

                const nameTrimmed = fullName.trim();
                const nameParts = nameTrimmed.split(' ');
                const firstName = nameParts.shift() || '';
                const lastName = nameParts.join(' ');
                
                const playerRecord: Omit<Player, 'id'> = {
                    firstName,
                    lastName,
                    birthDate: '',
                    idCard: row['Carnet de Identidad'] || row['carnet de identidad'] || '',
                };

                if (birthDateRaw instanceof Date) {
                    const date = birthDateRaw;
                    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                    playerRecord.birthDate = date.toISOString().split('T')[0];
                }
                
                const finalName = `${playerRecord.firstName} ${playerRecord.lastName}`.trim().toLowerCase();

                if (existingPlayerNames.has(finalName)) {
                    duplicatePlayers.push({ ...row, reason: "Ya existe en el sistema" });
                } else if (newPlayers.some(p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === finalName)) {
                    duplicatePlayers.push({ ...row, reason: "Duplicado en el archivo" });
                } else {
                    newPlayers.push(playerRecord);
                }
            });

            setImportReview({ newPlayers, duplicatePlayers });

        } catch (error) {
            console.error("Error processing Excel file:", error);
            alert("Error al procesar el archivo. Asegúrate de que las columnas 'Nombre Completo' y 'Fecha de Nacimiento' existan.");
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleConfirmImport = () => {
      if (importReview) {
          onImportPlayers(importReview.newPlayers);
      }
      resetImportState();
  };

  const resetImportState = () => {
      setImportReview(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };


  const isFormValid = newPlayerData.firstName.trim() !== '' && newPlayerData.lastName.trim() !== '' && newPlayerData.idCard.trim() !== '' && newPlayerData.birthDate.trim() !== '';

  const filteredPlayers = useMemo(() =>
    players.filter(player => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return fullName.includes(searchLower) || player.idCard.includes(searchLower);
    }), [players, searchTerm]);

  return (
    <>
      <ConfirmationDialog
          isOpen={!!playerToDelete}
          onClose={() => setPlayerToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmar Eliminación de Jugador"
      >
          <p>¿Estás seguro de que quieres eliminar al jugador <strong>{playerToDelete?.firstName} {playerToDelete?.lastName}</strong>?</p>
          <p className="text-sm text-yellow-400 mt-2">Esta acción no se puede deshacer y también lo eliminará de cualquier equipo al que pertenezca.</p>
      </ConfirmationDialog>

      {importReview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={resetImportState}
        >
            <div 
              className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-text-primary mb-4">Revisar Importación de Jugadores</h2>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-primary mb-2">
                            {importReview.newPlayers.length} Jugadores Nuevos para Importar
                        </h3>
                        {importReview.newPlayers.length > 0 ? (
                            <ul className="space-y-1 text-sm list-disc list-inside text-text-primary">
                                {importReview.newPlayers.map((p, i) => <li key={i}>{p.firstName} {p.lastName}</li>)}
                            </ul>
                        ) : (
                            <p className="text-sm text-text-secondary">No se encontraron nuevos jugadores para importar.</p>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                            {importReview.duplicatePlayers.length} Jugadores Omitidos
                        </h3>
                        {importReview.duplicatePlayers.length > 0 ? (
                            <ul className="space-y-1 text-sm list-disc list-inside text-text-secondary">
                                {importReview.duplicatePlayers.map((p, i) => (
                                    <li key={i}>
                                        {p['Nombre Completo'] || 'Nombre no especificado'} - <span className="italic">({p.reason})</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-text-secondary">No se encontraron jugadores duplicados.</p>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={resetImportState}
                        className="px-4 py-2 bg-gray-600 text-text-primary font-semibold rounded-md hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmImport}
                        disabled={importReview.newPlayers.length === 0}
                        className="px-4 py-2 bg-primary text-background font-semibold rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary-dark disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <RefreshIcon className="w-5 h-5" />
                        Confirmar Importación
                    </button>
                </div>
            </div>
        </div>
      )}

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
            disabled={players.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            <ExportIcon className="w-5 h-5" />
            <span>Exportar</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4 border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" name="firstName" value={newPlayerData.firstName} onChange={handleInputChange} placeholder="Nombre" className="bg-gray-900 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" required />
                      <input type="text" name="lastName" value={newPlayerData.lastName} onChange={handleInputChange} placeholder="Apellido" className="bg-gray-900 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" required />
                      <input type="text" name="idCard" value={newPlayerData.idCard} onChange={handleInputChange} placeholder="Carnet de Identidad" className="bg-gray-900 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" required />
                      <input type="date" name="birthDate" value={newPlayerData.birthDate} onChange={handleInputChange} placeholder="Fecha de Nacimiento" className="bg-gray-900 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-text-secondary" required />
                  </div>
              </div>
              <div className="flex-shrink-0 w-full sm:w-28 flex flex-col items-center gap-2">
                  <div className="w-24 h-24 bg-gray-900 border border-border rounded-full flex items-center justify-center overflow-hidden">
                      {newPlayerData.photoUrl ? (
                          <img src={newPlayerData.photoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-text-secondary text-sm">Foto</span>
                      )}
                  </div>
                  <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="text-xs text-primary hover:underline">
                      {isEditing ? 'Cambiar' : 'Subir foto'}
                  </button>
              </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!isFormValid}
              className="flex-grow flex items-center justify-center gap-2 bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Actualizar Jugador' : 'Añadir Jugador'}
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

        <div className="mb-2">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, apellido o CI..."
                className="w-full bg-gray-900 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {filteredPlayers.length > 0 ? (
            <ul className="space-y-2">
              {filteredPlayers.map((player) => (
                <li key={player.id} className="flex justify-between items-center bg-background p-3 rounded-md border border-border">
                  <div className="flex items-center gap-3">
                      {player.photoUrl ? (
                          <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                          <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-primary font-bold text-lg">
                              {player.firstName[0]?.toUpperCase()}{player.lastName[0]?.toUpperCase()}
                          </div>
                      )}
                      <div>
                          <p className="font-semibold text-text-primary">{player.firstName} {player.lastName}</p>
                          <p className="text-sm text-text-secondary">C.I: {player.idCard} &bull; {calculateAge(player.birthDate)}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(player)}
                        className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label={`Editar a ${player.firstName} ${player.lastName}`}
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setPlayerToDelete(player)}
                        className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label={`Eliminar a ${player.firstName} ${player.lastName}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
             <p className="text-center text-text-secondary py-4">
                {players.length > 0 ? "No se encontraron jugadores." : "Añade jugadores para empezar."}
            </p>
          )}
        </div>
      </div>
    </>
  );
};