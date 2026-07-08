import { demoAdapter, DEMO_SETTINGS_STORAGE_KEY } from "@/lib/backend/demoAdapter";
import type { BackendAdapter, BackendDataSource } from "@/lib/backend/types";

const DEMO_WORKSPACE_ID = "demo_ws_local";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/,"") ?? "";

type ApiWorkspace = { id:string; name:string; mode:string };
type ApiSettings = { demo_mode:boolean; human_review_required:boolean; draft_only:boolean; no_auto_send:boolean };
type ApiEmailThread = { id:string; sender_name:string; subject:string; category:string; priority:string; confidence:number; body_preview:string; received_at:string; status:string; has_attachment:boolean; attachment_name:string | null };
type ApiCandidate = { id:string; name:string; role:string; source:string; match_score:number; recommendation:string; next_step:string; matched_skills:string[]; missing_skills:string[]; risk_note:string };
type ApiDraft = { id:string; candidate_id:string; title:string; purpose:string; selected_variant:string; variant_short:string; variant_warm:string; variant_policy:string; status:string };
type ApiInterviewKit = { candidate_id:string; technical_questions:string[]; behavioral_questions:string[]; role_fit_questions:string[]; red_flags:string[]; what_to_listen_for:string[]; status:string };
type ApiRagSource = { id:string; filename:string; mime_type:string; size_bytes:number; status:string; created_at:string };
type LocalSettingsShape = { version:1; guardrails:{ reviewRequired:boolean; draftOnly:boolean; noAutoSend:boolean }; demoMode:boolean; ragFiles:unknown[] };

const apiIdToNumber = (id:string, fallback:number) => {
  const known:Record<string,number> = {
    candidate_ayesha: 1,
    candidate_omar: 2,
    candidate_mina: 3,
    candidate_hassan: 4,
    candidate_sara: 5,
    email_ayesha: 1,
    email_omar: 2,
    email_mina: 3,
    email_hassan: 4,
    email_sara: 5,
    draft_ayesha: 1,
    draft_omar: 2,
    draft_hassan: 3,
    draft_mina: 4,
    draft_sara: 5
  };
  return known[id] ?? fallback;
};

const candidateNameToId = (name:string, fallback:number) => {
  const normalized=name.toLowerCase();
  if(normalized.includes("ayesha")) return 1;
  if(normalized.includes("omar")) return 2;
  if(normalized.includes("mina")) return 3;
  if(normalized.includes("hassan")) return 4;
  if(normalized.includes("sara")) return 5;
  return fallback;
};

const readLocalSettings = ():Partial<LocalSettingsShape> => {
  if(typeof window==="undefined") return {};
  try{
    return JSON.parse(window.localStorage.getItem(DEMO_SETTINGS_STORAGE_KEY) ?? "{}") as Partial<LocalSettingsShape>;
  }catch{
    return {};
  }
};

