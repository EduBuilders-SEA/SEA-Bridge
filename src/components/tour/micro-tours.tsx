'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTourStore } from './tour-store';
import { X, Globe, UserPlus, MessageCircle } from 'lucide-react';

interface MicroTourConfig {
  id: string;
  trigger: 'first-visit' | 'empty-state' | 'feature-hover' | 'manual';
  title: string;
  message: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showDelay?: number; // milliseconds
}

const microTourConfigs: Record<string, MicroTourConfig> = {
  'language-hint': {
    id: 'language-hint',
    trigger: 'first-visit',
    title: 'Smart Translation',
    message: 'Messages will automatically translate to your selected language!',
    icon: <Globe className='w-5 h-5 text-blue-500' />,
    placement: 'bottom',
    showDelay: 2000,
  },
  'empty-contacts': {
    id: 'empty-contacts',
    trigger: 'empty-state',
    title: 'Add Your First Contact',
    message: 'Start connecting with teachers or parents by adding a contact.',
    icon: <UserPlus className='w-5 h-5 text-green-500' />,
    action: {
      label: 'Add Contact',
      onClick: () => {
        const addButton = document.querySelector(
          '[data-tour="add-contact-button"]'
        ) as HTMLElement;
        addButton?.click();
      },
    },
    placement: 'top',
    showDelay: 1000,
  },
  'first-message': {
    id: 'first-message',
    trigger: 'manual',
    title: 'Start Chatting',
    message:
      'Type your message and it will be automatically translated for the recipient.',
    icon: <MessageCircle className='w-5 h-5 text-purple-500' />,
    placement: 'top',
  },
};

interface MicroTourProps {
  feature: string;
  targetSelector?: string;
  children?: React.ReactNode;
}

export function MicroTour({
  feature,
  targetSelector,
  children,
}: MicroTourProps) {
  const { showMicroTour, hideMicroTour, hasCompletedTour } = useTourStore();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties>({});

  const config = microTourConfigs[feature];

  // Don't show micro-tours if main tour is completed
  useEffect(() => {
    if (!config || hasCompletedTour) return;

    const shouldShow = showMicroTour === feature;

    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, config.showDelay ?? 0);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showMicroTour, feature, config, hasCompletedTour]);

  // Position the micro-tour relative to target element
  useEffect(() => {
    if (!isVisible || !targetSelector) return;

    const positionTooltip = () => {
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 280;
      const tooltipHeight = 120;
      const margin = 12;

      let top: number;
      let left: number;

      switch (config.placement) {
        case 'top':
          top = rect.top - tooltipHeight - margin;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + margin;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - margin;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + margin;
          break;
        default:
          top = rect.bottom + margin;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
      }

      // Keep within viewport
      const padding = 16;
      top = Math.max(
        padding,
        Math.min(top, window.innerHeight - tooltipHeight - padding)
      );
      left = Math.max(
        padding,
        Math.min(left, window.innerWidth - tooltipWidth - padding)
      );

      setPosition({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1000,
      });
    };

    positionTooltip();
    window.addEventListener('scroll', positionTooltip, true);
    window.addEventListener('resize', positionTooltip);

    return () => {
      window.removeEventListener('scroll', positionTooltip, true);
      window.removeEventListener('resize', positionTooltip);
    };
  }, [isVisible, targetSelector, config.placement]);

  const handleClose = () => {
    setIsVisible(false);
    hideMicroTour();
  };

  const handleAction = () => {
    config.action?.onClick();
    handleClose();
  };

  if (!config || !isVisible) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Micro-tour tooltip */}
      <Card
        className='w-70 shadow-lg border border-primary/20 animate-in fade-in-0 zoom-in-95 duration-200'
        style={position}
      >
        <CardContent className='p-4'>
          <div className='flex items-start gap-3'>
            {/* Icon */}
            <div className='flex-shrink-0 mt-0.5'>{config.icon}</div>

            {/* Content */}
            <div className='flex-1 min-w-0'>
              <h4 className='font-semibold text-sm text-foreground mb-1'>
                {config.title}
              </h4>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {config.message}
              </p>
            </div>

            {/* Close button */}
            <Button
              variant='ghost'
              size='sm'
              onClick={handleClose}
              className='h-6 w-6 p-0 flex-shrink-0'
            >
              <X className='w-3 h-3' />
            </Button>
          </div>

          {/* Action button */}
          {config.action && (
            <div className='mt-3 flex justify-end'>
              <Button size='sm' onClick={handleAction} className='h-7 text-xs'>
                {config.action.label}
              </Button>
            </div>
          )}
        </CardContent>

        {/* Arrow pointing to target */}
        {targetSelector && (
          <div
            className={`absolute w-3 h-3 bg-card border-l border-t border-primary/20 rotate-45 ${
              config.placement === 'top'
                ? 'bottom-[-6px] left-1/2 -translate-x-1/2'
                : config.placement === 'bottom'
                ? 'top-[-6px] left-1/2 -translate-x-1/2'
                : config.placement === 'left'
                ? 'right-[-6px] top-1/2 -translate-y-1/2'
                : 'left-[-6px] top-1/2 -translate-y-1/2'
            }`}
          />
        )}
      </Card>
    </>
  );
}

// Hook for programmatic micro-tour control
export function useMicroTour() {
  const { showMicroTourFor, hideMicroTour, hasCompletedTour } = useTourStore();

  const showHint = (feature: string, delay = 0) => {
    if (hasCompletedTour) return; // Don't show if main tour completed

    if (delay > 0) {
      setTimeout(() => showMicroTourFor(feature), delay);
    } else {
      showMicroTourFor(feature);
    }
  };

  const hideHint = () => {
    hideMicroTour();
  };

  return { showHint, hideHint };
}

// Specialized micro-tour components for common use cases
export function LanguageMicroTour({ children }: { children: React.ReactNode }) {
  return (
    <MicroTour
      feature='language-hint'
      targetSelector='[data-tour="language-selector"]'
    >
      {children}
    </MicroTour>
  );
}

export function EmptyContactsMicroTour({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MicroTour
      feature='empty-contacts'
      targetSelector='[data-tour="add-contact-button"]'
    >
      {children}
    </MicroTour>
  );
}

export function FirstMessageMicroTour({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MicroTour
      feature='first-message'
      targetSelector='[data-tour="message-input"]'
    >
      {children}
    </MicroTour>
  );
}

// Smart wrapper that shows appropriate micro-tours based on context
export function SmartMicroTours({
  children,
  context,
}: {
  children: React.ReactNode;
  context: 'dashboard' | 'chat' | 'settings';
}) {
  const { showMicroTourFor, hasCompletedTour } = useTourStore();

  useEffect(() => {
    if (hasCompletedTour) return;

    // Show contextual micro-tours based on page and user state
    const timer = setTimeout(() => {
      if (context === 'dashboard') {
        // Check if user has no contacts
        const contactElements = document.querySelectorAll(
          '[data-contact-item]'
        );
        if (contactElements.length === 0) {
          showMicroTourFor('empty-contacts');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [context, hasCompletedTour, showMicroTourFor]);

  return (
    <>
      {context === 'dashboard' && (
        <EmptyContactsMicroTour>{children}</EmptyContactsMicroTour>
      )}
      {context === 'chat' && (
        <FirstMessageMicroTour>{children}</FirstMessageMicroTour>
      )}
      {context === 'settings' && (
        <LanguageMicroTour>{children}</LanguageMicroTour>
      )}
    </>
  );
}
