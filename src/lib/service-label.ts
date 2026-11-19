import type { ServiceId } from "./types";

export function serviceNameKey(id: ServiceId) {
  return `services.${id}.name` as const;
}

export function serviceDescKey(id: ServiceId) {
  return `services.${id}.desc` as const;
}
