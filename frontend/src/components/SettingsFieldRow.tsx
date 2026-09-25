import { useState } from 'react';
import './SettingsFieldRow.css';

interface SettingsFieldRowProps {
    label: string;
    value: string;
    /** Shown in the collapsed row when value is empty. */
    placeholder?: string;
    /** If false (default for username), Save stays disabled when the field is emptied. */
    allowEmpty?: boolean;
    onSave: (newValue: string) => Promise<void>;
}

export function SettingsFieldRow({
    label,
    value,
    placeholder = 'Not set',
    allowEmpty = false,
    onSave,
}: SettingsFieldRowProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    function openEditor() {
        setDraft(value);
        setError(null);
        setEditing(true);
    }

    function cancel() {
        setEditing(false);
        setError(null);
    }

    const trimmed = draft.trim();
    const canSave = !saving && trimmed !== value.trim() && (allowEmpty || trimmed !== '');

    async function handleSave() {
        if (!canSave) return;

        setSaving(true);
        setError(null);
        try {
            await onSave(trimmed);
            setEditing(false);
        } catch (err) {
            const message =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                'Something went wrong. Try again.';
            setError(message);
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <button type="button" className="settings-row" onClick={openEditor}>
                <span className="settings-row-label">{label}</span>
                <span className="settings-row-value">
                    <span className={value ? '' : 'settings-row-placeholder'}>{value || placeholder}</span>
                    <ChevronIcon />
                </span>
            </button>
        );
    }

    return (
        <div className="settings-row settings-row-editing">
            <label className="settings-row-editing-label" htmlFor={`settings-field-${label}`}>
                {label}
            </label>

            <div className="settings-row-editing-controls">
                <input
                    id={`settings-field-${label}`}
                    className="settings-row-input"
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                    disabled={saving}
                />
                <button type="button" className="settings-row-cancel" onClick={cancel} disabled={saving}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="settings-row-save"
                    onClick={handleSave}
                    disabled={!canSave}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {error && <p className="settings-row-error">{error}</p>}
        </div>
    );
}

function ChevronIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export { ChevronIcon };
