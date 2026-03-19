'use client'

import { type SiteSettings } from '@/types'

interface SettingsPanelProps {
  settings: SiteSettings
  settingsSaving: boolean | keyof SiteSettings
  settingsFeedback: string | null
  onToggle: (key: keyof SiteSettings) => void
}

export default function SettingsPanel({
  settings,
  settingsSaving,
  settingsFeedback,
  onToggle,
}: SettingsPanelProps) {
  return (
    <div className="mt-16 border-t border-slate-800 pt-10">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-widest">Experiments</h3>
        {settingsFeedback && (
          <span className="text-xs text-sky-400">{settingsFeedback}</span>
        )}
      </div>
      <p className="text-slate-600 text-xs mb-6">Feature flags that control behaviour across the public site. Changes take effect immediately.</p>

      <div className="space-y-3">
        {(
          [
            {
              key: 'showLocations' as const,
              label: 'Show Locations page',
              description: 'Shows the dive-site map in the navigation and at /locations.',
            },
            {
              key: 'showCaptions' as const,
              label: 'Show captions',
              description: 'Displays AI-generated captions in gallery cards, the photo modal, and the photo page.',
            },
            {
              key: 'autoGenerateCaptions' as const,
              label: 'Auto-generate captions on upload',
              description: 'Automatically generates an AI caption for each photo when it is uploaded.',
            },
            {
              key: 'requirePassword' as const,
              label: 'Require site password',
              description: 'When OFF, the site is publicly accessible without a password. Visitors skip the password page entirely.',
              dangerOff: true,
            },
            {
              key: 'maintenanceMode' as const,
              label: 'Maintenance mode',
              description: 'Replaces the public site with a "coming soon" screen. Admin access is unaffected.',
              danger: true,
            },
          ] as Array<{ key: keyof SiteSettings; label: string; description: string; danger?: boolean; dangerOff?: boolean }>
        ).map(({ key, label, description, danger, dangerOff }) => {
          const on = settings[key]
          const saving = settingsSaving === key
          // danger = amber when ON (e.g. maintenance mode)
          // dangerOff = amber when OFF (e.g. require password)
          const isWarning = (danger && on) || (dangerOff && !on)
          return (
            <div
              key={key}
              className={`flex items-center justify-between gap-4 bg-slate-900 border rounded-xl px-5 py-4 transition-colors ${
                isWarning ? 'border-amber-500/40' : 'border-slate-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isWarning ? 'text-amber-400' : 'text-slate-200'}`}>
                  {label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => onToggle(key)}
                disabled={saving}
                title={on ? 'Turn off' : 'Turn on'}
                className={`relative shrink-0 inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                  on
                    ? danger ? 'bg-amber-500' : 'bg-sky-500'
                    : dangerOff ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                {saving && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
              </button>

              {/* Status label */}
              <span className={`text-xs font-medium w-6 shrink-0 ${on ? (danger ? 'text-amber-400' : 'text-sky-400') : (dangerOff ? 'text-amber-400' : 'text-slate-600')}`}>
                {on ? 'ON' : 'OFF'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
