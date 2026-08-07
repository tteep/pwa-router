import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

// ExtensionStorage is an iOS-only native module — only import and instantiate on iOS
let storage: import("@bacons/apple-targets").ExtensionStorage | null = null;
let ExtensionStorageClass: typeof import("@bacons/apple-targets").ExtensionStorage | null = null;

if (Platform.OS === "ios") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const appleTargets = require("@bacons/apple-targets");
  ExtensionStorageClass = appleTargets.ExtensionStorage;
  storage = new appleTargets.ExtensionStorage("group.com.gatsbyrouter.app");
}

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (Platform.OS !== "ios") return;
    console.log("[WidgetProvider] reloading widget on mount");
    // set widget_state to null if we want to reset the widget
    // storage?.set("widget_state", null);
    ExtensionStorageClass?.reloadWidget();
  }, []);

  const refreshWidget = useCallback(() => {
    if (Platform.OS !== "ios") {
      console.log("[WidgetProvider] refreshWidget called on non-iOS — skipping");
      return;
    }
    console.log("[WidgetProvider] refreshWidget called");
    ExtensionStorageClass?.reloadWidget();
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
