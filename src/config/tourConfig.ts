// Feature Tour Configuration
// Based on JSON specification for XLPostcards Feature Tour

export interface TourStep {
  id: string;
  screen: 'Index' | 'Settings' | 'Recipients';
  targetTestID: string;
  title: string;
  body: string;
  featureFlag?: string;
}

export interface TourConfig {
  name: string;
  version: number;
  objectives: string[];
  scope: {
    screens: string[];
    notes: string;
  };
  library: {
    preferred: string;
    alternatives: string[];
    selectionRationale: string;
  };
  storage: {
    asyncStorageKey: string;
    fields: {
      hasSeen: string;
      versionSeen: string;
    };
  };
  triggers: {
    autoStartOnFirstLaunch: boolean;
    restartEntryPoint: {
      location: string;
      itemTestID: string;
      label: string;
    };
  };
  behavior: {
    skippable: boolean;
    showSkipOnEveryStep: boolean;
    nextControl: string;
    skipIfMissingTarget: boolean;
    gracefulFeatureFlags: boolean;
    persistOnComplete: boolean;
    bumpVersionToReShow: boolean;
  };
  style: {
    theme: {
      primary: string;
      textOnPrimary: string;
    };
    overlay: {
      backdropOpacity: number;
      spotlightRadius: string;
    };
    controls: {
      nextLabel: string;
      skipLabel: string;
      doneLabel: string;
    };
    tone: string;
  };
  navigation: {
    routeMap: Record<string, string>;
    navigateBeforeStep: boolean;
  };
  featureFlags: Record<string, boolean>;
  selectors: Record<string, string>;
  steps: TourStep[];
  analytics: {
    enabled: boolean;
    events: Record<string, { properties: string[] }>;
  };
  acceptanceCriteria: string[];
  updatePolicy: {
    howToUpdate: string;
    nonBreakingChanges: string;
    breakingChanges: string;
  };
}

export const tourConfig: TourConfig = {
  name: "XLPostcards Feature Tour",
  version: 3,
  objectives: [
    "Help first-time users understand the drawer, settings, and core creation steps",
    "Explain why we ask for email and how return address is used",
    "Show where to edit/delete saved addresses",
    "Highlight AI-assisted writing ('Write for me')"
  ],
  scope: {
    screens: ["Index", "Settings", "Recipients"],
    notes: "Keep simple and non-blocking. Informational coach marks only."
  },
  library: {
    preferred: "react-native-copilot",
    alternatives: ["react-native-tour-guide"],
    selectionRationale: "Stable, lightweight coach-marks with spotlight overlays."
  },
  storage: {
    asyncStorageKey: "xlp_feature_tour_state",
    fields: {
      hasSeen: "boolean",
      versionSeen: "number"
    }
  },
  triggers: {
    autoStartOnFirstLaunch: true,
    restartEntryPoint: {
      location: "SettingsDrawer",
      itemTestID: "retake-tour-btn",
      label: "Take the Feature Tour Again"
    }
  },
  behavior: {
    skippable: true,
    showSkipOnEveryStep: true,
    nextControl: "Next button (non-forcing, does not require tapping target)",
    skipIfMissingTarget: true,
    gracefulFeatureFlags: true,
    persistOnComplete: true,
    bumpVersionToReShow: true
  },
  style: {
    theme: {
      primary: "#E5851A",
      textOnPrimary: "#FFFFFF"
    },
    overlay: {
      backdropOpacity: 0.6,
      spotlightRadius: "auto"
    },
    controls: {
      nextLabel: "Next",
      skipLabel: "Skip Tour",
      doneLabel: "Got it"
    },
    tone: "Friendly, concise, brand-aligned"
  },
  navigation: {
    routeMap: {
      "Index": "IndexScreen",
      "Settings": "SettingsScreen", 
      "Recipients": "RecipientsScreen"
    },
    navigateBeforeStep: true
  },
  featureFlags: {
    aiWriteButton: true
  },
  selectors: {
    hamburger: "hamburger-btn",
    settingsEmail: "settings-email-input",
    settingsReturnAddress: "settings-return-address",
    recipientRowActions: "recipient-row-actions",
    stepsContainer: "steps-container",
    writeForMe: "write-for-me-btn",
    createPostcard: "create-postcard-btn"
  },
  steps: [
    {
      id: "hamburger",
      screen: "Index",
      targetTestID: "hamburger-btn",
      title: "Menu & Settings",
      body: "Click on hamburger for full tutorial and add your information."
    }
  ],
  analytics: {
    enabled: true,
    events: {
      tour_started: { properties: ["version"] },
      tour_step_seen: { properties: ["stepId"] },
      tour_skipped: { properties: ["stepId", "version"] },
      tour_completed: { properties: ["version"] }
    }
  },
  acceptanceCriteria: [
    "Tour auto-starts on first launch and records completion.",
    "Tour can be restarted from Settings.",
    "Every step is skippable and non-blocking.",
    "If a step's target isn't present, it's auto-skipped without error.",
    "Copy fits within two lines on iPhone 13–16 logical widths.",
    "Hamburger, Email, Return Address, Recipient Manage, Steps Overview, Write for Me (if enabled), and Create Postcard are all covered."
  ],
  updatePolicy: {
    howToUpdate: "Edit copy/steps in this JSON or a mirrored TS config. Keep testIDs stable. When steps change, increment version to re-show the tour.",
    nonBreakingChanges: "Copy edits don't require version bump.",
    breakingChanges: "Adding/removing/reordering steps: bump version."
  }
};

// Helper functions for tour management
export const getStepsForScreen = (screen: string): TourStep[] => {
  return tourConfig.steps.filter(step => step.screen === screen);
};

export const getStepById = (id: string): TourStep | undefined => {
  return tourConfig.steps.find(step => step.id === id);
};

export const isFeatureFlagEnabled = (flagName?: string): boolean => {
  if (!flagName) return true;
  return tourConfig.featureFlags[flagName] === true;
};