'use client';

import { Button } from '@/components/ui/button';
import { useTourStore } from './tour-store';
import { PlayCircle, Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TourTriggerProps {
  variant?: 'button' | 'banner' | 'floating';
  autoShow?: boolean;
  delay?: number;
}

export function TourTrigger({ variant = 'button', autoShow = false, delay = 0 }: TourTriggerProps) {
  const { startTour, hasCompletedTour } = useTourStore();
  const [showAutoPrompt, setShowAutoPrompt] = useState(false);

  // Auto-show tour prompt for new users
  useEffect(() => {
    if (!autoShow || hasCompletedTour) return;

    const timer = setTimeout(() => {
      setShowAutoPrompt(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [autoShow, hasCompletedTour, delay]);

  const handleStartTour = () => {
    startTour();
    setShowAutoPrompt(false);
  };

  const handleDismiss = () => {
    setShowAutoPrompt(false);
  };

  // Don't show if user has already completed the tour
  if (hasCompletedTour && !showAutoPrompt) return null;

  if (variant === 'banner' && showAutoPrompt) {
    return (
      <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">New to SEA Bridge?</h3>
              <p className="text-blue-700 text-sm">Take a quick tour to learn about language translation and adding contacts.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-blue-600">
              Maybe later
            </Button>
            <Button size="sm" onClick={handleStartTour} className="bg-blue-600 hover:bg-blue-700">
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Tour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating' && showAutoPrompt) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">
                👋 Welcome to SEA Bridge!
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Learn how to use automatic translation and connect with contacts.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleStartTour} className="text-xs h-7">
                  Take Tour
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs h-7">
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <Button
      variant="outline"
      onClick={handleStartTour}
      className="border-primary/20 text-primary hover:bg-primary/5"
    >
      <PlayCircle className="w-4 h-4 mr-2" />
      Take a Quick Tour
    </Button>
  );
}

// Hook to trigger tour automatically based on user behavior
export function useAutoTour() {
  const { startTour, hasCompletedTour } = useTourStore();
  const [hasTriggered, setHasTriggered] = useState(false);

  const triggerTourForNewUser = (conditions: {
    isNewProfile?: boolean;
    hasNoContacts?: boolean;
    timeOnPage?: number;
  }) => {
    if (hasCompletedTour || hasTriggered) return;

    const { isNewProfile, hasNoContacts, timeOnPage = 0 } = conditions;

    // Trigger tour for truly new users
    if (isNewProfile) {
      setTimeout(() => {
        startTour();
        setHasTriggered(true);
      }, 2000); // 2 second delay after profile creation
    }
    // Or if user seems stuck (no contacts after some time)
    else if (hasNoContacts && timeOnPage > 30000) { // 30 seconds
      setTimeout(() => {
        startTour();
        setHasTriggered(true);
      }, 1000);
    }
  };

  return { triggerTourForNewUser };
}