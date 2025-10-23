
import { GoogleGenAI } from "@google/genai";
import { Player, Match, Standings, Team, MatchSet } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const formatSets = (sets: MatchSet[]): string => {
    return sets
        .filter(set => set.team1 !== null && set.team2 !== null)
        .map(set => `(${set.team1}-${set.team2})`)
        .join(' ');
};

export async function generateSummary(standings: Standings[], matches: Match[], categoryName: string): Promise<string> {
    if (standings.length === 0) {
        return "No hay datos del torneo para generar un resumen.";
    }

    try {
        const finishedMatches = matches.filter(m => m.status === 'Finished');
        
        const standingsText = standings.map((s, index) => 
            `${index + 1}. ${s.team.name}: ${s.points} puntos (Ganados: ${s.wins}, Perdidos: ${s.losses})`
        ).join('\n');

        const matchesText = finishedMatches.map(m => 
            `${m.team1.name} vs ${m.team2.name} - Sets: ${formatSets(m.sets)}`
        ).join('\n');

        const prompt = `
        Eres un comentarista deportivo entusiasta especializado en frontón (pelota a mano).
        A continuación se presentan las clasificaciones actuales y los resultados de los partidos de un torneo de frontón en la categoría "${categoryName}".
        Escribe un resumen emocionante y atractivo del torneo hasta ahora. 
        Destaca al equipo líder, menciona cualquier partido reñido o sorprendente y genera expectación para los próximos partidos.
        El tono debe ser enérgico y periodístico. Usa un máximo de 150 palabras.

        Clasificaciones de la categoría "${categoryName}":
        ${standingsText}

        Resultados de Partidos Finalizados:
        ${matchesText}

        Resumen del Torneo:
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text;
    } catch (error) {
        console.error("Error generating summary:", error);
        return "No se pudo generar el resumen del torneo. Por favor, inténtelo de nuevo.";
    }
}