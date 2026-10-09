// The real AI runtime, Android only (Metro picks this file over the plain aiRuntime.tsx on an Android build).
// Wraps expo-llm-mediapipe's useLLM, which talks to Google's MediaPipe LLM Inference API: the actual model file
// lives on disk on the phone and inference runs there, nothing is sent anywhere. The model itself stays off
// until the user explicitly downloads it from User settings, since it is a sizeable one-time download.
import { DownloadableLlmReturn, useLLM } from 'expo-llm-mediapipe';
import { Directory, File, Paths } from 'expo-file-system';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AiRuntime, MODEL_NAME, MODEL_URL, useAiEnabled } from './aiAssistant';

const Ctx = createContext<AiRuntime | null>(null);

// useLLM() is overloaded (asset/file models return a plainer shape); this runtime only ever calls it with
// modelUrl set, which always resolves to the downloadable shape with downloadModel/downloadStatus etc.
type Llm = DownloadableLlmReturn;

// useLLM() checks disk for an already downloaded file only once, the instant it first mounts. Importing a
// file manually (importLocalFile below) happens later, after that one check already ran and found nothing,
// so this wrapper gets remounted (by changing its key) whenever the runtime needs a fresh check, instead of
// requiring the whole app to restart to notice the file is now there.
function LlmBridge({ onChange }: { onChange: (llm: Llm) => void }) {
  const llm = useLLM({
    modelName: MODEL_NAME, modelUrl: MODEL_URL,
    // maxTokens is the whole session's budget, prompt and reply together, fixed once at load time (it is
    // what sizes the native engine's buffers, see LlmInferenceOptions.setMaxTokens in the native module).
    // It was 256: the written contract in aiAssistant.ts's systemPrompt() alone, with a realistic number of
    // foods and exercises filled in, comes to roughly 900 tokens, so every real request was already well
    // past the buffer the engine had allocated for the whole exchange. That is not a graceful "too long"
    // error on this engine, it is a native overflow, which takes the whole app down with it rather than
    // just the one request, matching "the app shuts down automatically" when a command reaches the model.
    maxTokens: 2048, topK: 40, temperature: 0.2, randomSeed: 7,
  });
  useEffect(() => { onChange(llm); }, [llm, onChange]);
  return null;
}

export function AiRuntimeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useAiEnabled();
  const [generation, setGeneration] = useState(0);
  const [llm, setLlm] = useState<Llm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Loading a model already on disk into memory is usually quick, but not always: the first load after a
  // fresh install or a manual file import can take a couple of minutes while MediaPipe sets up its GPU
  // delegate, and on a genuine failure (a corrupt or incomplete file, not enough memory) this used to just
  // swallow the error and sit on "Loading..." forever with no way to tell the two apart. Now a real failure
  // is surfaced, and retryLoad below gives a manual way to try again without reimporting the file.
  useEffect(() => {
    if (llm && enabled && llm.downloadStatus === 'downloaded' && !llm.isLoaded) {
      setLoadError(null);
      llm.loadModel().catch((e: any) => setLoadError(e?.message ?? 'Could not load the model.'));
    }
  }, [enabled, llm]);

  const retryLoad = useCallback(async () => {
    if (!llm) return;
    setLoadError(null);
    try { await llm.loadModel(); } catch (e: any) { setLoadError(e?.message ?? 'Could not load the model.'); }
  }, [llm]);

  const download = useCallback(async () => {
    if (!llm) return;
    await llm.downloadModel();
    setEnabled(true);
  }, [llm, setEnabled]);

  // useLLM() does not expose a cancel method itself, only the raw native module does (the same module
  // the download's own progress events already come from, so the hook's state still updates correctly).
  const cancelDownload = useCallback(async () => {
    const mod = (await import('expo-llm-mediapipe')).default;
    await mod.cancelDownload(MODEL_NAME).catch(() => {});
  }, []);

  const remove = useCallback(async () => {
    setEnabled(false);
    // expo-llm-mediapipe's hook does not expose a delete method itself; the raw native module (its default export) does.
    const mod = (await import('expo-llm-mediapipe')).default;
    await mod.deleteDownloadedModel(MODEL_NAME).catch(() => {});
    setGeneration((g) => g + 1);
  }, [setEnabled]);

  // For when the in-app download will not finish: the user downloads the exact same file themselves (their
  // phone's browser, a PC and a cable, anything), picks it with the system file picker, and this copies it
  // into the one folder and filename expo-llm-mediapipe's own "is it already downloaded" check looks at
  // (its internal files directory, llm_models/<model name>, which Paths.document on Android is the same
  // folder as), then forces useLLM() to run that check again.
  const importLocalFile = useCallback(async () => {
    const picked = await File.pickFileAsync();
    if (picked.canceled) return;
    const dir = new Directory(Paths.document, 'llm_models');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, MODEL_NAME);
    await picked.result.copy(dest, { overwrite: true });
    setGeneration((g) => g + 1);
  }, []);

  const ask = useCallback((prompt: string) => {
    if (!llm) throw new Error('Model is not ready yet');
    return llm.generateResponse(prompt);
  }, [llm]);

  const value: AiRuntime = {
    available: true, enabled, setEnabled,
    status: llm?.downloadStatus ?? 'not_downloaded', progress: llm?.downloadProgress ?? 0,
    error: llm?.downloadError ?? null, isLoaded: llm?.isLoaded ?? false,
    loadError, retryLoad,
    download, cancelDownload, remove, importLocalFile, ask,
  };

  return (
    <>
      <LlmBridge key={generation} onChange={setLlm} />
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </>
  );
}

export function useAiRuntime(): AiRuntime {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAiRuntime() needs an AiRuntimeProvider above it');
  return v;
}
