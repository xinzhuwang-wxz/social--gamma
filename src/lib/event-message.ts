export type EventAiAction =
  | "icebreak"
  | "ask_missing"
  | "offer_choices"
  | "request_decision"
  | "confirm_decision"
  | "create_pact";

export type EventAiPayload = {
  action: EventAiAction;
  text: string;
  options: string[];
  pactId?: string;
};

const PREFIX = "__EVENT_AI__:";

export function encodeEventAiMessage(payload: EventAiPayload) {
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function decodeEventAiMessage(content: string): EventAiPayload | null {
  if (!content.startsWith(PREFIX)) return null;
  try {
    const payload = JSON.parse(content.slice(PREFIX.length)) as Partial<EventAiPayload>;
    if (!payload.text || !payload.action) return null;
    return {
      action: payload.action,
      text: String(payload.text),
      options: Array.isArray(payload.options) ? payload.options.map(String).slice(0, 3) : [],
      pactId: payload.pactId ? String(payload.pactId) : undefined,
    };
  } catch {
    return null;
  }
}

export function readableMessage(content: string) {
  return decodeEventAiMessage(content)?.text ?? content;
}
