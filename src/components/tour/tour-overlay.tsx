'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTourStore } from './tour-store';
import { TourTooltip } from './tour-tooltip';

interface TourOverlayProps {
  children: React.ReactNode;
}

export function TourOverlay({ children }: TourOverlayProps) {
  const { isActive, getCurrentStep, completeTour } = useTourStore();
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = getCurrentStep();

  // Find and highlight the target element
  useEffect(() => {
    if (!isActive || !currentStep.targetSelector) {
      setHighlightedElement(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(currentStep.targetSelector!);
      if (element) {
        setHighlightedElement(element);
        updateSpotlight(element);
      } else {
        // Retry finding element after a short delay
        setTimeout(findElement, 100);
      }
    };

    findElement();
  }, [isActive, currentStep.targetSelector]);

  const updateSpotlight = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const padding = 8; // Extra padding around the element

    setSpotlightStyle({
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '8px',
      pointerEvents: currentStep.allowInteraction ? 'none' : 'auto',
      zIndex: 1001, // Higher than overlay
    });
  };

  // Update spotlight position on scroll/resize
  useEffect(() => {
    if (!highlightedElement) return;

    const updatePosition = () => updateSpotlight(highlightedElement);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [highlightedElement, currentStep.allowInteraction]);

  // Handle clicks on overlay to close tour
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Clicked on overlay, not on content
      completeTour();
    }
  };

  // Close tour on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        completeTour();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isActive, completeTour]);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Render children normally */}
      {children}

      {/* Tour overlay */}
      <div
        ref={overlayRef}
        className="tour-overlay fixed inset-0 z-[1000] pointer-events-auto"
        onClick={handleOverlayClick}
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Spotlight cutout for highlighted element */}
        {highlightedElement && currentStep.targetSelector && (
          <div
            className="tour-spotlight"
            style={{
              ...spotlightStyle,
              background: 'transparent',
              boxShadow: `
                0 0 0 4px rgba(59, 130, 246, 0.5),
                0 0 0 9999px rgba(0, 0, 0, 0.75)
              `,
            }}
          />
        )}

        {/* Tour tooltip positioned relative to highlighted element or centered */}
        <TourTooltip
          targetElement={highlightedElement}
          step={currentStep}
        />
      </div>

      {/* CSS for smooth animations */}
      <style jsx>{`
        .tour-overlay {
          animation: tour-fade-in 0.3s ease-out;
        }

        .tour-spotlight {
          animation: tour-pulse 2s infinite;
        }

        @keyframes tour-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes tour-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 4px rgba(59, 130, 246, 0.5),
              0 0 0 9999px rgba(0, 0, 0, 0.75);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(59, 130, 246, 0.8),
              0 0 0 9999px rgba(0, 0, 0, 0.75);
          }
        }
      `}</style>
    </>
  );
}

// Higher-order component to wrap pages with tour functionality
export function withTour<P extends object>(Component: React.ComponentType<P>) {
  return function TourWrapper(props: P) {
    return (
      <TourOverlay>
        <Component {...props} />
      </TourOverlay>
    );
  };
}