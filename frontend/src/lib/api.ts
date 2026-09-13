// Unified data client. Tries the FastAPI sandbox first; on any network
// failure it flips to the in-browser Standalone Engine (same math, same
// shapes) so the demo never dies on stage. The active mode is observable
// so the header badge can reflect it.

import { engine, seedDatabase } from "./engine";
import {
  ConnectionMode,
  Customer,
  CustomerTwinProfile,
  Lead,
  LeadStatus,
  OutreachChannel,
  OutreachResponse,
  PerformanceStats,
  TeamPerformance,
} from "./types";

// Backend location. When NEXT_PUBLIC_API_BASE isn't pinned, derive it from
// the page's own hostname so phones/tablets on the same network reach the
// FastAPI server too (a hardcoded "localhost" would point at the phone itself).
function apiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return "http://localhost:8000/api";
}

let mode: ConnectionMode = "live";
let seeded = false;
const listeners = new Set<(m: ConnectionMode) => void>();

export function getMode(): ConnectionMode {
  return mode;
}

export function onModeChange(fn: (m: ConnectionMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function switchToStandalone(): void {
  if (mode === "standalone") return;
  mode = "standalone";
  ensureSeeded();
  listeners.forEach((fn) => fn(mode));
}

function ensureSeeded(): void {
  if (!seeded) {
    seedDatabase();
    seeded = true;
  }
}

// Static hosting (GitHub Pages / file://) can never reach localhost — skip the
// failed-fetch round trip and boot straight into standalone mode.
export function detectInitialMode(): ConnectionMode {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("github.io") || window.location.protocol === "file:") {
      switchToStandalone();
    }
  }
  return mode;
}

async function request<T>(path: string, init: RequestInit | undefined, fallback: () => T): Promise<T> {
  if (mode === "standalone") {
    // ~300ms artificial latency keeps loading states honest in demos
    await new Promise((r) => setTimeout(r, 250));
    return fallback();
  }
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`API ${path} responded ${res.status}`);
    return (await res.json()) as T;
  } catch {
    switchToStandalone();
    return fallback();
  }
}

export const api = {
  getCustomers: () => request<Customer[]>("/customers", undefined, () => engine.getCustomers()),

  getCustomerTwin: (id: number) =>
    request<CustomerTwinProfile>(`/customers/${id}/twin`, undefined, () => engine.getCustomerTwin(id)),

  getLeads: () => request<Lead[]>("/leads", undefined, () => engine.getLeads()),

  getPerformance: () => request<PerformanceStats>("/leads/performance", undefined, () => engine.getPerformance()),

  getTeamPerformance: () => request<TeamPerformance>("/team/performance", undefined, () => engine.getTeamPerformance()),

  logClickstream: (event: { customer_id: number; page_url: string; action: string; duration_seconds?: number }) =>
    request<unknown>("/clickstream", { method: "POST", body: JSON.stringify(event) }, () => {
      engine.logClickstream(event);
      return { message: "logged" };
    }),

  addTransaction: (tx: { customer_id: number; amount: number; category: string; description: string }) =>
    request<unknown>("/transaction", { method: "POST", body: JSON.stringify(tx) }, () => {
      engine.addTransaction(tx);
      return { message: "logged" };
    }),

  updateLeadStatus: (leadId: number, status: LeadStatus) =>
    request<unknown>(`/leads/${leadId}/status`, { method: "POST", body: JSON.stringify({ status }) }, () => {
      engine.updateLeadStatus(leadId, status);
      return { message: "updated" };
    }),

  generateOutreach: (leadId: number, channel: OutreachChannel) =>
    request<OutreachResponse>(
      "/outreach/generate",
      { method: "POST", body: JSON.stringify({ lead_id: leadId, channel }) },
      () => engine.generateOutreach(leadId, channel),
    ),

  reset: () =>
    request<unknown>("/reset", { method: "POST" }, () => {
      engine.reset();
      return { status: "success" };
    }),
};
