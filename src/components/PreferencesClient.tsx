"use client";

/**
 * Client-side wrapper for the Preferences page.
 *
 * This component bridges the gap between Server Components and Client Components
 * in the preferences UI. It handles:
 * 1. Client-side navigation for module settings (using Next.js router)
 * 2. Server Action invocation for toggle operations
 *
 * Architectural Note:
 * In Next.js App Router, Server Actions can be passed to Client Components,
 * but client-side navigation (window.location, useRouter) requires client
 * context. This wrapper component provides that context while keeping the
 * data fetching in the Server Component parent.
 *
 * Design Pattern:
 * This follows the "Islands Architecture" pattern where interactive islands
 * (this component) are hydrated with client-side JavaScript while the
 * surrounding page remains server-rendered for optimal performance.
 */

import { useRouter } from "next/navigation";
import { Module, UserModulePreference } from "@prisma/client";
import { ModulePreferenceCard } from "./ModulePreferenceCard";

type PreferenceWithModule = UserModulePreference & { module: Module };

interface PreferencesClientProps {
  preferences: PreferenceWithModule[];
  toggleModuleAction: (moduleId: string, enabled: boolean) => Promise<void>;
}

export function PreferencesClient({
  preferences,
  toggleModuleAction,
}: PreferencesClientProps) {
  const router = useRouter();

  const handleSettings = (moduleId: string) => {
    router.push(`/preferences/${moduleId}`);
  };

  return (
    <div className="space-y-4">
      {preferences.map((pref) => (
        <ModulePreferenceCard
          key={pref.moduleId}
          preference={pref}
          onToggle={toggleModuleAction}
          onSettings={handleSettings}
        />
      ))}
    </div>
  );
}
