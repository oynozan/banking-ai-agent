import { create } from 'zustand';

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