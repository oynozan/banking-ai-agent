import { create } from "zustand";

// Auth store
interface IUser {
    id: string;
    name: string;
}

type UserState = "logged_in" | "loading" | "not_logged_in";

interface IUserState {
    state: UserState;
    user: IUser | null;
    setUser: (user: IUser) => void;
    setState: (state: UserState) => void;
    clearUser: () => void;
}

export const userState = create<IUserState>(set => ({
    state: "not_logged_in",
    user: null,
    setUser: (user: IUser) => set({ user }),
    setState: (state: UserState) => set({ state }),
    clearUser: () => set({ user: null }),
}));
