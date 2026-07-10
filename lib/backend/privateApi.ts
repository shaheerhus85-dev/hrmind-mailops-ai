const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/g,"") ?? "";

export const PRIVATE_SESSION_STORAGE_KEY = "hrmind:private-session:v1";

export type PrivateUser = {
  id:string;
  email:string;
  name:string;
  role:string;
  is_verified:boolean;
  created_at:string;
};

export type PrivateWorkspace = {
  id:string;
  owner_user_id:string;
  name:string;
  mode:"private";
  created_at:string;
};

export type PrivateSession = {
  accessToken:string;
  expiresAt:number;
  user:PrivateUser;
  workspace:PrivateWorkspace;
};

type AuthResponse = {
  access_token:string;
  expires_in:number;
  user:PrivateUser;
  workspace:PrivateWorkspace;
};

export type PrivateSettingsResponse = {
  demo_mode:boolean;
  human_review_required:boolean;
  draft_only:boolean;
  no_auto_send:boolean;
  no_message_deletion:boolean;
};

async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  if(!BACKEND_URL) throw new Error("Private workspaces require NEXT_PUBLIC_BACKEND_URL.");
  const response=await fetch(`${BACKEND_URL}${path}`,{
    ...options,
    cache:"no-store",
    headers:{Accept:"application/json","Content-Type":"application/json",...options.headers}
  });
  if(!response.ok){
    let detail="Request failed.";
    try{detail=(await response.json() as {detail?:string}).detail??detail}catch{}
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

const authHeaders=(token:string)=>({Authorization:`Bearer ${token}`});

export async function authenticate(mode:"login"|"signup", payload:{email:string;password:string;name?:string}):Promise<PrivateSession>{
  const response=await request<AuthResponse>(`/api/auth/${mode}`,{method:"POST",body:JSON.stringify(payload)});
  return {
    accessToken:response.access_token,
    expiresAt:Date.now()+response.expires_in*1000,
    user:response.user,
    workspace:response.workspace
  };
}

export const verifyPrivateSession=(token:string)=>request<PrivateUser>("/api/auth/me",{headers:authHeaders(token)});
export const getPrivateWorkspace=(token:string)=>request<PrivateWorkspace>("/api/workspaces/me",{headers:authHeaders(token)});
export const getPrivateList=<T>(token:string,path:"email-threads"|"candidates"|"drafts"|"interview-kits"|"rag-sources")=>request<T[]>(`/api/private/${path}`,{headers:authHeaders(token)});
export const getPrivateSettings=(token:string)=>request<PrivateSettingsResponse>("/api/private/settings",{headers:authHeaders(token)});
export const savePrivateSettings=(token:string,settings:Partial<PrivateSettingsResponse>)=>request<PrivateSettingsResponse>("/api/private/settings",{method:"PATCH",headers:authHeaders(token),body:JSON.stringify(settings)});

export function readPrivateSession():PrivateSession|null{
  if(typeof window==="undefined") return null;
  try{
    const session=JSON.parse(localStorage.getItem(PRIVATE_SESSION_STORAGE_KEY)??"null") as PrivateSession|null;
    if(!session?.accessToken||session.expiresAt<=Date.now()) return null;
    return session;
  }catch{return null}
}

export function storePrivateSession(session:PrivateSession){
  localStorage.setItem(PRIVATE_SESSION_STORAGE_KEY,JSON.stringify(session));
}

export function clearPrivateSession(){
  localStorage.removeItem(PRIVATE_SESSION_STORAGE_KEY);
}
