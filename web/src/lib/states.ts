import { create } from "zustand";
import type { IUser } from "./types";

// Auth store
type UserState = "logged_in" | "loading" | "not_logged_in";

interface IUserState {
    state: UserState;
    user: IUser | null;
    logout: () => void;
    setUser: (user: IUser) => void;
    setState: (state: UserState) => void;
    clearUser: () => void;
}

export const useUser = create<IUserState>(set => ({
    state: "not_logged_in",
    user: null,
    logout: () => set({ user: null, state: "not_logged_in" }),
    setUser: (user: IUser) => set({ user }),
    setState: (state: UserState) => set({ state }),
    clearUser: () => set({ user: null }),
}));

// Assistant store
interface AssistantState {
    isOpen: boolean;
    toggle: () => void;
    isFullScreen: boolean;
    toggleFullScreen: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
    isOpen: false,
    isFullScreen: false,
    toggle: () =>
        set((state) => ({
            isOpen: !state.isOpen,
            isFullScreen: state.isOpen ? false : state.isFullScreen,
        })),
    toggleFullScreen: () =>
        set((state) => ({ isFullScreen: !state.isFullScreen })),
}));

// UX store
interface IPreferences {
    showBalance: boolean;
    setShowBalance: (showBalance: boolean) => void;
}

export const usePreferencesStore = create<IPreferences>(set => ({
    showBalance: true,
    setShowBalance: (showBalance: boolean) => set({ showBalance }),
}));
