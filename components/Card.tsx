import React from 'react';
import { MaximizeIcon, MinimizeIcon } from './icons';

interface CardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    isMaximized?: boolean;
    onToggleMaximize?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, headerActions, isMaximized, onToggleMaximize }) => {
    return (
        <div className="bg-surface rounded-xl shadow-lg w-full h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-3">
                    <div className="text-primary">{icon}</div>
                    <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                </div>
                <div className="flex items-center gap-2">
                    {headerActions}
                    {onToggleMaximize && (
                        <button 
                            onClick={onToggleMaximize} 
                            className="text-text-secondary hover:text-primary p-1 rounded-full transition-colors"
                            aria-label={isMaximized ? 'Minimizar' : 'Maximizar'}
                        >
                            {isMaximized ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
            <div className="p-4 flex-grow overflow-y-auto">
                {children}
            </div>
        </div>
    );
};