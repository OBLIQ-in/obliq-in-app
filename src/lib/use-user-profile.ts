"use client";

import { useEffect, useState } from "react";
import { defaultUserProfile } from "../data/default-user-profile.ts";
import { validUserProfile } from "./storage-validation.ts";
import type { UserProfile } from "@/types/workspace";

const STORAGE_KEY = "obliq-preview-user-profile-v1";
const PROFILE_EVENT = "obliq-profile-change";

export function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Partner";
  if (
    parts.length > 1 &&
    (parts[0].toUpperCase() === "CA" || parts[0].toUpperCase() === "ADV")
  ) {
    return parts[1];
  }
  return parts[0];
}

export function extractInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CP";
  const significant =
    parts.length > 1 &&
    (parts[0].toUpperCase() === "CA" || parts[0].toUpperCase() === "ADV")
      ? parts.slice(1)
      : parts;
  if (significant.length === 1) {
    return significant[0].slice(0, 2).toUpperCase();
  }
  return (
    significant[0][0] + significant[significant.length - 1][0]
  ).toUpperCase();
}

function readStoredProfile(): {
  profile: UserProfile;
  hasSavedProfile: boolean;
} {
  if (typeof window === "undefined") {
    return { profile: defaultUserProfile, hasSavedProfile: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profile: defaultUserProfile, hasSavedProfile: false };
    const parsed: unknown = JSON.parse(raw);
    if (validUserProfile(parsed)) {
      return { profile: parsed, hasSavedProfile: true };
    }
    return { profile: defaultUserProfile, hasSavedProfile: false };
  } catch {
    return { profile: defaultUserProfile, hasSavedProfile: false };
  }
}

export function useUserProfile() {
  const [profileState, setProfileState] = useState<{
    profile: UserProfile;
    hasSavedProfile: boolean;
  }>({ profile: defaultUserProfile, hasSavedProfile: false });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function sync() {
      setProfileState(readStoredProfile());
    }
    sync();
    setHydrated(true);
    window.addEventListener(PROFILE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function saveProfile(updates: Partial<UserProfile>) {
    const current = profileState.profile;
    const name = (updates.name ?? current.name).trim();
    const firstName = extractFirstName(name);
    const updated: UserProfile = {
      ...current,
      ...updates,
      name,
      firstName,
      isCustomized: true,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* Keep in-memory update when storage is unavailable */
    }

    setProfileState({ profile: updated, hasSavedProfile: true });
    window.dispatchEvent(new Event(PROFILE_EVENT));
    return updated;
  }

  function dismissWelcomeWithoutCustomizing() {
    const fallback: UserProfile = {
      ...defaultUserProfile,
      isCustomized: false,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    } catch {
      /* Storage unavailable */
    }
    setProfileState({ profile: fallback, hasSavedProfile: true });
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }

  return {
    profile: profileState.profile,
    hasSavedProfile: profileState.hasSavedProfile,
    hydrated,
    saveProfile,
    dismissWelcomeWithoutCustomizing,
    initials: extractInitials(profileState.profile.name),
  };
}
