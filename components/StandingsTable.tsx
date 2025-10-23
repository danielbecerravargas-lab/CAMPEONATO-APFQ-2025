import React from 'react';
import { Standings } from '../types';
import { Card } from './Card';
import { TrophyIcon, PdfIcon, ExportIcon } from './icons';

// Make sure jspdf and XLSX are globally available
declare const jspdf: any;
declare const XLSX: any;


interface StandingsTableProps {
  standings: Standings[];
  categoryName?: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings, categoryName, isMaximized, onToggleMaximize }) => {
  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-300';
    if (rank === 2) return 'text-yellow-600';
    return 'text-text-secondary';
  }

  const handleExportToExcel = () => {
    if (standings.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const dataToExport = standings.map((s, index) => ({
      '#': index + 1,
      'Equipo': s.team.name,
      'PJ': s.played,
      'G': s.wins,
      'P': s.losses,
      'PF': s.pointsFor,
      'PC': s.pointsAgainst,
      'DIF': s.pointsDifference,
      'Ptos': s.points,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clasificación");
    XLSX.writeFile(workbook, `clasificacion_${(categoryName || 'torneo').replace(/\s+/g, '_').toLowerCase()}.xlsx`);
  };

  const handleExportToPdf = () => {
    if (standings.length === 0 || typeof jspdf === 'undefined') {
      alert("No hay datos para exportar o la librería de exportación no está disponible.");
      return;
    }
    
    // This assumes jspdf-autotable has been loaded and attached itself to the jsPDF instance
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    const title = `Tabla de Clasificación - ${categoryName || 'General'}`;
    doc.text(title, 14, 15);

    const head = [['#', 'Equipo', 'PJ', 'G', 'P', 'PF', 'PC', 'DIF', 'Ptos']];
    const body = standings.map((s, index) => [
      index + 1,
      s.team.name,
      s.played,
      s.wins,
      s.losses,
      s.pointsFor,
      s.pointsAgainst,
      s.pointsDifference > 0 ? `+${s.pointsDifference}` : s.pointsDifference,
      s.points,
    ]);

    (doc as any).autoTable({
      startY: 20,
      head: head,
      body: body,
      headStyles: { fillColor: [209, 213, 219], textColor: [49, 49, 49], fontStyle: 'bold' },
      styles: { halign: 'center' },
      columnStyles: {
        1: { halign: 'left' } // Align team name to the left
      }
    });

    doc.save(`clasificacion_${(categoryName || 'torneo').replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };
  
  const headerActions = (
    <>
        <button
            onClick={handleExportToExcel}
            disabled={standings.length === 0}
            className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exportar a Excel"
            title="Exportar a Excel"
        >
            <ExportIcon className="w-5 h-5" />
        </button>
        <button
            onClick={handleExportToPdf}
            disabled={standings.length === 0}
            className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exportar a PDF"
            title="Exportar a PDF"
        >
            <PdfIcon className="w-5 h-5" />
        </button>
    </>
  );

  return (
    <Card 
        title="Clasificación" 
        icon={<TrophyIcon />}
        headerActions={headerActions}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-text-secondary uppercase">
            <tr>
              <th className="py-2 px-3 text-center">#</th>
              <th className="py-2 px-3">Equipo</th>
              <th className="py-2 px-3 text-center">PJ</th>
              <th className="py-2 px-3 text-center">G</th>
              <th className="py-2 px-3 text-center">P</th>
              <th className="py-2 px-3 text-center" title="Puntos a Favor">PF</th>
              <th className="py-2 px-3 text-center" title="Puntos en Contra">PC</th>
              <th className="py-2 px-3 text-center" title="Diferencia de Puntos">DIF</th>
              <th className="py-2 px-3 text-center">Ptos</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, index) => (
              <tr key={s.team.id} className="border-b border-border last:border-b-0">
                <td className={`py-3 px-3 text-center font-bold ${getRankColor(index)}`}>{index + 1}</td>
                <td className="py-3 px-3">
                    <div className="font-medium text-text-primary">{s.team.name}</div>
                </td>
                <td className="py-3 px-3 text-center text-text-primary">{s.played}</td>
                <td className="py-3 px-3 text-center text-green-400">{s.wins}</td>
                <td className="py-3 px-3 text-center text-red-400">{s.losses}</td>
                <td className="py-3 px-3 text-center text-text-primary">{s.pointsFor}</td>
                <td className="py-3 px-3 text-center text-text-primary">{s.pointsAgainst}</td>
                 <td className={`py-3 px-3 text-center font-bold ${s.pointsDifference > 0 ? 'text-green-400' : s.pointsDifference < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
                    {s.pointsDifference > 0 ? `+${s.pointsDifference}` : s.pointsDifference}
                </td>
                <td className="py-3 px-3 text-center font-bold text-primary">{s.points}</td>
              </tr>
            ))}
             {standings.length === 0 && (
                <tr>
                    <td colSpan={9} className="text-center py-8 text-text-secondary">
                        No hay datos de clasificación todavía.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};