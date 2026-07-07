import type { BackendAdapter } from "@/lib/backend/types";

export const DEMO_WORKSPACE_STORAGE_KEY="hrmind:demoWorkspace:v1";
export const DEMO_SETTINGS_STORAGE_KEY="hrmind:settings:v1";

function readLocal<T>(key:string,fallback:T):T {
  if(typeof window==="undefined") return fallback;
  try{
    const value=JSON.parse(window.localStorage.getItem(key)??"null") as T|null;
    return value??fallback;
  }catch{
    return fallback;
  }
}

function writeLocal(key:string,value:unknown) {
  if(typeof window==="undefined") return;
  window.localStorage.setItem(key,JSON.stringify(value));
}

export const demoAdapter:BackendAdapter = {
  kind:"demo",
  privateWorkspacesConnected:false,
  async getWorkspace<T>(fallback:T){
    return readLocal(DEMO_WORKSPACE_STORAGE_KEY,fallback);
  },
  async saveWorkspace<T>(workspace:T){
    writeLocal(DEMO_WORKSPACE_STORAGE_KEY,workspace);
  },
  async getSettings<T>(fallback:T){
    return readLocal(DEMO_SETTINGS_STORAGE_KEY,fallback);
  },
  async saveSettings<T>(settings:T){
    writeLocal(DEMO_SETTINGS_STORAGE_KEY,settings);
  },
  async listEmailThreads<T>(workspace:{inboxThreads:T[]}){
    return workspace.inboxThreads;
  },
  async listCandidates<T>(workspace:{candidates:T[]}){
    return workspace.candidates;
  },
  async listDrafts<T>(workspace:{replyDrafts:T[]}){
    return workspace.replyDrafts;
  },
  async saveDraft<T extends {id:number}>(draft:T){
    const workspace=readLocal<{replyDrafts?:T[]}>(DEMO_WORKSPACE_STORAGE_KEY,{});
    if(!workspace.replyDrafts) return;
    writeLocal(DEMO_WORKSPACE_STORAGE_KEY,{
      ...workspace,
      replyDrafts:workspace.replyDrafts.map(item=>item.id===draft.id?draft:item)
    });
  },
  async stageRagSourceMetadata<T>(sources:T[]){
    const settings=readLocal<Record<string,unknown>>(DEMO_SETTINGS_STORAGE_KEY,{});
    writeLocal(DEMO_SETTINGS_STORAGE_KEY,{...settings,ragFiles:sources});
  },
  async clearDemoSettings(){
    if(typeof window==="undefined") return;
    window.localStorage.removeItem(DEMO_SETTINGS_STORAGE_KEY);
  }
};
