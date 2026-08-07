import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

// Safe loader — never crashes if @bacons/apple-targets is unavailable in Expo Go
let ExtensionStorageClass: { reloadWidget?: () => void } | null = null;
try {
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appleTargets = require("@bacons/apple-targets");
    ExtensionStorageClass = appleTargets.ExtensionStorage ?? null;
  }
} catch {
  ExtensionStorageClass = null;
}

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try {
      if (Platform.OS !== "ios") return;
      console.log("[WidgetProvider] reloading widget on mount");
      ExtensionStorageClass?.reloadWidget?.();
    } catch {
      // ignore — native module unavailable in Expo Go
    }
  }, []);

  const refreshWidget = useCallback(() => {
    try {
      if (Platform.OS !== "ios") {
        console.log("[WidgetProvider] refreshWidget called on non-iOS — skipping");
        return;
      }
      console.log("[WidgetProvider] refreshWidget called");
      ExtensionStorageClass?.reloadWidget?.();
    } catch {
      // ignore — native module unavailable in Expo Go
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
