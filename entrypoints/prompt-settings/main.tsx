import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as icons from 'lucide-react';
import { getPrompts, savePrompts } from '../utils/prompts';
import { DEFAULT_PROMPTS, type Prompt } from '../utils/constants';
import '../popup/style.css'; // Re-use some styles

const iconNames = Object.keys(icons).filter(key => key !== 'createReactComponent' && key !== 'LucideIcon');

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
            icon: 'Wand',
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
        <div className="container">
            <header>
                <h1>Manage Prompts</h1>
                <p>Create, edit, and reorder your custom prompts.</p>
            </header>
            
            <div className="prompt-list">
                {prompts.map((prompt, index) => (
                    <div key={prompt.id} className="prompt-item">
                        <div className="prompt-order">
                            <button onClick={() => handleMove(index, 'up')} disabled={index === 0}>▲</button>
                            <span>{index + 1}</span>
                            <button onClick={() => handleMove(index, 'down')} disabled={index === prompts.length - 1}>▼</button>
                        </div>
                        <div className="prompt-details">
                            <input 
                                type="text" 
                                value={prompt.name}
                                placeholder="Prompt Name (e.g. Make it formal)"
                                onChange={(e) => handleUpdate(prompt.id, 'name', e.target.value)}
                            />
                            <textarea 
                                value={prompt.value}
                                placeholder="Prompt Value (the full instruction for the AI)"
                                onChange={(e) => handleUpdate(prompt.id, 'value', e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div className="prompt-actions">
                            <select value={prompt.icon} onChange={(e) => handleUpdate(prompt.id, 'icon', e.target.value)}>
                                {iconNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <button onClick={() => handleDelete(prompt.id)} className="delete-btn">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="page-actions">
                <button onClick={handleAddNew}>Add New Prompt</button>
                <div className="main-actions">
                    {status && <span className="save-feedback">{status}</span>}
                    <button onClick={handleRestoreDefaults}>Restore Defaults</button>
                    <button onClick={handleSave} className="primary-btn">Save All</button>
                </div>
            </div>
            <style>{`
                body { font-family: sans-serif; background-color: #f3f4f6; color: #111827; }
                .container { max-width: 800px; margin: 2rem auto; padding: 1rem; }
                header { margin-bottom: 2rem; text-align: center; }
                .prompt-list { display: flex; flex-direction: column; gap: 1rem; }
                .prompt-item { display: flex; align-items: center; gap: 1rem; background-color: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .prompt-order { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
                .prompt-order button { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; }
                .prompt-details { flex-grow: 1; display: flex; flex-direction: column; gap: 0.5rem; }
                .prompt-details input, .prompt-details textarea, .prompt-actions select { width: 100%; padding: 8px; font-size: 0.9rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; }
                .prompt-actions { display: flex; flex-direction: column; gap: 0.5rem; }
                .delete-btn { background-color: #ef4444; color: white; border: none; padding: 8px; border-radius: 0.375rem; cursor: pointer; }
                .page-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
                .main-actions { display: flex; align-items: center; gap: 1rem; }
                .primary-btn { background-color: #111827; color: white; }
                .save-feedback { color: #22c55e; }
            `}</style>
        </div>
    );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<PromptSettingsPage />);