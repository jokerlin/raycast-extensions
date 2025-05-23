import { useState, useEffect, useCallback, useRef } from "react";
import { AI, environment } from "@raycast/api";
import { processInput } from "../services/wordCompletion";
import { Suggestion } from "../utils/types";
import { debounce, handleError } from "../utils/helpers";
import { CONFIG } from "../config/constants";

export function useWritingLogic() {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading suggestions...");
  const [hasAIPro, setHasAIPro] = useState<boolean | null>(null);
  const requestIdRef = useRef<number>(0);

  // Permission check logic
  useEffect(() => {
    const checkAIAccess = async () => {
      const hasAccess = environment.canAccess(AI);
      setHasAIPro(CONFIG.DEBUG_MODE.FORCE_NO_PRO ? false : hasAccess);
    };
    checkAIAccess();
  }, []);

  const debouncedProcessInput = useCallback(
    debounce(async (text: string) => {
      if (!text.trim() || !hasAIPro) {
        setSuggestions([]);
        return;
      }

      const currentRequestId = ++requestIdRef.current;

      setIsLoading(true);
      try {
        const results = await processInput(text);
        if (currentRequestId === requestIdRef.current) {
          setSuggestions(results);
        }
      } catch (error) {
        handleError(error);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, CONFIG.AI.DEBOUNCE_DELAY),
    [hasAIPro],
  );

  useEffect(() => {
    debouncedProcessInput(input);
  }, [input, debouncedProcessInput]);

  useEffect(() => {
    if (isLoading) {
      setLoadingText(input.match(/[\u4e00-\u9fa5]/) ? "Translating to English..." : "Getting suggestions...");
    }
  }, [isLoading, input]);

  return {
    input,
    setInput,
    suggestions,
    isLoading,
    hasAIPro,
    loadingText,
  };
}
