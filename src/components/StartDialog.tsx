import { X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BRIEF_EXAMPLES,
  BUILD_MODE_LIST,
  BUILD_MODES,
  BuildModeId,
  validateModeInput,
} from '../utils/buildModes';
import { BOARD_PRESETS, PcbBoardPreset } from '../utils/pcbLayout';
import { StartRequest } from '../utils/projects';
import { BrandLogo } from './BrandLogo';

interface StartDialogProps {
  /** `null` keeps the dialog closed; otherwise it opens on that mode. */
  openMode: BuildModeId | null;
  activePresetId: PcbBoardPreset['id'];
  onClose: () => void;
  onStart: (request: StartRequest) => void;
}

const FIELD_CLASS =
  'w-full border border-[var(--color-fg)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg)]/60';

export function StartDialog({
  openMode,
  activePresetId,
  onClose,
  onStart,
}: StartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [modeId, setModeId] = useState<BuildModeId>('full');
  const [selectedPreset, setSelectedPreset] = useState(activePresetId);
  const [fileName, setFileName] = useState('');
  const [brief, setBrief] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mode = BUILD_MODES[modeId];

  // Open / close the native modal dialog (focus trap, Esc and inert backdrop come for free).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openMode) {
      setModeId(openMode);
      setFileName('');
      setError(null);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [openMode]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateModeInput(mode, { fileName, brief });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onStart({
      mode: modeId,
      presetId: selectedPreset,
      fileName: mode.accepts && fileName.trim() ? fileName.trim() : undefined,
      brief: mode.accepts ? undefined : brief.trim(),
    });
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="start-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // Clicks on the backdrop land on the <dialog> element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto border border-[var(--color-fg)] bg-[var(--color-bg)] p-0 text-[var(--color-fg)] backdrop:bg-[var(--color-bg)]/85"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-fg)] pb-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-4 w-auto shrink-0 text-[var(--color-fg)]" />
            <h2
              id="start-dialog-title"
              className="font-display text-xl font-bold tracking-tight"
            >
              Start building
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono-label mb-1 text-xs uppercase tracking-[0.12em]">
            How do you want to begin?
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BUILD_MODE_LIST.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer flex-col gap-1 border px-3 py-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-fg)] ${
                  modeId === m.id
                    ? 'border-[1.5px] border-[var(--color-fg)] font-semibold'
                    : 'border-[var(--color-fg)]/60 font-normal'
                }`}
              >
                <input
                  type="radio"
                  name="build-mode"
                  value={m.id}
                  checked={modeId === m.id}
                  onChange={() => {
                    setModeId(m.id);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <span className="font-mono-label text-[11px]">{m.number}</span>
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="text-sm font-semibold">{mode.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{mode.description}</p>
        </div>

        {mode.accepts ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="pcb-file-input"
              className="font-mono-label text-xs uppercase tracking-[0.12em]"
            >
              Board file ({mode.accepts.filter((e) => e !== '.json').join(', ')})
            </label>
            <input
              id="pcb-file-input"
              type="file"
              accept={mode.accepts.join(',')}
              onChange={(e) => {
                setFileName(e.target.files?.[0]?.name ?? '');
                setError(null);
              }}
              className={`${FIELD_CLASS} file:mr-3 file:border file:border-[var(--color-fg)] file:bg-[var(--color-bg)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--color-fg)]`}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="project-brief"
              className="font-mono-label text-xs uppercase tracking-[0.12em]"
            >
              What are you building?
            </label>
            <textarea
              id="project-brief"
              rows={3}
              value={brief}
              onChange={(e) => {
                setBrief(e.target.value);
                setError(null);
              }}
              placeholder="A Wi-Fi temperature logger with a USB-C port…"
              className={FIELD_CLASS}
            />
            <div className="flex flex-wrap gap-2">
              {BRIEF_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setBrief(example);
                    setError(null);
                  }}
                  className="btn-secondary px-2.5 py-1 text-left text-[11px]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs font-medium">
            {error}
          </p>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono-label mb-1 text-xs uppercase tracking-[0.12em]">
            {mode.accepts ? 'No file handy? Try a reference board' : 'Preview with a reference board'}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.values(BOARD_PRESETS).map((preset) => (
              <label
                key={preset.id}
                className={`flex cursor-pointer items-center justify-between border px-3 py-2.5 text-sm ${
                  selectedPreset === preset.id
                    ? 'border-[1.5px] border-[var(--color-fg)] font-semibold'
                    : 'border-[var(--color-fg)] font-normal'
                }`}
              >
                <span>{preset.name}</span>
                <input
                  type="radio"
                  name="board-preset"
                  value={preset.id}
                  checked={selectedPreset === preset.id}
                  onChange={() => setSelectedPreset(preset.id)}
                  className="h-4 w-4 accent-[var(--color-fg)]"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="btn-primary flex-1 px-5 py-3 text-sm font-medium"
          >
            {mode.cta}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-5 py-3 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
