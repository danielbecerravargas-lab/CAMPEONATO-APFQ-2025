import React, { useState } from 'react';
import { Player, Team, Category, TeamImportPayload, CategoryImportPayload } from '../types';
import { PlayerManager } from './PlayerManager';
import { TeamManager } from './TeamManager';
import { CategoryManager } from './CategoryManager';
import { Card } from './Card';
import { UsersIcon, TagIcon, ListIcon } from './icons';

interface ManagementPanelProps {
  players: Player[];
  teams: Team[];
  categories: Category[];
  activeCategoryId: string | null;
  onAddPlayer: (playerData: Omit<Player, 'id'>) => void;
  onUpdatePlayer: (id: string, playerData: Omit<Player, 'id'>) => void;
  onDeletePlayer: (id: string) => void;
  onImportPlayers: (players: Omit<Player, 'id'>[]) => void;
  onAddTeam: (name: string, playerIds: string[]) => void;
  onUpdateTeam: (id: string, name: string, playerIds: string[]) => void;
  onDeleteTeam: (id: string) => void;
  onAddCategory: (name: string, teamIds: string[]) => void;
  onUpdateCategory: (id: string, name: string, teamIds: string[]) => void;
  onDeleteCategory: (id: string) => void;
  onSelectCategory: (id: string | null) => void;
  onImportTeams: (payload: TeamImportPayload) => void;
  // FIX: Changed type to accept an array of CategoryImportPayload to match the expected prop type in CategoryManager and the implementation in App.tsx.
  onImportCategories: (payload: CategoryImportPayload[]) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

type Tab = 'players' | 'teams' | 'categories';

export const ManagementPanel: React.FC<ManagementPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<Tab>('categories');

  const tabs: { id: Tab, label: string, icon: React.ReactNode }[] = [
    { id: 'categories', label: 'Categorías', icon: <TagIcon className="w-5 h-5" /> },
    { id: 'teams', label: 'Equipos', icon: <ListIcon className="w-5 h-5" /> },
    { id: 'players', label: 'Jugadores', icon: <UsersIcon className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'players':
        return <PlayerManager 
            players={props.players} 
            onAddPlayer={props.onAddPlayer}
            onUpdatePlayer={props.onUpdatePlayer}
            onDeletePlayer={props.onDeletePlayer}
            onImportPlayers={props.onImportPlayers}
        />;
      case 'teams':
        return <TeamManager 
            players={props.players}
            teams={props.teams}
            onAddTeam={props.onAddTeam}
            onUpdateTeam={props.onUpdateTeam}
            onDeleteTeam={props.onDeleteTeam}
            onImportTeams={props.onImportTeams}
        />;
      case 'categories':
        return <CategoryManager
            teams={props.teams}
            categories={props.categories}
            activeCategoryId={props.activeCategoryId}
            onAddCategory={props.onAddCategory}
            onUpdateCategory={props.onUpdateCategory}
            onDeleteCategory={props.onDeleteCategory}
            onSelectCategory={props.onSelectCategory}
            onImportCategories={props.onImportCategories}
        />
      default:
        return null;
    }
  };

  const activeTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <Card 
      title={activeTabInfo?.label || ''} 
      icon={activeTabInfo?.icon || <></>}
      isMaximized={props.isMaximized}
      onToggleMaximize={props.onToggleMaximize}
    >
      <div className="flex flex-col h-full">
        <div className="border-b border-border mb-4">
          <nav className="flex space-x-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500'}
                  flex items-center gap-2 whitespace-nowrap py-2 px-3 font-medium text-sm border-b-2 transition-colors
                `}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-grow overflow-hidden">
            {renderContent()}
        </div>
      </div>
    </Card>
  );
};