"use client";

import { type EditState } from "@/types";

const inputCls =
  "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500";

interface PhotoEditModalProps {
  editingId: string | null;
  editState: EditState;
  saving: boolean;
  onEditStateChange: (field: keyof EditState, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function PhotoEditModal({
  editingId,
  editState,
  saving,
  onEditStateChange,
  onSave,
  onCancel,
}: PhotoEditModalProps) {
  if (!editingId) return null;

  return (
    <>
      {/* Form */}
      <div className="px-6 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Title</label>
            <input
              value={editState.title}
              onChange={(e) => onEditStateChange("title", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Tags (comma-separated)
            </label>
            <input
              value={editState.tags}
              onChange={(e) => onEditStateChange("tags", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Location
            </label>
            <input
              value={editState.location}
              onChange={(e) => onEditStateChange("location", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Camera</label>
            <input
              value={editState.camera}
              onChange={(e) => onEditStateChange("camera", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Date taken
            </label>
            <input
              type="date"
              value={editState.dateTaken}
              onChange={(e) => onEditStateChange("dateTaken", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Lens</label>
            <input
              value={editState.lens}
              onChange={(e) => onEditStateChange("lens", e.target.value)}
              placeholder="e.g. Sigma 15mm f/2.8 Fisheye"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Focal length
            </label>
            <input
              value={editState.focalLength}
              onChange={(e) => onEditStateChange("focalLength", e.target.value)}
              placeholder="e.g. 15mm"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">ISO</label>
            <input
              value={editState.iso}
              onChange={(e) => onEditStateChange("iso", e.target.value)}
              placeholder="e.g. 800"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Shutter speed
            </label>
            <input
              value={editState.shutterSpeed}
              onChange={(e) =>
                onEditStateChange("shutterSpeed", e.target.value)
              }
              placeholder="e.g. 1/250"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Aperture
            </label>
            <input
              value={editState.aperture}
              onChange={(e) => onEditStateChange("aperture", e.target.value)}
              placeholder="e.g. f/2.8"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Caption</label>
          <textarea
            value={editState.aiCaption}
            onChange={(e) => onEditStateChange("aiCaption", e.target.value)}
            rows={3}
            placeholder="Write a caption, or use the ✦ button to generate one with AI"
            className={`${inputCls} resize-y`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-6 pb-5">
        <div />
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
