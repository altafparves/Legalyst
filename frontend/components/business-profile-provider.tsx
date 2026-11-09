"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

/** KBLI yang dipilih di Screen 1. Bentuknya cocok dengan KbliCandidate dari profiler. */
export type SelectedKbli = {
  code: string;
  title: string;
};

export type BusinessProfile = {
  description: string;
  kbli: SelectedKbli;
};

type BusinessProfileContextValue = {
  profile: BusinessProfile | null;
  /** false selama render server/hidrasi, sebelum sessionStorage terbaca. */
  hydrated: boolean;
  setProfile: (profile: BusinessProfile | null) => void;
};

const STORAGE_KEY = "legalyst_business_profile";
const SERVER_SNAPSHOT = "__server__";

// Profil disimpan di sessionStorage agar bertahan saat refresh. Bila storage
// tidak tersedia (mode privat), nilai disimpan di memori selama tab terbuka.
let memoryFallback: string | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

function writeRaw(value: string | null) {
  memoryFallback = value;
  try {
    if (value === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage tidak tersedia; memoryFallback dipakai
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parse(raw: string | null): BusinessProfile | null {
  if (!raw || raw === SERVER_SNAPSHOT) return null;
  try {
    return JSON.parse(raw) as BusinessProfile;
  } catch {
    return null;
  }
}

const BusinessProfileContext = createContext<BusinessProfileContextValue | null>(null);

export function BusinessProfileProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => SERVER_SNAPSHOT);
  const profile = useMemo(() => parse(raw), [raw]);
  const hydrated = raw !== SERVER_SNAPSHOT;

  const setProfile = useCallback((next: BusinessProfile | null) => {
    writeRaw(next ? JSON.stringify(next) : null);
  }, []);

  return (
    <BusinessProfileContext.Provider value={{ profile, hydrated, setProfile }}>
      {children}
    </BusinessProfileContext.Provider>
  );
}

export function useBusinessProfile() {
  const ctx = useContext(BusinessProfileContext);
  if (!ctx) {
    throw new Error("useBusinessProfile must be used inside BusinessProfileProvider");
  }
  return ctx;
}
