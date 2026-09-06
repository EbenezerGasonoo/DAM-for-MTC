'use client';

import { useState, useRef, useMemo } from 'react';

interface SearchFilterProps {
    onSearch: (filters: SearchFilters) => void;
    onSaveSearch?: (name: string, filters: SearchFilters) => void;
}

export interface SearchFilters {
    search?: string;
    type?: string;
    status?: string;
    projectId?: string;
    creatorId?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
}

const typeOptions = [
    { value: 'image', label: 'Images', icon: '🖼️' },
    { value: 'video', label: 'Videos', icon: '🎬' },
    { value: 'audio', label: 'Audio', icon: '🎵' },
    { value: 'document', label: 'Documents', icon: '📄' },
];

const statusOptions = [
    { value: 'DRAFT', label: 'Draft', color: 'var(--text-muted)' },
    { value: 'EDITING', label: 'Editing', color: 'var(--warning-color)' },
    { value: 'REVIEW', label: 'In Review', color: 'var(--accent-color)' },
    { value: 'APPROVED', label: 'Approved', color: 'var(--success-color)' },
    { value: 'PUBLISHED', label: 'Published', color: '#06b6d4' },
];

export function SearchFilter({ onSearch, onSaveSearch }: SearchFilterProps) {
    const [filters, setFilters] = useState<SearchFilters>({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saveSearchName, setSaveSearchName] = useState('');
    const [suggestionPanelOpen, setSuggestionPanelOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Mock search suggestions - in real app, this would come from API
    const mockSuggestions = useMemo(
        () =>
            [
                'sermon',
                'youth',
                'podcast',
                'social',
                'worship',
                'promo',
                'branding',
                'events',
            ] as const,
        []
    );

    const searchSuggestionsFiltered = useMemo(() => {
        if (!filters.search || filters.search.length <= 1) return [];
        return mockSuggestions
            .filter(s => s.toLowerCase().includes(filters.search!.toLowerCase()))
            .slice(0, 5);
    }, [filters.search, mockSuggestions]);

    const showSuggestionPanel =
        suggestionPanelOpen && searchSuggestionsFiltered.length > 0;

    const handleFilterChange = (key: string, value: unknown) => {
        const newFilters = { ...filters, [key]: value || undefined };
        setFilters(newFilters);
        onSearch(newFilters);
    };

    const handleClearFilters = () => {
        setFilters({});
        onSearch({});
        setShowAdvanced(false);
        setSuggestionPanelOpen(false);
    };

    const handleSaveSearch = async () => {
        if (!saveSearchName.trim() || !onSaveSearch) return;
        onSaveSearch(saveSearchName, filters);
        setSaveSearchName('');
    };

    const handleSuggestionClick = (suggestion: string) => {
        const currentSearch = filters.search || '';
        const newSearch = currentSearch ? `${currentSearch} ${suggestion}` : suggestion;
        handleFilterChange('search', newSearch);
        setSuggestionPanelOpen(false);
        searchInputRef.current?.focus();
    };

    const removeTag = (tagToRemove: string) => {
        const newTags = filters.tags?.filter(tag => tag !== tagToRemove) || [];
        handleFilterChange('tags', newTags.length > 0 ? newTags : undefined);
    };

    const addTag = (tag: string) => {
        if (!tag.trim()) return;
        const newTags = [...(filters.tags || []), tag.trim()];
        handleFilterChange('tags', newTags);
    };

    const activeFiltersCount = Object.values(filters).filter(v =>
        v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
    ).length;

    return (
        <div className="search-filter-container">
            {/* Main Search Bar */}
            <div className="search-main-bar">
                <div className="search-input-wrapper">
                    <div className="search-icon">🔍</div>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search assets, tags, or descriptions..."
                        value={filters.search || ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            handleFilterChange('search', v);
                            setSuggestionPanelOpen(v.length > 1);
                        }}
                        className="search-input"
                        onFocus={() => {
                            const s = filters.search || '';
                            if (s.length > 1) setSuggestionPanelOpen(true);
                        }}
                        onBlur={() => setTimeout(() => setSuggestionPanelOpen(false), 200)}
                    />
                    {filters.search && (
                        <button
                            onClick={() => {
                                handleFilterChange('search', '');
                                setSuggestionPanelOpen(false);
                            }}
                            className="search-clear-btn"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="search-actions">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`filter-toggle-btn ${showAdvanced ? 'active' : ''}`}
                    >
                        <span className="filter-icon">⚙️</span>
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="filter-count">{activeFiltersCount}</span>
                        )}
                    </button>

                    {activeFiltersCount > 0 && (
                        <button
                            onClick={handleClearFilters}
                            className="clear-filters-btn"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Search Suggestions */}
            {showSuggestionPanel && (
                <div className="search-suggestions">
                    {searchSuggestionsFiltered.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="suggestion-item"
                        >
                            <span className="suggestion-icon">🏷️</span>
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Active Filter Tags */}
            {filters.tags && filters.tags.length > 0 && (
                <div className="active-tags">
                    {filters.tags.map((tag, index) => (
                        <span key={index} className="tag-chip">
                            <span className="tag-icon">🏷️</span>
                            {tag}
                            <button
                                onClick={() => removeTag(tag)}
                                className="tag-remove"
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Advanced Filters Panel */}
            {showAdvanced && (
                <div className="advanced-filters-panel">
                    <div className="filters-grid">
                        {/* Type Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Asset Type</label>
                            <div className="type-options">
                                {typeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleFilterChange('type', filters.type === option.value ? undefined : option.value)}
                                        className={`type-option ${filters.type === option.value ? 'active' : ''}`}
                                    >
                                        <span className="type-icon">{option.icon}</span>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Status</label>
                            <div className="status-options">
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleFilterChange('status', filters.status === option.value ? undefined : option.value)}
                                        className={`status-option ${filters.status === option.value ? 'active' : ''}`}
                                        style={{ '--status-color': option.color } as React.CSSProperties}
                                    >
                                        <span className="status-dot" style={{ backgroundColor: option.color }}></span>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="filter-group">
                            <label className="filter-label">Date Range</label>
                            <div className="date-range">
                                <input
                                    type="date"
                                    placeholder="From"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    className="date-input"
                                />
                                <span className="date-separator">to</span>
                                <input
                                    type="date"
                                    placeholder="To"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    className="date-input"
                                />
                            </div>
                        </div>

                        {/* Add Tag */}
                        <div className="filter-group">
                            <label className="filter-label">Add Tags</label>
                            <div className="tag-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Type and press Enter to add tags"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addTag((e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }}
                                    className="tag-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Search */}
                    {activeFiltersCount > 0 && onSaveSearch && (
                        <div className="save-search-section">
                            <div className="save-search-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Save this search as..."
                                    value={saveSearchName}
                                    onChange={(e) => setSaveSearchName(e.target.value)}
                                    className="save-search-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                                />
                                <button
                                    onClick={handleSaveSearch}
                                    disabled={!saveSearchName.trim()}
                                    className="save-search-btn"
                                >
                                    💾 Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .search-filter-container {
                    background: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .search-main-bar {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .search-input-wrapper {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-icon {
                    position: absolute;
                    left: 14px;
                    font-size: 16px;
                    color: var(--text-muted);
                    z-index: 1;
                }

                .search-input {
                    width: 100%;
                    padding: 12px 14px 12px 44px;
                    background: var(--bg-color);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 16px;
                    transition: all 0.2s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 3px var(--accent-light);
                }

                .search-clear-btn {
                    position: absolute;
                    right: 14px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: var(--radius-sm);
                    transition: all 0.2s ease;
                }

                .search-clear-btn:hover {
                    background: var(--panel-hover);
                    color: var(--text-main);
                }

                .search-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .filter-toggle-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: var(--panel-hover);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .filter-toggle-btn:hover {
                    background: var(--accent-light);
                    border-color: var(--accent-color);
                }

                .filter-toggle-btn.active {
                    background: var(--accent-light);
                    border-color: var(--accent-color);
                    color: var(--accent-color);
                }

                .filter-count {
                    background: var(--accent-color);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .clear-filters-btn {
                    padding: 10px 16px;
                    background: var(--danger-color);
                    border: none;
                    border-radius: var(--radius-md);
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .clear-filters-btn:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                }

                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    max-height: 200px;
                    overflow-y: auto;
                    margin-top: 4px;
                }

                .suggestion-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 10px 14px;
                    background: none;
                    border: none;
                    color: var(--text-main);
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .suggestion-item:hover {
                    background: var(--panel-hover);
                }

                .suggestion-icon {
                    font-size: 14px;
                }

                .active-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .tag-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: var(--accent-light);
                    border: 1px solid var(--accent-color);
                    border-radius: var(--radius-md);
                    color: var(--accent-color);
                    font-size: 14px;
                }

                .tag-icon {
                    font-size: 12px;
                }

                .tag-remove {
                    background: none;
                    border: none;
                    color: var(--accent-color);
                    cursor: pointer;
                    padding: 2px;
                    border-radius: var(--radius-sm);
                    transition: all 0.2s ease;
                }

                .tag-remove:hover {
                    background: rgba(139, 92, 246, 0.2);
                }

                .advanced-filters-panel {
                    border-top: 1px solid var(--border-color);
                    padding-top: 20px;
                    animation: slideDown 0.3s ease;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .filters-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                    margin-bottom: 24px;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .filter-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-main);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .type-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .type-option {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: var(--panel-hover);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .type-option:hover {
                    background: var(--accent-light);
                    border-color: var(--accent-color);
                }

                .type-option.active {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                    color: white;
                }

                .type-icon {
                    font-size: 16px;
                }

                .status-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .status-option {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: var(--panel-hover);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .status-option:hover {
                    background: var(--panel-hover);
                    border-color: var(--status-color);
                }

                .status-option.active {
                    background: var(--status-color);
                    border-color: var(--status-color);
                    color: white;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .date-range {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .date-input {
                    flex: 1;
                    padding: 8px 12px;
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 14px;
                }

                .date-input:focus {
                    outline: none;
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 2px var(--accent-light);
                }

                .date-separator {
                    color: var(--text-muted);
                    font-size: 14px;
                }

                .tag-input-wrapper {
                    position: relative;
                }

                .tag-input {
                    width: 100%;
                    padding: 8px 12px;
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 14px;
                }

                .tag-input:focus {
                    outline: none;
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 2px var(--accent-light);
                }

                .save-search-section {
                    border-top: 1px solid var(--border-color);
                    padding-top: 16px;
                }

                .save-search-input-wrapper {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .save-search-input {
                    flex: 1;
                    padding: 10px 14px;
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-main);
                    font-size: 14px;
                }

                .save-search-input:focus {
                    outline: none;
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 2px var(--accent-light);
                }

                .save-search-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 16px;
                    background: var(--accent-color);
                    border: none;
                    border-radius: var(--radius-md);
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .save-search-btn:hover:not(:disabled) {
                    background: var(--accent-hover);
                    transform: translateY(-1px);
                }

                .save-search-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 768px) {
                    .search-main-bar {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }

                    .search-actions {
                        justify-content: center;
                    }

                    .filters-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }
            `}</style>
        </div>
    );
}
