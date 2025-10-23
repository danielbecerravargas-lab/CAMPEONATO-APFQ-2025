import React, { useState, useMemo, useRef } from 'react';
import { Team, Category, CategoryImportPayload } from '../types';
import { TrashIcon, PencilIcon, ExportIcon, ImportIcon, RefreshIcon } from './icons';
import { ConfirmationDialog } from './ConfirmationDialog';

// Make sure XLSX is globally available from the script tag
declare const XLSX: any;

interface CategoryManagerProps {
  teams: Team[];
  categories: Category[];
  activeCategoryId: string | null;
  onAddCategory: (name: string, teamIds: string[]) => void;
  onUpdateCategory: (id: string, name: string, teamIds: string[]) => void;
  onDeleteCategory: (id:string) => void;
  onSelectCategory: (id: string | null) => void;
  onImportCategories: (payload: CategoryImportPayload[]) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  teams,
  categories,
  activeCategoryId,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSelectCategory,
  onImportCategories,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [importedCategories, setImportedCategories] = useState<CategoryImportPayload[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingCategoryId !== null;

  const availableTeams = useMemo(() => {
    const assignedTeamIds = new Set(categories.flatMap(c => c.teamIds));
    const editingCategory = categories.find(c => c.id === editingCategoryId);

    return teams.filter(t => {
        if (!assignedTeamIds.has(t.id)) return true;
        if (isEditing && editingCategory?.teamIds.includes(t.id)) return true;
        return false;
    });
  }, [teams, categories, editingCategoryId, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() === '') return;

    if (isEditing) {
        onUpdateCategory(editingCategoryId, newCategoryName, selectedTeamIds);
    } else {
        onAddCategory(newCategoryName, selectedTeamIds);
    }
    
    setNewCategoryName('');
    setSelectedTeamIds([]);
    setEditingCategoryId(null);
  };
  
  const handleEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name);
    setSelectedTeamIds(category.teamIds);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setNewCategoryName('');
    setSelectedTeamIds([]);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
        onDeleteCategory(categoryToDelete.id);
    }
    setCategoryToDelete(null);
  };

  const handleTeamSelection = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleExport = () => {
    const dataToExport = categories.map(c => ({
      name: c.name,
      equipos: c.teamIds.map(tid => teams.find(t => t.id === tid)?.name || '').join(', ')
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categorías");
    XLSX.writeFile(workbook, "categorias.xlsx");
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
        const json = XLSX.utils.sheet_to_json(worksheet) as { name?: string; equipos?: string }[];

        const categoriesData = json
          .filter(row => row.name && row.name.trim())
          .map(row => {
            const teamNames = row.equipos ? row.equipos.split(',').map(name => name.trim()).filter(Boolean) : [];
            return { name: row.name!.trim(), teamNames };
          });
        
        setImportedCategories(categoriesData);
    };
    reader.readAsBinaryString(file);
    event.target.value = ''; // Reset file input
  };

  const handleConfirmImport = () => {
    if (!importedCategories) return;
    onImportCategories(importedCategories);
    resetImportState();
  };

  const resetImportState = () => {
    setImportedCategories(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  return (
    <>
    <ConfirmationDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación de Categoría"
    >
        <p>¿Estás seguro de que quieres eliminar la categoría <strong>{categoryToDelete?.name}</strong>?</p>
        <p className="text-sm text-yellow-400 mt-2">Se eliminarán todos los partidos asociados a esta categoría.</p>
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
          disabled={categories.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <ExportIcon className="w-5 h-5" />
          <span>Exportar</span>
        </button>
      </div>

      {importedCategories && (
        <div className="mb-4 p-4 border border-border rounded-lg bg-background">
          <h3 className="font-bold text-primary mb-2">Confirmar Importación</h3>
           <p className="text-sm text-text-secondary mb-3">Se importarán/actualizarán {importedCategories.length} categorías.</p>
          <div className="flex gap-2">
            <button
                onClick={handleConfirmImport}
                className="w-full flex items-center justify-center gap-2 bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark"
            >
                <RefreshIcon className="w-5 h-5" />
                <span>Actualizar</span>
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
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nombre de la categoría"
          className="w-full bg-gray-900 border border-border rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="mb-2">
          <p className="text-sm text-text-secondary mb-1">Selecciona equipos (opcional):</p>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {availableTeams.map(team => (
              <label key={team.id} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${selectedTeamIds.includes(team.id) ? 'bg-primary text-background' : 'bg-gray-900 hover:bg-gray-800'}`}>
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={() => handleTeamSelection(team.id)}
                  className="form-checkbox h-4 w-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium">{team.name}</span>
              </label>
            ))}
          </div>
          {availableTeams.length === 0 && <p className="text-xs text-text-secondary mt-1">No hay equipos disponibles.</p>}
        </div>
         <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="flex-grow w-full bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Actualizar Categoría' : 'Crear Categoría'}
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
        <h3 className="text-text-primary font-semibold mb-2">Categorías Existentes</h3>
         {categories.length > 0 ? (
          <ul className="space-y-2">
            {categories.map((category) => {
              const isSelected = activeCategoryId === category.id;
              const categoryTeams = teams.filter(team => category.teamIds.includes(team.id));

              return (
               <div
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${isSelected ? 'border-primary bg-surface shadow-lg' : 'border-border bg-background hover:border-gray-600'}`}
              >
                <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-text-primary">{category.name}</p>
                      <p className="text-sm text-text-secondary">{category.teamIds.length} equipos</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(category); }}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-700 transition-colors"
                          aria-label={`Editar categoría ${category.name}`}
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCategoryToDelete(category); }}
                          className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-gray-700 transition-colors"
                          aria-label={`Eliminar categoría ${category.name}`}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <h4 className="text-sm font-semibold text-text-secondary mb-2">Equipos en esta categoría:</h4>
                    {categoryTeams.length > 0 ? (
                      <ul className="space-y-1 pl-2">
                        {categoryTeams.map(team => (
                          <li key={team.id} className="text-sm text-text-primary list-disc list-inside">
                            {team.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-text-secondary pl-2">No hay equipos asignados.</p>
                    )}
                  </div>
                )}
              </div>
            )})}
          </ul>
         ) : (
          <p className="text-center text-text-secondary py-4">Crea una categoría para empezar.</p>
         )}
      </div>
    </div>
    </>
  );
};