export type Lang = "en" | "hi" | "od";

const LANG_BCP47: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  od: "or-IN",
};

let _voicesCache: SpeechSynthesisVoice[] = [];
let _voicesLoaded = false;
let _currentAudioElement: HTMLAudioElement | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      _voicesCache = voices;
      _voicesLoaded = true;
      resolve(voices);
      return;
    }
    const handler = () => {
      _voicesCache = window.speechSynthesis.getVoices();
      _voicesLoaded = true;
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(_voicesCache);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      if (!_voicesLoaded) {
        _voicesCache = window.speechSynthesis.getVoices();
        resolve(_voicesCache);
      }
    }, 1500);
  });
}

export function findBestVoice(lang: Lang, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  if (lang === "en") {
    // Only accept genuine Indian English (en-IN) voices
    const exactEnIn = voices.find(
      (v) => v.lang.toLowerCase() === "en-in" || v.lang.toLowerCase() === "en_in"
    );
    if (exactEnIn) return exactEnIn;

    const indianName = voices.find((v) =>
      /india|indian|ravi|heera|neerja|karan/i.test(v.name)
    );
    if (indianName) return indianName;

    // Do NOT return generic en-US/en-GB voices; fallback to Indian Cloud TTS stream
    return null;
  }

  if (lang === "hi") {
    // Only accept genuine Indian Hindi (hi-IN) voices
    const exactHiIn = voices.find(
      (v) => v.lang.toLowerCase() === "hi-in" || v.lang.toLowerCase() === "hi_in"
    );
    if (exactHiIn) return exactHiIn;

    const hindiName = voices.find((v) =>
      /hindi|हिन्दी|hemant|kalpana|swara|madhur/i.test(v.name)
    );
    if (hindiName) return hindiName;

    return null;
  }

  if (lang === "od") {
    const exactOd = voices.find((v) => {
      const l = v.lang.toLowerCase();
      return l === "or-in" || l === "or_in" || l === "or" || l === "ori-in" || l === "om-in";
    });
    if (exactOd) return exactOd;

    const odiaName = voices.find((v) => /odia|oriya|ଓଡ଼ିଆ/i.test(v.name));
    if (odiaName) return odiaName;

    return null;
  }

  return null;
}

export function stopSpeaking(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (_currentAudioElement) {
    _currentAudioElement.pause();
    _currentAudioElement.currentTime = 0;
    _currentAudioElement = null;
  }
}

export async function speakText(
  text: string,
  lang: Lang,
  rate = 0.9,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err?: any) => void
): Promise<void> {
  stopSpeaking();

  const cleanText = text
    .replace(/[⚠️🚨🤖—•]/g, "")
    .replace(/\n+/g, ". ")
    .trim();

  if (!cleanText) return;

  const voices = await loadVoices();
  const matchedVoice = findBestVoice(lang, voices);

  // Stream authentic Indian voice audio from backend TTS endpoint (/ai-api/tts) if Odia or no native Indian voice is installed
  if (lang === "od" || !matchedVoice) {
    try {
      if (onStart) onStart();
      const encodedText = encodeURIComponent(cleanText);
      const audioUrl = `/ai-api/tts?text=${encodedText}&language=${lang}`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = rate;
      _currentAudioElement = audio;

      audio.onended = () => {
        _currentAudioElement = null;
        if (onEnd) onEnd();
      };
      audio.onerror = (e) => {
        _currentAudioElement = null;
        if (onError) onError(e);
      };

      await audio.play();
      return;
    } catch (e) {
      console.warn("Backend Indian TTS streaming failed, falling back to Web Speech API", e);
    }
  }

  if (!("speechSynthesis" in window)) {
    if (onError) onError(new Error("Web Speech API not supported"));
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);

  if (matchedVoice) {
    utterance.voice = matchedVoice;
    utterance.lang = matchedVoice.lang;
  } else {
    utterance.lang = LANG_BCP47[lang];
  }

  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (onStart) utterance.onstart = () => onStart();
  if (onEnd) utterance.onend = () => onEnd();
  if (onError) utterance.onerror = (e) => onError(e);

  window.speechSynthesis.speak(utterance);
}

export async function getVoiceDetails(lang: Lang): Promise<{
  status: "found" | "cloud_stream" | "fallback";
  voiceName: string;
}> {
  const voices = await loadVoices();
  const matched = findBestVoice(lang, voices);

  if (matched) {
    return { status: "found", voiceName: matched.name };
  }

  if (lang === "od") {
    return { status: "cloud_stream", voiceName: "Odia Natural Voice (Cloud Stream)" };
  }

  if (lang === "hi") {
    return { status: "fallback", voiceName: "Hindi (hi-IN)" };
  }

  return { status: "fallback", voiceName: "Indian English (en-IN)" };
}

export function getRecognitionLang(lang: Lang): string {
  return LANG_BCP47[lang];
}

export function listAvailableVoices(): { lang: string; name: string }[] {
  return window.speechSynthesis ? window.speechSynthesis.getVoices().map((v) => ({
    lang: v.lang,
    name: v.name,
  })) : [];
}
