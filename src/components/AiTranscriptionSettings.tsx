'use client';

import React, { useState, useEffect } from 'react';

interface AiSettingsData {
    groqConfigured: boolean;
    groqKeyMasked: string;
    openaiConfigured: boolean;
    openaiKeyMasked: string;
    provider: 'groq' | 'openai' | 'local';
    autoFailover: boolean;
    localWhisperAvailable: boolean;
    localWhisperBinary?: string | null;
    localWhisperModel?: string | null;
}

export default function AiTranscriptionSettings({ isAdmin }: { isAdmin: boolean }) {
    const [settings, setSettings] = useState<AiSettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Form states
    const [groqApiKey, setGroqApiKey] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [provider, setProvider] = useState<'groq' | 'openai' | 'local'>('groq');
    const [autoFailover, setAutoFailover] = useState(true);
    const [showGroqKey, setShowGroqKey] = useState(false);
    const [showOpenAiKey, setShowOpenAiKey] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/ai');
            if (res.ok) {
                const data: AiSettingsData = await res.json();
                setSettings(data);
                setProvider(data.provider || 'groq');
                setAutoFailover(data.autoFailover !== false);
            }
        } catch {
            setFeedback({ type: 'error', message: 'Failed to load AI settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFeedback(null);
        setTestResult(null);

        try {
            const payload: any = { provider, autoFailover };
            if (groqApiKey.trim()) payload.groqApiKey = groqApiKey.trim();
            if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();

            const res = await fetch('/api/settings/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFeedback({ type: 'success', message: 'AI Transcription configuration successfully saved.' });
                setGroqApiKey('');
                setOpenaiApiKey('');
                fetchSettings();
            } else {
                setFeedback({ type: 'error', message: data.error || 'Failed to save configuration.' });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', message: err?.message || 'Network error while saving.' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async (testProvider: 'groq' | 'openai') => {
        setTesting(true);
        setTestResult(null);
        setFeedback(null);

        try {
            const keyToTest = testProvider === 'groq' ? groqApiKey.trim() : openaiApiKey.trim();
            const res = await fetch('/api/settings/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'test',
                    testProvider,
                    testKey: keyToTest || undefined,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setTestResult({
                    success: true,
                    message: `✓ ${data.message} (${data.latencyMs}ms response latency)`,
                });
            } else {
                setTestResult({
                    success: false,
                    message: `✗ Connection test failed: ${data.error || 'Invalid API key or network error'}`,
                });
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: `✗ Network failure during test: ${err?.message}`,
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading AI Whisper configuration...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Permission Alert */}
            {!isAdmin && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(230, 167, 76, 0.12)',
                    border: '1px solid rgba(230, 167, 76, 0.3)',
                    color: '#FFD180',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <span>⚠️</span>
                    <span>Administrator privileges are required to configure AI speech-to-text providers.</span>
                </div>
            )}

            {/* Architecture Overview Card */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(20, 28, 30, 0.85) 0%, rgba(29, 39, 41, 0.95) 100%)',
                border: '1px solid rgba(56, 102, 66, 0.35)',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.6rem' }}>🎙️</span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--mtc-cornsilk)' }}>
                                Hybrid AI Speech-to-Text Architecture
                            </h3>
                            <span style={{
                                fontSize: '0.72rem',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(56, 102, 66, 0.4)',
                                color: '#A7F3D0',
                                fontWeight: 600,
                            }}>
                                Active Failover Enabled
                            </span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '780px', lineHeight: '1.5' }}>
                            MTC DAM utilizes a dual-engine broadcast pipeline. <strong>Cloud Whisper</strong> (Option 1) provides near-instantaneous transcription using <code>whisper-large-v3</code>. If the cloud API is offline, rate-limited, or unconfigured, the system <strong>automatically switches to Local On-Premises Whisper</strong> (Option 2) running directly on the server's CPU with <code>whisper.cpp</code>.
                        </p>
                    </div>
                </div>

                {/* Status Badges */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                }}>
                    <div style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>OPTION 1: CLOUD ENGINE (DEFAULT)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: (settings?.groqConfigured || settings?.openaiConfigured) ? '#10B981' : '#F59E0B',
                            }} />
                            <strong style={{ fontSize: '0.92rem', color: 'var(--mtc-cornsilk)' }}>
                                {settings?.groqConfigured ? 'Groq Whisper-Large-v3' : settings?.openaiConfigured ? 'OpenAI Whisper-1' : 'Awaiting API Key'}
                            </strong>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {settings?.groqConfigured ? `Key: ${settings.groqKeyMasked}` : settings?.openaiConfigured ? `Key: ${settings.openaiKeyMasked}` : 'Add Groq or OpenAI key below'}
                        </div>
                    </div>

                    <div style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>OPTION 2: ON-PREMISES LOCAL ENGINE</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: settings?.localWhisperAvailable ? '#10B981' : '#EF4444',
                            }} />
                            <strong style={{ fontSize: '0.92rem', color: 'var(--mtc-cornsilk)' }}>
                                {settings?.localWhisperAvailable ? 'whisper.cpp (ggml-base)' : 'Local Engine Missing'}
                            </strong>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {settings?.localWhisperAvailable ? 'Installed & ready for offline failover' : 'Checks /opt/whisper/whisper-cli'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Feedback Banners */}
            {feedback && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: feedback.type === 'success' ? 'rgba(56, 102, 66, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${feedback.type === 'success' ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: feedback.type === 'success' ? '#A7F3D0' : '#FCA5A5',
                    fontSize: '0.88rem',
                }}>
                    {feedback.message}
                </div>
            )}

            {testResult && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: testResult.success ? 'rgba(56, 102, 66, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${testResult.success ? 'var(--mtc-hunter-green)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: testResult.success ? '#A7F3D0' : '#FCA5A5',
                    fontSize: '0.88rem',
                }}>
                    {testResult.message}
                </div>
            )}

            {/* Configuration Form */}
            <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--mtc-cornsilk)', margin: 0 }}>
                    Engine Credentials & Orchestration
                </h4>

                {/* Preferred Provider Selection */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Primary Transcription Provider (Option 1)
                    </label>
                    <select
                        value={provider}
                        disabled={!isAdmin}
                        onChange={(e) => setProvider(e.target.value as any)}
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            backgroundColor: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--mtc-cornsilk)',
                            padding: '10px 14px',
                            fontSize: '0.88rem',
                            outline: 'none',
                        }}
                    >
                        <option value="groq">Groq Cloud (whisper-large-v3) — Ultra Fast & Free Tier</option>
                        <option value="openai">OpenAI Cloud (whisper-1)</option>
                        <option value="local">Local On-Premises Engine Only (whisper.cpp)</option>
                    </select>
                </div>

                {/* Groq Cloud API Key */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '640px', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                            Groq Cloud API Key (Recommended)
                        </label>
                        {settings?.groqConfigured && (
                            <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 600 }}>
                                Active ({settings.groqKeyMasked})
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', maxWidth: '640px' }}>
                        <input
                            type={showGroqKey ? 'text' : 'password'}
                            disabled={!isAdmin}
                            placeholder={settings?.groqConfigured ? 'Enter new key to change...' : 'gsk_...'}
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--mtc-cornsilk)',
                                padding: '10px 14px',
                                fontSize: '0.88rem',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowGroqKey(!showGroqKey)}
                            className="btn btn-secondary"
                            style={{ padding: '0 12px', fontSize: '0.8rem' }}
                        >
                            {showGroqKey ? 'Hide' : 'Show'}
                        </button>
                        <button
                            type="button"
                            disabled={testing || (!groqApiKey.trim() && !settings?.groqConfigured)}
                            onClick={() => handleTestConnection('groq')}
                            className="btn btn-secondary"
                            style={{ padding: '0 14px', fontSize: '0.8rem' }}
                        >
                            {testing ? 'Testing...' : 'Test Key'}
                        </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', maxWidth: '640px' }}>
                        Create a free API key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--mtc-hunter-green)' }}>console.groq.com</a>. Groq processes speech at 250x real-time speed.
                    </p>
                </div>

                {/* OpenAI API Key */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '640px', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                            OpenAI API Key
                        </label>
                        {settings?.openaiConfigured && (
                            <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 600 }}>
                                Active ({settings.openaiKeyMasked})
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', maxWidth: '640px' }}>
                        <input
                            type={showOpenAiKey ? 'text' : 'password'}
                            disabled={!isAdmin}
                            placeholder={settings?.openaiConfigured ? 'Enter new key to change...' : 'sk-...'}
                            value={openaiApiKey}
                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--mtc-cornsilk)',
                                padding: '10px 14px',
                                fontSize: '0.88rem',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                            className="btn btn-secondary"
                            style={{ padding: '0 12px', fontSize: '0.8rem' }}
                        >
                            {showOpenAiKey ? 'Hide' : 'Show'}
                        </button>
                        <button
                            type="button"
                            disabled={testing || (!openaiApiKey.trim() && !settings?.openaiConfigured)}
                            onClick={() => handleTestConnection('openai')}
                            className="btn btn-secondary"
                            style={{ padding: '0 14px', fontSize: '0.8rem' }}
                        >
                            {testing ? 'Testing...' : 'Test Key'}
                        </button>
                    </div>
                </div>

                {/* Auto Failover Checkbox */}
                <div style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(56, 102, 66, 0.1)',
                    border: '1px solid rgba(56, 102, 66, 0.25)',
                    maxWidth: '640px',
                }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoFailover}
                            disabled={!isAdmin}
                            onChange={(e) => setAutoFailover(e.target.checked)}
                            style={{ marginTop: '3px' }}
                        />
                        <div>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--mtc-cornsilk)' }}>
                                Automatic Local Whisper Failover (Option 1 ➔ Option 2)
                            </strong>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                When checked, if Cloud Whisper fails (e.g. rate limit, invalid key, or internet interruption), the transcription pipeline automatically routes the audio to the On-Premises <code>whisper.cpp</code> engine on TrueNAS so production never stops.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Save Button */}
                {isAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn-primary"
                            style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                        >
                            {saving ? 'Saving Configuration...' : 'Save AI Configuration'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
