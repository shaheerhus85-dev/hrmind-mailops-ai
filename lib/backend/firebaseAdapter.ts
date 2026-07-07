import { firebaseConfigured } from "@/lib/firebase";
import { BackendUnavailableError } from "@/lib/backend/types";
import type { BackendAdapter } from "@/lib/backend/types";

const unavailable=()=>new BackendUnavailableError(
  firebaseConfigured
    ?"Firebase backend access is paused for this demo deployment."
    :"Firebase public environment variables are not configured."
);

export const firebaseAdapter:BackendAdapter = {
  kind:"firebase",
  privateWorkspacesConnected:false,
  async getWorkspace<T>(_fallback:T){throw unavailable()},
  async saveWorkspace<T>(_workspace:T){throw unavailable()},
  async getSettings<T>(_fallback:T){throw unavailable()},
  async saveSettings<T>(_settings:T){throw unavailable()},
  async listEmailThreads<T>(_workspace:{inboxThreads:T[]}){throw unavailable()},
  async listCandidates<T>(_workspace:{candidates:T[]}){throw unavailable()},
  async listDrafts<T>(_workspace:{replyDrafts:T[]}){throw unavailable()},
  async saveDraft<T extends {id:number}>(_draft:T){throw unavailable()},
  async stageRagSourceMetadata<T>(_sources:T[]){throw unavailable()},
  async clearDemoSettings(){throw unavailable()}
};
