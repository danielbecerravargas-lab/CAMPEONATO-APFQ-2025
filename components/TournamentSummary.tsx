import React, { useState } from 'react';
import { Standings, Match } from '../types';
import { generateSummary } from '../services/geminiService';
import { Card } from './Card';
import { ReportIcon, SparklesIcon } from './icons';

interface TournamentSummaryProps {
  standings: Standings[];
  matches: Match[];
  categoryName: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const TournamentSummary: React.FC<TournamentSummaryProps> = ({ standings, matches, categoryName, isMaximized, onToggleMaximize }) => {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasFinishedMatches = matches.some(m => m.status === 'Finished');

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    const result = await generateSummary(standings, matches, categoryName);
    setSummary(result);
    setIsLoading(false);
  };

  return (
    <Card 
        title="Resumen del Torneo (IA)" 
        icon={<ReportIcon />}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
    >
      <div className="flex flex-col h-full">
        <div className="flex-grow mb-4 overflow-y-auto max-h-48 pr-2">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <p className="text-text-secondary whitespace-pre-wrap">
                    {summary || "Haz clic en el botón para generar un resumen del torneo con IA. Se analizarán las clasificaciones y los resultados de los partidos."}
                </p>
            )}
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={isLoading || !hasFinishedMatches}
          className="w-full mt-auto flex items-center justify-center gap-2 bg-primary text-background font-bold py-2 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generando...' : 'Generar Resumen'}
          {!isLoading && <SparklesIcon className="w-5 h-5 text-background" />}
        </button>
        {!hasFinishedMatches && <p className="text-xs text-text-secondary text-center mt-2">Necesitas al menos un partido finalizado.</p>}
      </div>
    </Card>
  );
};