const apiFetch = async <T>(path:string):Promise<T> => {
  if(!BACKEND_URL) throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured.");
  const response=await fetch(`${BACKEND_URL}${path}`,{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok) throw new Error(`Backend request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

let dataSource:BackendDataSource = BACKEND_URL ? "backend" : "local";
const fallback = async <T>(reader:()=>Promise<T>) => {
  dataSource="local";
  return reader();
};
const selectedVariantIndex = (selected:string) => selected==="warm" ? 1 : selected==="policy" ? 2 : 0;

export const apiAdapter:BackendAdapter = {
  kind:"api",
  privateWorkspacesConnected:false,
  startReadSession(){dataSource=BACKEND_URL ? "backend" : "local"},
  getDataSource(){return dataSource},
  async getWorkspace<T>(fallbackWorkspace:T){
    try{
      const workspace=await apiFetch<ApiWorkspace>("/api/workspaces/demo");
      return {
        ...fallbackWorkspace,
        workspaceSettings:{
          ...(fallbackWorkspace as {workspaceSettings?: object}).workspaceSettings,
          workspaceName:workspace.name,
          workspaceId:workspace.id,
          demo:workspace.mode==="demo",
          gmailConnected:false,
          ragConnected:false
        }
      } as T;
    }catch{
      return fallback(()=>demoAdapter.getWorkspace(fallbackWorkspace));
    }
  },
  async saveWorkspace<T>(workspace:T){return demoAdapter.saveWorkspace(workspace)},
  async getSettings<T>(fallbackSettings:T){
    try{
      const settings=await apiFetch<ApiSettings>(`/api/settings/${DEMO_WORKSPACE_ID}`);
      const local=readLocalSettings();
      return {
        ...fallbackSettings,
        ...local,
        version:1,
        guardrails:{
          reviewRequired:local.guardrails?.reviewRequired ?? settings.human_review_required,
          draftOnly:local.guardrails?.draftOnly ?? settings.draft_only,
          noAutoSend:local.guardrails?.noAutoSend ?? settings.no_auto_send
        },
        demoMode:local.demoMode ?? settings.demo_mode,
        ragFiles:local.ragFiles ?? []
      } as T;
    }catch{
      return fallback(()=>demoAdapter.getSettings(fallbackSettings));
    }
  },
  async saveSettings<T>(settings:T){return demoAdapter.saveSettings(settings)},
  async listEmailThreads<T>(workspace:{inboxThreads:T[]}){
    try{
      const threads=await apiFetch<ApiEmailThread[]>(`/api/email-threads/${DEMO_WORKSPACE_ID}`);
      return threads.map((thread,index)=>({
        id:apiIdToNumber(thread.id,index+1),
        sender:thread.sender_name,
        subject:thread.subject,
        preview:thread.body_preview,
        category:thread.category,
        confidence:Math.round(thread.confidence),
        priority:["High","Medium","Low"].includes(thread.priority) ? thread.priority : "Medium",
        status:["pending","reviewed","queued"].includes(thread.status) ? thread.status : "pending",
        time:new Date(thread.received_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
        reason:thread.has_attachment ? "Backend demo seed includes an attachment and recruiting workflow signal." : "Backend demo seed includes a recruiter workflow signal.",
        attachment:thread.attachment_name ?? "No attachment",
        candidateId:candidateNameToId(thread.sender_name,index+1)
      })) as T[];
    }catch{
      return fallback(()=>demoAdapter.listEmailThreads(workspace));
    }
  },
  async listCandidates<T>(workspace:{candidates:T[]}){
    try{
      const candidates=await apiFetch<ApiCandidate[]>(`/api/candidates/${DEMO_WORKSPACE_ID}`);
      return candidates.map((candidate,index)=>({
        id:apiIdToNumber(candidate.id,index+1),
        name:candidate.name,
        role:candidate.role,
        source:candidate.source,
        score:Math.round(candidate.match_score),
        status:candidate.recommendation,
        reviewStatus:"pending",
        location:"Demo workspace",
        experience:"Demo profile",
        summary:candidate.next_step,
        skills:candidate.matched_skills,
        gaps:candidate.missing_skills,
        risk:candidate.risk_note
      })) as T[];
    }catch{
      return fallback(()=>demoAdapter.listCandidates(workspace));
    }
  },
  async listDrafts<T>(workspace:{replyDrafts:T[]}){
    try{
      const drafts=await apiFetch<ApiDraft[]>(`/api/drafts/${DEMO_WORKSPACE_ID}`);
      return drafts.map((draft,index)=>({
        id:apiIdToNumber(draft.id,index+1),
        title:draft.title,
        type:draft.purpose,
        candidateId:apiIdToNumber(draft.candidate_id,index+1),
        selectedVariant:selectedVariantIndex(draft.selected_variant),
        reviewStatus:draft.status==="reviewed" ? "reviewed" : "draft",
        variants:[
          {name:"Short Professional",description:"Concise and direct",body:draft.variant_short},
          {name:"Warm Detailed",description:"Polite with more context",body:draft.variant_warm},
          {name:"Policy Grounded",description:"Policy-safe placeholder",body:draft.variant_policy,policy:true}
        ]
      })) as T[];
    }catch{
      return fallback(()=>demoAdapter.listDrafts(workspace));
    }
  },
  async listInterviewKits<T>(workspace:{interviewKits:T[]}){
    try{
      const kits=await apiFetch<ApiInterviewKit[]>(`/api/interview-kits/${DEMO_WORKSPACE_ID}`);
      return kits.map((kit,index)=>({
        candidateId:apiIdToNumber(kit.candidate_id,index+1),
        status:kit.status==="reviewed" ? "reviewed" : "ready",
        preparedAt:"Backend demo",
        sections:[
          {title:"Technical questions",questions:kit.technical_questions},
          {title:"Behavioral questions",questions:kit.behavioral_questions},
          {title:"Role-fit questions",questions:kit.role_fit_questions},
          {title:"Red flags & signals",questions:kit.red_flags},
          {title:"What to listen for",questions:kit.what_to_listen_for}
        ]
      })) as T[];
    }catch{
      return fallback(()=>demoAdapter.listInterviewKits(workspace));
    }
  },
  async listRagSources<T>(workspace:{ragSources?:T[]}){
    try{
      const sources=await apiFetch<ApiRagSource[]>(`/api/rag-sources/${DEMO_WORKSPACE_ID}`);
      return sources.map(source=>({
        id:source.id,
        name:source.filename,
        type:source.mime_type,
        size:source.size_bytes,
        addedAt:source.created_at,
        status:source.status
      })) as T[];
    }catch{
      return fallback(()=>demoAdapter.listRagSources(workspace));
    }
  },
  async saveDraft<T extends {id:number}>(draft:T){return demoAdapter.saveDraft(draft)},
  async stageRagSourceMetadata<T>(sources:T[]){return demoAdapter.stageRagSourceMetadata(sources)},
  async clearDemoSettings(){return demoAdapter.clearDemoSettings()}
};

export const backendApiConfigured = Boolean(BACKEND_URL);
