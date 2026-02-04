type OAuthProvider = "google" | "apple";

type OAuthTokens = {
  access_token: string;
  refresh_token: string;
};

type AuthorizationResponse = {
  // Success
  access_token?: string;
  refresh_token?: string;
  state?: string;
  // Error
  error?: string;
  error_description?: string;
};

const EXPECTED_MESSAGE_TYPE = "authorization_response" as const;
const OAUTH_BROKER_URL = "/~oauth/initiate";
const SUPPORTED_OAUTH_ORIGINS = ["https://oauth.lovable.app"];

function generateState() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getPopupDimensions() {
  const width = Math.min(720, Math.round(window.outerWidth * 0.6));
  const height = Math.min(760, Math.round(window.outerHeight * 0.8));
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  return { width, height, left, top };
}

function startWebMessageListener() {
  let resolvePromise!: (value: AuthorizationResponse) => void;

  const messagePromise = new Promise<AuthorizationResponse>((resolve) => {
    resolvePromise = resolve;
  });

  const callback = (e: MessageEvent) => {
    const isValidOrigin = SUPPORTED_OAUTH_ORIGINS.some((origin) => e.origin === origin);
    if (!isValidOrigin) return;

    const data = e.data as unknown;
    if (!data || typeof data !== "object") return;

    const maybe = data as { type?: string; response?: AuthorizationResponse };
    if (maybe.type !== EXPECTED_MESSAGE_TYPE) return;
    if (!maybe.response || typeof maybe.response !== "object") return;

    resolvePromise(maybe.response);
  };

  window.addEventListener("message", callback);

  return {
    messagePromise,
    cleanup: () => window.removeEventListener("message", callback),
  };
}

export async function signInWithOAuthWebMessage(
  provider: OAuthProvider,
  opts?: {
    redirect_uri?: string;
    extraParams?: Record<string, string>;
  }
): Promise<{ tokens?: OAuthTokens; error?: Error }> {
  const state = generateState();
  const redirectUri = opts?.redirect_uri ?? window.location.origin;

  const params = new URLSearchParams({
    provider,
    redirect_uri: redirectUri,
    state,
    response_mode: "web_message",
    ...(opts?.extraParams ?? {}),
  });

  const url = `${OAUTH_BROKER_URL}?${params.toString()}`;
  const { messagePromise, cleanup } = startWebMessageListener();

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const popup = isMobile
    ? window.open(url, "_blank")
    : window.open(
        url,
        "oauth",
        (() => {
          const { width, height, left, top } = getPopupDimensions();
          return `width=${width},height=${height},left=${left},top=${top}`;
        })()
      );

  if (!popup) {
    cleanup();
    return { error: new Error("Popup bloquée par le navigateur") };
  }

  let popupCheckInterval: number | undefined;
  const popupClosedPromise = new Promise<AuthorizationResponse>((_, reject) => {
    popupCheckInterval = window.setInterval(() => {
      if (popup.closed) {
        if (popupCheckInterval) window.clearInterval(popupCheckInterval);
        reject(new Error("Connexion annulée"));
      }
    }, 500);
  });

  try {
    const data = await Promise.race([messagePromise, popupClosedPromise]);

    if (data.error) {
      const msg = data.error === "legacy_flow"
        ? "Flux non supporté dans ce contexte. Ouvrez l'app dans un nouvel onglet puis réessayez."
        : data.error_description ?? "Connexion échouée";
      return { error: new Error(msg) };
    }

    if (data.state !== state) {
      return { error: new Error("State OAuth invalide") };
    }

    if (!data.access_token || !data.refresh_token) {
      return { error: new Error("Tokens OAuth manquants") };
    }

    return {
      tokens: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    if (popupCheckInterval) window.clearInterval(popupCheckInterval);
    cleanup();
    try {
      popup.close();
    } catch {
      // ignore
    }
  }
}
