"use client";

import { useState } from "react";
import { Module, UserModulePreference } from "@prisma/client";

interface Props {
  preference: UserModulePreference & { module: Module };
  onToggle: (moduleId: string, enabled: boolean) => Promise<void>;
  onSettings: (moduleId: string) => void;
}

export function ModulePreferenceCard({ preference, onToggle, onSettings }: Props) {
  const [enabled, setEnabled] = useState(preference.enabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle(preference.moduleId, !enabled);
      setEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        enabled ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{preference.module.icon}</span>
          <div>
            <h3 className="font-medium">{preference.module.name}</h3>
            <p className="text-sm text-gray-600">
              {preference.module.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSettings(preference.moduleId)}
            className="text-sm text-blue-600 hover:underline"
            disabled={!enabled}
          >
            Settings
          </button>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {preference.isInferred && enabled && (
        <p className="mt-2 text-xs text-gray-500">
          Auto-configured based on your zip code. Tap Settings to customize.
        </p>
      )}
    </div>
  );
}
