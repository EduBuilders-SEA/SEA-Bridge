'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTourStore, type TourStep } from './tour-store';
import { ArrowLeft, ArrowRight, X, CheckCircle } from 'lucide-react';

interface TourTooltipProps {
  targetElement: Element | null;
  step: TourStep;
}

export function TourTooltip({ targetElement, step }: TourTooltipProps) {
  const {
    nextStep,
    previousStep,
    completeTour,
    skipTour,
    canGoBack,
    canGoNext,
    getProgress,
  } = useTourStore();

  const [position, setPosition] = useState<React.CSSProperties>({});

  // Calculate tooltip position relative to target element
  useEffect(() => {
    if (!targetElement) {
      // Center the tooltip if no target element
      setPosition({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1002,
      });
      return;
    }

    const calculatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 380;
      const tooltipHeight = 400;
      const margin = 20;

      let top: number;
      let left: number;

      switch (step.placement) {
        case 'top':
          top = rect.top - tooltipHeight - margin;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'bottom':
          top = rect.bottom + margin;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - margin;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + margin;
          break;
        default:
          // Center fallback
          top = window.innerHeight / 2 - tooltipHeight / 2;
          left = window.innerWidth / 2 - tooltipWidth / 2;
      }

      // Ensure tooltip stays within viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

      setPosition({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1002,
      });
    };

    calculatePosition();

    // Recalculate on scroll/resize
    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [targetElement, step.placement]);

  const isLastStep = step.id === 'complete';
  const progress = getProgress();

  return (
    <Card
      className="w-[380px] shadow-2xl border-2 border-primary/20 animate-in fade-in-0 zoom-in-95 duration-300"
      style={position}
    >
      {/* Header */}
      <CardHeader className="text-center pb-4 relative">
        {/* Skip button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={skipTour}
          className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Step icon */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            {step.icon}
          </div>
        </div>

        <CardTitle className="text-xl font-headline text-foreground">
          {step.title}
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {step.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Feature details */}
        <div className="space-y-3">
          {step.details.map((detail, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <span className="text-primary mt-1 font-semibold">•</span>
              <span className="text-foreground leading-relaxed">{detail}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            {canGoBack() && (
              <Button variant="outline" onClick={previousStep} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {isLastStep ? (
              <Button
                onClick={completeTour}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Get Started!
              </Button>
            ) : (
              <Button onClick={nextStep} className="min-w-[100px]">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Interaction hint */}
        {step.allowInteraction && targetElement && (
          <div className="text-center pt-2">
            <p className="text-xs text-primary/80 font-medium">
              💡 You can interact with the highlighted element!
            </p>
          </div>
        )}
      </CardContent>

      {/* Arrow pointing to target (visual enhancement) */}
      {targetElement && step.placement && step.placement !== 'center' && (
        <div
          className={`absolute w-4 h-4 bg-card border-2 border-primary/20 rotate-45 ${
            step.placement === 'top'
              ? 'bottom-[-8px] left-1/2 -translate-x-1/2'
              : step.placement === 'bottom'
              ? 'top-[-8px] left-1/2 -translate-x-1/2'
              : step.placement === 'left'
              ? 'right-[-8px] top-1/2 -translate-y-1/2'
              : 'left-[-8px] top-1/2 -translate-y-1/2'
          }`}
        />
      )}
    </Card>
  );
}