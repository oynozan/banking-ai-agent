import { create } from "zustand";
import type { IUser } from "./types";

// Auth store
type UserState = "logged_in" | "loading" | "not_logged_in";

interface IUserState {
    state: UserState;
    user: IUser | null;
    setUser: (user: IUser) => void;
    setState: (state: UserState) => void;
    clearUser: () => void;
}

export const useUser = create<IUserState>(set => ({
    state: "not_logged_in",
    user: {
        name: "Anna",
        id: "user-id",
    },
    setUser: (user: IUser) => set({ user }),
    setState: (state: UserState) => set({ state }),
    clearUser: () => set({ user: null }),
}));
