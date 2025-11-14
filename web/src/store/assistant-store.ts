import { create } from 'zustand';

interface AssistantState {
    isOpen: boolean;
    toggle: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
    isOpen: false,
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));