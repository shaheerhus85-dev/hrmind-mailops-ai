export type BackendKind = "demo" | "firebase" | "api";
export type BackendDataSource = "local" | "backend";

export interface WorkspaceLists<TThread,Tcandidate,Tdraft> {
  inboxThreads: TThread[];
  candidates: Tcandidate[];
  replyDrafts: Tdraft[];
}

export interface BackendAdapter {
  readonly kind: BackendKind;
  readonly privateWorkspacesConnected: boolean;
  startReadSession?():void;
  getDataSource?():BackendDataSource;
  getWorkspace<T>(fallback:T):Promise<T>;
  saveWorkspace<T>(workspace:T):Promise<void>;
  getSettings<T>(fallback:T):Promise<T>;
  saveSettings<T>(settings:T):Promise<void>;
  listEmailThreads<T>(workspace:{inboxThreads:T[]}):Promise<T[]>;
  listCandidates<T>(workspace:{candidates:T[]}):Promise<T[]>;
  listDrafts<T>(workspace:{replyDrafts:T[]}):Promise<T[]>;
  listInterviewKits<T>(workspace:{interviewKits:T[]}):Promise<T[]>;
  listRagSources<T>(workspace:{ragSources?:T[]}):Promise<T[]>;
  saveDraft<T extends {id:number}>(draft:T):Promise<void>;
  stageRagSourceMetadata<T>(sources:T[]):Promise<void>;
  clearDemoSettings():Promise<void>;
}

export class BackendUnavailableError extends Error {
  constructor(message:string){
    super(message);
    this.name="BackendUnavailableError";
  }
}
