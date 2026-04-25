const getRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const isChatbotVoiceSupported = () => Boolean(getRecognitionConstructor());

export const getDefaultVoiceLanguage = () => "hi-IN";

export const startChatbotVoiceInput = ({
  lang = getDefaultVoiceLanguage(),
  onResult,
  onError,
  onEnd
} = {}) => {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join(" ")
      .trim();

    if (transcript) {
      onResult?.(transcript);
    }
  };

  recognition.onerror = (event) => {
    onError?.(event?.error || "voice-error");
  };

  recognition.onend = () => {
    onEnd?.();
  };

  recognition.start();
  return recognition;
};

export const stopChatbotVoiceInput = (recognition) => {
  try {
    recognition?.stop?.();
  } catch (error) {
    // Ignore stop errors from browsers that auto-close the recognition session.
  }
};
