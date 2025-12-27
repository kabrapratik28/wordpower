import React, { useState, useEffect, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import * as icons from 'lucide-react';
import { getPrompts, savePrompts } from '../utils/prompts';
import { DEFAULT_PROMPTS, type Prompt } from '../utils/constants';
// Removed: import '../popup/style.css'; // Re-use some styles - though mostly using Tailwind here
import './style.css'; // Import local styles, including Tailwind directives

import { IconPicker } from './components/IconPicker'; // New import

// Filter out non-component exports from lucide-react
const availableIconNames = Object.keys(icons).filter(key => 
    typeof (icons as any)[key] === 'function' && key !== 'createReactComponent' && key !== 'LucideIcon'
) as Array<keyof typeof icons>;

function PromptSettingsPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [status, setStatus] = useState('');

    useEffect(() => {
        getPrompts().then(setPrompts);
    }, []);

    const handleSave = () => {
        savePrompts(prompts).then(() => {
            setStatus('Prompts saved successfully!');
            browser.runtime.sendMessage({ type: 'promptsUpdated' });
            setTimeout(() => setStatus(''), 2000);
        });
    };

    const handleRestoreDefaults = () => {
        setPrompts(DEFAULT_PROMPTS);
        setStatus('Default prompts restored. Click Save to confirm.');
    };

    const handleAddNew = () => {
        const newPrompt: Prompt = {
            id: crypto.randomUUID(),
            name: 'New Prompt',
            value: '',
            icon: 'Wand', // Default icon
        };
        setPrompts([...prompts, newPrompt]);
    };

    const handleDelete = (id: string) => {
        setPrompts(prompts.filter(p => p.id !== id));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= prompts.length) return;
        
        const newPrompts = [...prompts];
        const [movedItem] = newPrompts.splice(index, 1);
        newPrompts.splice(newIndex, 0, movedItem);
        setPrompts(newPrompts);
    };

    const handleUpdate = (id: string, field: keyof Prompt, value: string) => {
        setPrompts(prompts.map(p => (p.id === id ? { ...p, [field]: value } : p)));
    };

    return (
        <div className="min-h-screen w-full bg-gray-100 p-6">
            <header className="bg-white shadow p-6 rounded-lg mb-6 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Manage Prompts</h1>
                <p className="text-gray-600">Create, edit, and reorder your custom prompts for quick access in the extension popup.</p>
            </header>
            
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
                <div className="space-y-6 mb-6">
                    {prompts.map((prompt, index) => {
                        const IconComponent = icons[prompt.icon] || icons.Wand;
                        return (
                            <div key={prompt.id} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-gray-200 rounded-lg">
                                <div className="flex flex-col items-center gap-1 text-gray-500 flex-shrink-0">
                                    <button 
                                        onClick={() => handleMove(index, 'up')} 
                                        disabled={index === 0}
                                        className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <icons.ChevronUp size={20} />
                                    </button>
                                    <span className="text-sm font-medium">{index + 1}</span>
                                    <button 
                                        onClick={() => handleMove(index, 'down')} 
                                        disabled={index === prompts.length - 1}
                                        className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <icons.ChevronDown size={20} />
                                    </button>
                                </div>
                                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input 
                                        type="text" 
                                        value={prompt.name}
                                        placeholder="Prompt Name (e.g. Make it formal)"
                                        onChange={(e) => handleUpdate(prompt.id, 'name', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    />
                                    <textarea 
                                        value={prompt.value}
                                        placeholder="Prompt Value (the full instruction for the AI)"
                                        onChange={(e) => handleUpdate(prompt.id, 'value', e.target.value)}
                                        rows={2}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                                <div className="w-full sm:w-auto">
                                    <IconPicker 
                                        value={prompt.icon} 
                                        onChange={(newIcon) => handleUpdate(prompt.id, 'icon', newIcon)} 
                                    />
                                </div>
                                    <button 
                                        onClick={() => handleDelete(prompt.id)} 
                                        className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                                    >
                                        <icons.Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200 gap-4">
                    <button 
                        onClick={handleAddNew} 
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
                    >
                        <icons.Plus size={20} /> Add New Prompt
                    </button>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {status && <span className="text-green-600 text-sm">{status}</span>}
                        <button 
                            onClick={handleRestoreDefaults} 
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                        >
                            Restore Defaults
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                        >
                            <icons.Save size={20} /> Save All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<PromptSettingsPage />);