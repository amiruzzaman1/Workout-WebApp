// The real AI runtime, Android only (Metro picks this file over the plain aiRuntime.tsx on an Android build).
// Wraps expo-llm-mediapipe's useLLM, which talks to Google's MediaPipe LLM Inference API: the actual model file
// lives on disk on the phone and inference runs there, nothing is sent anywhere. The model itself stays off
// until the user explicitly downloads it from User settings, since it is a sizeable one-time download.
import { useLLM } from 'expo-llm-mediapipe';
import { createContext, ReactNode, useCallback, useContext, useEffect } from 'react';
import { AiRuntime, MODEL_NAME, MODEL_URL, useAiEnabled } from './aiAssistant';

const Ctx = createContext<AiRuntime | null>(null);

export function AiRuntimeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useAiEnabled();
  const llm = useLLM({
    modelName: MODEL_NAME, modelUrl: MODEL_URL,
    maxTokens: 256, topK: 40, temperature: 0.2, randomSeed: 7,
  });

  // Loading a model that is already on disk is quick; this only fires once per app open, when enabled and
  // not already loaded, never a fresh download, that is always the user's own tap.
  useEffect(() => {
    if (enabled && llm.downloadStatus === 'downloaded' && !llm.isLoaded) {
      llm.loadModel().catch(() => {});
    }
  }, [enabled, llm.downloadStatus, llm.isLoaded]);

  const download = useCallback(async () => {
    await llm.downloadModel();
    setEnabled(true);
  }, [llm, setEnabled]);

  const remove = useCallback(async () => {
    setEnabled(false);
    // expo-llm-mediapipe's hook does not expose a delete method itself; the raw native module (its default export) does.
    const mod = (await import('expo-llm-mediapipe')).default;
    await mod.deleteDownloadedModel(MODEL_NAME).catch(() => {});
  }, [setEnabled]);

  const ask = useCallback((prompt: string) => llm.generateResponse(prompt), [llm]);

  const value: AiRuntime = {
    available: true, enabled, setEnabled, status: llm.downloadStatus, progress: llm.downloadProgress,
    error: llm.downloadError, isLoaded: llm.isLoaded, download, remove, ask,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAiRuntime(): AiRuntime {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAiRuntime() needs an AiRuntimeProvider above it');
  return v;
}
