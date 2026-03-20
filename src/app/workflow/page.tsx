'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface KanbanCard {
    id: string;
    title: string;
    type: string;
    assignee: string;
    dueDate: string;
}

const initialColumns: Record<string, { label: string; color: string; cards: KanbanCard[] }> = {
    DRAFT: {
        label: 'Draft',
        color: 'var(--text-muted)',
        cards: [
            { id: '1', title: 'Easter Sunday Recap Video', type: 'video', assignee: 'John D.', dueDate: 'Mar 25' },
            { id: '2', title: 'Youth Camp Save-The-Date', type: 'image', assignee: 'Sarah K.', dueDate: 'Mar 28' },
        ],
    },
    EDITING: {
        label: 'Editing',
        color: 'var(--warning-color)',
        cards: [
            { id: '3', title: 'Sunday Service Mar 16', type: 'video', assignee: 'Mike J.', dueDate: 'Mar 20' },
            { id: '4', title: 'Podcast Ep43 Audio Mix', type: 'audio', assignee: 'Lisa C.', dueDate: 'Mar 22' },
            { id: '5', title: 'TikTok Easter Reel', type: 'video', assignee: 'Sarah K.', dueDate: 'Mar 23' },
        ],
    },
    REVIEW: {
        label: 'Review',
        color: 'var(--accent-color)',
        cards: [
            { id: '6', title: 'Youth Retreat Banner', type: 'image', assignee: 'Sarah K.', dueDate: 'Mar 18' },
            { id: '7', title: 'Podcast Ep42 Final', type: 'audio', assignee: 'Lisa C.', dueDate: 'Mar 19' },
        ],
    },
    APPROVED: {
        label: 'Approved',
        color: 'var(--success-color)',
        cards: [
            { id: '8', title: 'Sunday Service Mar 9', type: 'video', assignee: 'John D.', dueDate: 'Mar 14' },
        ],
    },
    PUBLISHED: {
        label: 'Published',
        color: '#06b6d4',
        cards: [
            { id: '9', title: 'Instagram Story Pack', type: 'image', assignee: 'Sarah K.', dueDate: 'Mar 10' },
            { id: '10', title: 'Sunday Service Mar 2', type: 'video', assignee: 'Mike J.', dueDate: 'Mar 7' },
        ],
    },
};

const typeIcons: Record<string, string> = { video: '🎬', image: '🖼️', audio: '🎵', document: '📄' };

export default function WorkflowPage() {
    const [columns] = useState(initialColumns);
    const [draggedCard, setDraggedCard] = useState<string | null>(null);

    return (
        <Sidebar>
            <Header title="Workflow" subtitle="Production pipeline — drag assets through stages" />

            <div className="content-area" style={{ maxWidth: '100%', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: 'calc(100vh - 160px)' }}>
                    {Object.entries(columns).map(([key, column]) => (
                        <div
                            key={key}
                            style={{
                                minWidth: '280px',
                                width: '280px',
                                backgroundColor: 'var(--panel-bg)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                flexShrink: 0,
                            }}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            {/* Column Header */}
                            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: column.color }}></div>
                                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{column.label}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-color)', padding: '2px 8px', borderRadius: '10px' }}>
                                    {column.cards.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                                {column.cards.map((card) => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={() => setDraggedCard(card.id)}
                                        onDragEnd={() => setDraggedCard(null)}
                                        style={{
                                            padding: '14px',
                                            backgroundColor: draggedCard === card.id ? 'var(--accent-light)' : 'var(--bg-color)',
                                            border: `1px solid ${draggedCard === card.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'grab',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1rem' }}>{typeIcons[card.type] || '📄'}</span>
                                            <span style={{ fontWeight: 500, fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            <span>🧑 {card.assignee}</span>
                                            <span>📅 {card.dueDate}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Sidebar>
    );
}
