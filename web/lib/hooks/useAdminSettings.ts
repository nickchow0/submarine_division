"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type SiteSettings, DEFAULT_SETTINGS } from "@/types";
import { toggleSetting as apiToggleSetting } from "@/lib/adminApi";

export function useAdminSettings(initialSettings?: SiteSettings) {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(
    initialSettings ?? DEFAULT_SETTINGS,
  );
  const [settingsSaving, setSettingsSaving] = useState<
    keyof SiteSettings | null
  >(null);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  async function toggleSetting(key: keyof SiteSettings) {
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal }));
    setSettingsSaving(key);

    try {
      await apiToggleSetting(key, newVal);
      setSettingsFeedback("Saved");
      router.refresh(); // re-render server components (layout nav, etc.)
      setTimeout(() => setSettingsFeedback(null), 2000);
    } catch {
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: !newVal }));
      setSettingsFeedback("Save failed");
      setTimeout(() => setSettingsFeedback(null), 3000);
    } finally {
      setSettingsSaving(null);
    }
  }

  return { settings, settingsSaving, settingsFeedback, toggleSetting };
}
