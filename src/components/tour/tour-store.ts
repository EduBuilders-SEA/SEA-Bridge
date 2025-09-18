'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TourStepId = 'language' | 'add-contact' | 'complete';

export interface TourStep {
  id: TourStepId;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  allowInteraction?: boolean; // Whether user can interact with highlighted element
  details: string[];
  icon: string;
}

export const tourSteps: TourStep[] = [
  {
    id: 'language',
    title: 'Set Your Language Preference',
    description: 'Choose your preferred language so all incoming messages will be automatically translated for you.',
    targetSelector: '[data-tour="language-selector"]',
    placement: 'bottom',
    allowInteraction: true,
    details: [
      '🌐 Select from 11+ Southeast Asian languages',
      '🦁 Powered by Sea-Lion AI for accurate translations',
      '⚡ Real-time translation as messages arrive',
      '🎯 Perfect for multilingual communication'
    ],
    icon: '🌐'
  },
  {
    id: 'add-contact',
    title: 'Add Your First Contact',
    description: 'Connect with teachers or parents to start meaningful conversations.',
    targetSelector: '[data-tour="add-contact-button"]',
    placement: 'top',
    allowInteraction: true,
    details: [
      '📱 Enter phone number to find contacts',
      '👶 Add child name (for teachers)',
      '🤝 Instant connection once both parties confirm',
      '💬 Start chatting immediately after connection'
    ],
    icon: '👥'
  },
  {
    id: 'complete',
    title: "You're All Set! 🎉",
    description: 'You now know the basics of SEA Bridge. Start connecting and communicating!',
    placement: 'center',
    details: [
      '✅ Language preferences configured',
      '✅ Ready to add contacts',
      '✅ Translation system active',
      '🚀 Time to start chatting!'
    ],
    icon: '🎉'
  }
];

interface TourState {
  isActive: boolean;
  currentStepId: TourStepId;
  currentStep: TourStep;
  hasCompletedTour: boolean;
  viewedSteps: Set<string>;
  showMicroTour: string | null; // For contextual micro-tours

  // Actions
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: TourStepId) => void;
  completeTour: () => void;
  skipTour: () => void;
  showMicroTourFor: (feature: string) => void;
  hideMicroTour: () => void;
  markStepViewed: (stepId: string) => void;

  // Getters
  getCurrentStep: () => TourStep;
  getProgress: () => number;
  canGoBack: () => boolean;
  canGoNext: () => boolean;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStepId: 'language',
      currentStep: tourSteps[0],
      hasCompletedTour: false,
      viewedSteps: new Set(),
      showMicroTour: null,

      startTour: () => {
        set({
          isActive: true,
          currentStepId: 'language',
          currentStep: tourSteps[0]
        });
        get().markStepViewed('language');
      },

      nextStep: () => {
        const { currentStepId } = get();
        const currentIndex = tourSteps.findIndex(step => step.id === currentStepId);

        if (currentIndex < tourSteps.length - 1) {
          const nextStep = tourSteps[currentIndex + 1];
          set({
            currentStepId: nextStep.id,
            currentStep: nextStep
          });
          get().markStepViewed(nextStep.id);
        }
      },

      previousStep: () => {
        const { currentStepId } = get();
        const currentIndex = tourSteps.findIndex(step => step.id === currentStepId);

        if (currentIndex > 0) {
          const prevStep = tourSteps[currentIndex - 1];
          set({
            currentStepId: prevStep.id,
            currentStep: prevStep
          });
        }
      },

      goToStep: (stepId: TourStepId) => {
        const step = tourSteps.find(s => s.id === stepId);
        if (step) {
          set({
            currentStepId: stepId,
            currentStep: step
          });
          get().markStepViewed(stepId);
        }
      },

      completeTour: () => {
        set({
          isActive: false,
          hasCompletedTour: true,
          currentStepId: 'language',
          currentStep: tourSteps[0]
        });

        // Track completion for analytics
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour:completed'));
        }
      },

      skipTour: () => {
        set({
          isActive: false,
          hasCompletedTour: true,
          currentStepId: 'language',
          currentStep: tourSteps[0]
        });

        // Track skip for analytics
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour:skipped'));
        }
      },

      showMicroTourFor: (feature: string) => {
        set({ showMicroTour: feature });
      },

      hideMicroTour: () => {
        set({ showMicroTour: null });
      },

      markStepViewed: (stepId: string) => {
        const { viewedSteps } = get();
        const newViewedSteps = new Set(viewedSteps);
        newViewedSteps.add(stepId);
        set({ viewedSteps: newViewedSteps });
      },

      getCurrentStep: () => {
        const { currentStep } = get();
        return currentStep;
      },

      getProgress: () => {
        const { currentStepId } = get();
        const currentIndex = tourSteps.findIndex(step => step.id === currentStepId);
        return ((currentIndex + 1) / tourSteps.length) * 100;
      },

      canGoBack: () => {
        const { currentStepId } = get();
        const currentIndex = tourSteps.findIndex(step => step.id === currentStepId);
        return currentIndex > 0;
      },

      canGoNext: () => {
        const { currentStepId } = get();
        const currentIndex = tourSteps.findIndex(step => step.id === currentStepId);
        return currentIndex < tourSteps.length - 1;
      },
    }),
    {
      name: 'sea-bridge-product-tour',
      partialize: (state) => ({
        hasCompletedTour: state.hasCompletedTour,
        viewedSteps: Array.from(state.viewedSteps), // Convert Set to Array for persistence
      }),
      onRehydrateStorage: () => (state) => {
        // Convert Array back to Set after rehydration
        if (state?.viewedSteps && Array.isArray(state.viewedSteps)) {
          (state as any).viewedSteps = new Set(state.viewedSteps);
        }
      },
    }
  )
);