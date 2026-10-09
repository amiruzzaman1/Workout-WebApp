// The default AI runtime: does nothing, because the model only runs on Android (expo-llm-mediapipe has no web
// or iOS build). Metro picks aiRuntime.android.tsx instead of this file on an Android build; everywhere else,
// this stub keeps every caller working without needing its own Platform.OS check.
import { createContext, ReactNode, useContext } from 'react';
import { AiRuntime } from './aiAssistant';

const STUB: AiRuntime = {
  available: false, enabled: false, setEnabled: () => {}, status: 'not_downloaded', progress: 0, error: null,
  isLoaded: false, loadError: null, retryLoad: async () => {},
  download: async () => {}, cancelDownload: async () => {}, importLocalFile: async () => {},
  remove: async () => {}, ask: async () => '',
};

const Ctx = createContext<AiRuntime>(STUB);

export function AiRuntimeProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={STUB}>{children}</Ctx.Provider>;
}

export function useAiRuntime(): AiRuntime {
  return useContext(Ctx);
}
