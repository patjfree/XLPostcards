import React, { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { CopilotProvider, CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { tourConfig } from '../config/tourConfig';
import { TourStorageService } from '../services/tourStorage';

// Create walkthroughable components that we'll use
export const CopilotTouchableOpacity = walkthroughable(require('react-native').TouchableOpacity);
export const CopilotView = walkthroughable(require('react-native').View);
export const CopilotTextInput = walkthroughable(require('react-native').TextInput);

interface TourGuideProps {
  children: React.ReactNode;
}

const TourGuideComponent: React.FC<TourGuideProps> = ({ children }) => {
  const { start, stop, copilotEvents } = useCopilot();
  const tourStarted = useRef(false);

  // Set up copilot event listeners
  useEffect(() => {
    const handleStart = () => {
      console.log('[TOUR] Tour started');
      tourStarted.current = true;
      
      // Set tour active state globally
      if ((global as any).setTourActive) {
        (global as any).setTourActive(true);
      }
      
      // Analytics: tour_started
      if (tourConfig.analytics.enabled) {
        console.log('[TOUR] Analytics: tour_started', { version: tourConfig.version });
      }
    };

    const handleStop = async () => {
      console.log('[TOUR] Tour stopped/completed');
      tourStarted.current = false;
      
      // Set tour inactive state globally
      if ((global as any).setTourActive) {
        (global as any).setTourActive(false);
      }
      
      // Tour completed successfully
      console.log('[TOUR] Tour completed successfully');
      
      // Mark tour as completed
      await TourStorageService.markTourCompleted();
      
      // Analytics: tour_completed
      if (tourConfig.analytics.enabled) {
        console.log('[TOUR] Analytics: tour_completed', { version: tourConfig.version });
      }
    };

    const handleStepChange = (step: any) => {
      console.log('[TOUR] Step changed:', step?.name);
      
      // Handle only the hamburger step
      if (step?.name === 'hamburger') {
        console.log('[TOUR] ✅ HAMBURGER STEP - Showing hamburger step');
        // Simple single-step tour - just highlight the hamburger button
      } else {
        console.log('[TOUR] ❌ UNKNOWN STEP - Unhandled step name:', step?.name);
      }
      
      // Analytics: tour_step_seen
      if (tourConfig.analytics.enabled && step?.name) {
        console.log('[TOUR] Analytics: tour_step_seen', { stepId: step.name });
      }
    };

    // Note: handleNext, handleFinish, and handleSkip events are not available in this version
    // Navigation is handled in handleStepChange instead

    // Register event listeners
    copilotEvents.on('start', handleStart);
    copilotEvents.on('stop', handleStop);
    copilotEvents.on('stepChange', handleStepChange);
    // Note: 'next', 'finish', and 'skip' events may not be available in this version
    // We'll handle navigation in stepChange instead

    // Cleanup
    return () => {
      copilotEvents.off('start', handleStart);
      copilotEvents.off('stop', handleStop);
      copilotEvents.off('stepChange', handleStepChange);
    };
  }, [copilotEvents]);

  // Auto-start tour on first launch
  useEffect(() => {
    const checkAndStartTour = async () => {
      if (tourStarted.current) return; // Prevent multiple starts
      
      const shouldShow = await TourStorageService.shouldShowTour();
      if (shouldShow && tourConfig.triggers.autoStartOnFirstLaunch) {
        console.log('[TOUR] Auto-starting tour for new user or version');
        setTimeout(() => {
          start();
        }, 2000); // Longer delay to ensure UI is fully ready
      }
    };

    checkAndStartTour();
  }, [start]);

  // Manual tour restart function (will be exposed globally)
  const restartTour = async () => {
    console.log('[TOUR] Manual restart requested');
    
    // Reset tour started flag
    tourStarted.current = false;
    
    await TourStorageService.resetTourState();
    
    // Navigate to Index screen first
    router.push('/');
    
    // Wait for navigation and then start tour
    setTimeout(() => {
      console.log('[TOUR] Starting tour after navigation');
      console.log('[TOUR] tourStarted.current:', tourStarted.current);
      console.log('[TOUR] start function available:', typeof start);
      try {
        start();
        console.log('[TOUR] start() called successfully');
      } catch (error) {
        console.log('[TOUR] Error calling start():', error);
      }
    }, 1500);
  };

  // Manual tour stop function (will be exposed globally)
  const stopTour = async () => {
    console.log('[TOUR] Manual stop requested');
    try {
      // Set tour inactive before stopping
      if ((global as any).setTourActive) {
        (global as any).setTourActive(false);
      }
      stop();
    } catch (error) {
      console.log('[TOUR] Error stopping tour:', error);
    }
  };

  // Expose restart and stop functions globally
  useEffect(() => {
    (global as any).restartTour = restartTour;
    (global as any).stopTour = stopTour;
    return () => {
      delete (global as any).restartTour;
      delete (global as any).stopTour;
    };
  }, []);

  return <>{children}</>;
};

export const TourGuide: React.FC<TourGuideProps> = ({ children }) => {
  return (
    <CopilotProvider
      overlay="svg"
      animated={true}
      labels={{
        skip: tourConfig.style.controls.skipLabel,
        next: tourConfig.style.controls.nextLabel,
        finish: tourConfig.style.controls.doneLabel,
      }}
      backdropColor={`rgba(0, 0, 0, ${tourConfig.style.overlay.backdropOpacity})`}
      verticalOffset={20}
      stopOnOutsideClick={false}
    >
      <TourGuideComponent>
        {children}
      </TourGuideComponent>
    </CopilotProvider>
  );
};

// Export step components for easy use
export { CopilotStep };

// Create a simple CopilotText component since it's not exported in v3
export const CopilotText: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  return <>{children}</>;
};