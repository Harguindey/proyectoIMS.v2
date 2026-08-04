import { useState, useEffect } from "react";

const ONBOARDING_STORAGE_KEY = "stockpro-onboarding-completed";

export function useOnboarding() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      setIsOnboardingComplete(false);
      // Show tour after a short delay to let the app load
      setTimeout(() => {
        setShowTour(true);
      }, 1000);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsOnboardingComplete(true);
    setShowTour(false);
  };

  const startTour = () => {
    setShowTour(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setIsOnboardingComplete(false);
    setShowTour(true);
  };

  return {
    isOnboardingComplete,
    showTour,
    setShowTour,
    completeOnboarding,
    startTour,
    resetOnboarding,
  };
}