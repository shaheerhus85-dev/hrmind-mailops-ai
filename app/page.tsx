"use client";

import {
  AlertTriangle, ArrowUpRight, Bell, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, Clipboard,
  FileText, Inbox, Info, LockKeyhole, LogIn, Mail, Menu, RefreshCcw, Search, Send, Settings,
  ShieldCheck, Sparkles, SlidersHorizontal, UserCheck, X
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import gsap from "gsap";
import { backend, type BackendDataSource } from "@/lib/backend";
import {
  authenticate, clearPrivateSession, getPrivateList, getPrivateSettings, getPrivateWorkspace,
  readPrivateSession, savePrivateSettings, storePrivateSession, verifyPrivateSession,
  type PrivateSession
} from "@/lib/backend/privateApi";
import { LogoLockup } from "@/components/brand";

type View = "Overview" | "Inbox Triage" | "Candidate Review" | "Interview Kits" | "Reply Drafts" | "Settings";
type WorkspaceMode = "loading" | "gate" | "demo" | "private";
type ReviewStatus = "pending" | "analyzed" | "reviewed";
type Candidate = { id:number; name:string; role:string; source:string; score:number; status:string; reviewStatus:ReviewStatus; location:string; experience:string; summary:string; skills:string[]; gaps:string[]; risk:string };
type EmailItem = { id:number; sender:string; subject:string; preview:string; category:string; confidence:number; priority:"High"|"Medium"|"Low"; status:"pending"|"reviewed"|"queued"; time:string; reason:string; attachment:string; candidateId:number };
type DraftVariant = { name:string; description:string; body:string; policy?:boolean };
type Draft = { id:number; title:string; type:string; candidateId:number; variants:DraftVariant[]; selectedVariant:number; reviewStatus:"draft"|"reviewed"; generationSettings?:RegenerateSettings };
type InterviewSection = { title:string; questions:string[] };
type InterviewKit = { candidateId:number; status:"ready"|"reviewed"; preparedAt:string; sections:InterviewSection[] };
type ReviewAction = { id:string; type:string; entityType:"thread"|"candidate"|"draft"|"kit"; entityId:number; createdAt:string };
type DashboardQueueItem = { time:string; title:string; meta:string; status:"Ready"|"Review"|"Reviewed" };
type DashboardMetrics = { hiringSignals:number; cvApplications:number; replyDrafts:number; humanReview:number; totalCandidates:number; priorityCandidates:number; priorityDrafts:number; triage:{ highPriority:number; needsReview:number; fyi:number; done:number }; queue:DashboardQueueItem[] };
type WorkspaceSettingsState = { workspaceName:string; workspaceId:string; demo:boolean; gmailConnected:false; ragConnected:false };
type WorkspaceState = { version:1; inboxThreads:EmailItem[]; candidates:Candidate[]; replyDrafts:Draft[]; interviewKits:InterviewKit[]; dashboardMetrics:DashboardMetrics; workspaceSettings:WorkspaceSettingsState; reviewActions:ReviewAction[] };
type ReplyPurpose = "Shortlist" | "Need more information" | "Interview invitation" | "Follow-up" | "Polite rejection";
type ReplyTone = "Professional" | "Warm" | "Direct" | "Policy-grounded";
type ReplyLength = "Short" | "Medium" | "Detailed";
type RegenerateSettings = { purpose:ReplyPurpose; tone:ReplyTone; length:ReplyLength; useSources:boolean; extraInstruction:string };

const policySources = ["Interview Process Guide", "Offer Communication Policy", "Benefits FAQ"];
const DEMO_SESSION_STORAGE_KEY = "hrmind:demo-session:v1";
const regenerateDefaults: RegenerateSettings = {
  purpose: "Interview invitation",
  tone: "Professional",
  length: "Medium",
  useSources: true,
  extraInstruction: ""
};

const candidates: Candidate[] = [
  { id:1, name:"Ayesha Khan", role:"Senior React Engineer", source:"CV Applications", score:94, status:"shortlist suggestion", reviewStatus:"pending", location:"Lahore, PK", experience:"7 years", summary:"Strong frontend profile with TypeScript depth and product-dashboard ownership. Recruiter should verify compensation expectations.", skills:["React","TypeScript","Dashboards"], gaps:["GraphQL"], risk:"Compensation expectations need recruiter review." },
  { id:2, name:"Omar Siddiqui", role:"Talent Acquisition Lead", source:"Client Requirements", score:89, status:"needs recruiter review", reviewStatus:"pending", location:"Karachi, PK", experience:"9 years", summary:"Leadership profile aligns with technical hiring operations. Client scope needs clarification before sharing.", skills:["Tech hiring","Leadership","Agency ops"], gaps:["HRIS detail"], risk:"Client requirement has one open ambiguity." },
  { id:3, name:"Mina Roberts", role:"People Operations Manager", source:"HR Policy Questions", score:84, status:"human review required", reviewStatus:"pending", location:"Remote", experience:"8 years", summary:"Process-oriented people operations profile with strong policy exposure. Sensitive wording must remain under human review.", skills:["Policy ops","People process","Documentation"], gaps:["Payroll systems"], risk:"Policy-related response should stay under human review." },
  { id:4, name:"Hassan Ali", role:"Backend Engineer", source:"Candidate Follow-ups", score:78, status:"draft only", reviewStatus:"pending", location:"Islamabad, PK", experience:"5 years", summary:"Backend candidate remains engaged after interview. Follow-up wording is ready for recruiter verification.", skills:["Node.js","APIs","PostgreSQL"], gaps:["Kubernetes"], risk:"Candidate asked about timeline and benefits." },
  { id:5, name:"Sara Ahmed", role:"Customer Success Manager", source:"Offers / Salary", score:73, status:"human review required", reviewStatus:"pending", location:"Dubai, AE", experience:"6 years", summary:"Responsive customer success profile with an active compensation thread. Offer language needs recruiter approval.", skills:["Enterprise CS","Renewals","Negotiation"], gaps:["SaaS migration"], risk:"Offer discussion contains compensation details." }
];

const emails: EmailItem[] = [
  { id:1, sender:"Ayesha Khan", subject:"Application — Senior React Engineer", preview:"I’m sharing my updated CV and recent product dashboard work...", category:"CV Application", confidence:96, priority:"High", status:"pending", time:"09:42", reason:"Resume attachment, role title, and application language detected.", attachment:"Ayesha_Khan_CV.pdf", candidateId:1 },
  { id:2, sender:"Omar Siddiqui", subject:"Re: Talent acquisition leadership role", preview:"Could you clarify the team size and reporting structure?", category:"Client Requirement", confidence:88, priority:"Medium", status:"pending", time:"10:18", reason:"Role-scope clarification and client requirement signals found.", attachment:"Role_Brief.pdf", candidateId:2 },
  { id:3, sender:"Mina Roberts", subject:"Question about benefits policy", preview:"Before the next stage, I wanted to understand the policy...", category:"HR Policy", confidence:92, priority:"High", status:"pending", time:"11:05", reason:"Benefits and policy wording require a recruiter-verified response.", attachment:"No attachment", candidateId:3 },
  { id:4, sender:"Hassan Ali", subject:"Following up after technical interview", preview:"Thank you for the conversation. Is there an updated timeline?", category:"Candidate Follow-up", confidence:94, priority:"Medium", status:"pending", time:"12:30", reason:"Post-interview timing and follow-up intent detected.", attachment:"No attachment", candidateId:4 },
  { id:5, sender:"Sara Ahmed", subject:"Offer package follow-up", preview:"Thank you for the offer. I’d like to discuss the package...", category:"Offers / Salary", confidence:98, priority:"High", status:"pending", time:"13:15", reason:"Compensation terms and offer negotiation language detected.", attachment:"Offer_Summary.pdf", candidateId:5 }
];

const draftSeed = [
  ["Shortlist confirmation","Shortlisted reply",1,"Ayesha","Your experience aligns well with the Senior React Engineer role, and we would like to arrange a recruiter screening conversation."],
  ["Additional information request","Needs more info",2,"Omar","Could you share more detail on the size of teams you have led and your recent HRIS exposure?"],
  ["Technical interview invitation","Interview invitation",4,"Hassan","We would like to invite you to the next technical interview stage. Please review the proposed time and let us know if an adjustment is needed."],
  ["Post-interview follow-up","Follow-up",3,"Mina","The team is reviewing interview feedback, and we will share a verified update shortly."],
  ["Application outcome","Polite rejection",5,"Sara","Thank you for the time and care you invested in the process. After review, we will not be progressing with this opportunity."]
] as const;
const drafts:Draft[] = draftSeed.map(([title,type,candidateId,firstName,message],index)=>({
  id:index+1,title,type,candidateId,selectedVariant:0,reviewStatus:"draft",
  variants:[
    {name:"Short Professional",description:"Concise and direct",body:`Hi ${firstName},\n\n${message}\n\nBest,\nRecruitment Team`},
    {name:"Warm Detailed",description:"Polite with more context",body:`Hi ${firstName},\n\nThank you for staying engaged with our hiring process. ${message}\n\nWe appreciate the time you have invested and are happy to clarify any questions about the next step.\n\nWarm regards,\nRecruitment Team`},
    {name:"Policy Grounded",description:"RAG-ready policy wording",policy:true,body:`Hi ${firstName},\n\n${message}\n\nThis update follows our documented interview and candidate communication process. A recruiter will verify all details before this draft is used.\n\nKind regards,\nRecruitment Team`}
  ]
}));

const defaultInterviewSections:InterviewSection[] = [
  {title:"Technical questions",questions:["How would you structure complex dashboard state?","Describe a TypeScript migration you led."]},
  {title:"Behavioral questions",questions:["Tell us about a difficult product tradeoff.","How do you communicate technical risk?"]},
  {title:"Role-fit questions",questions:["What ownership model helps you do your best work?","How do you partner with product and design?"]},
  {title:"Red flags & signals",questions:["Listen for vague ownership claims.","Verify depth behind dashboard examples."]},
  {title:"What to listen for",questions:["Clear ownership and specific tradeoffs.","Evidence behind the strongest matched skills."]}
];

function computeDashboardMetrics(state:Pick<WorkspaceState,"inboxThreads"|"candidates"|"replyDrafts"|"interviewKits">):DashboardMetrics {
  if(state.inboxThreads.length===0&&state.candidates.length===0&&state.replyDrafts.length===0) return {hiringSignals:0,cvApplications:0,replyDrafts:0,humanReview:0,totalCandidates:0,priorityCandidates:0,priorityDrafts:0,triage:{highPriority:0,needsReview:0,fyi:0,done:0},queue:[]};
  const reviewedThreads=state.inboxThreads.filter(item=>item.status==="reviewed");
  const reviewedHigh=reviewedThreads.filter(item=>item.priority==="High").length;
  const reviewedOther=reviewedThreads.length-reviewedHigh;
  const reviewedCandidates=state.candidates.filter(item=>item.reviewStatus==="reviewed"&&(item.status.includes("review")||item.status.includes("human"))).length;
  const reviewedDrafts=state.replyDrafts.filter(item=>item.reviewStatus==="reviewed").length;
  const candidateFor=(id:number)=>state.candidates.find(item=>item.id===id);
  const kitQueue:DashboardQueueItem[]=state.interviewKits.slice(0,2).map((kit,index)=>{
    const candidate=candidateFor(kit.candidateId);
    return {time:index===0?"9:00 AM":"1:00 PM",title:`Interview: ${candidate?.name??"Candidate"}`,meta:candidate?.role??"Recruiter review",status:kit.status==="reviewed"?"Reviewed":"Ready"};
  });
  const draftQueue:DashboardQueueItem[]=state.replyDrafts.slice(0,2).map((draft,index)=>{
    const candidate=candidateFor(draft.candidateId);
    return {time:index===0?"11:00 AM":"3:00 PM",title:`Draft: ${draft.title}`,meta:candidate?.name??"Candidate",status:draft.reviewStatus==="reviewed"?"Reviewed":"Review"};
  });
  return {
    hiringSignals:274,
    cvApplications:128,
    replyDrafts:Math.max(0,58-reviewedDrafts),
    humanReview:Math.max(0,21-reviewedHigh-reviewedCandidates),
    totalCandidates:342,
    priorityCandidates:Math.max(0,12-state.candidates.filter(item=>item.reviewStatus==="reviewed").length),
    priorityDrafts:Math.max(0,8-reviewedDrafts),
    triage:{highPriority:Math.max(0,21-reviewedHigh),needsReview:Math.max(0,36-reviewedOther),fyi:45,done:172+reviewedThreads.length},
    queue:[kitQueue[0],draftQueue[0],kitQueue[1],draftQueue[1]].filter(Boolean) as DashboardQueueItem[]
  };
}

function createDemoWorkspaceState():WorkspaceState {
  const base:WorkspaceState={
    version:1,
    inboxThreads:emails.map(item=>({...item})),
    candidates:candidates.map(item=>({...item,skills:[...item.skills],gaps:[...item.gaps]})),
    replyDrafts:drafts.map(item=>({...item,variants:item.variants.map(variant=>({...variant}))})),
    interviewKits:candidates.map(item=>({candidateId:item.id,status:"ready",preparedAt:"Today",sections:defaultInterviewSections.map(section=>({...section,questions:[...section.questions]}))})),
    dashboardMetrics:{} as DashboardMetrics,
    workspaceSettings:{workspaceName:"Demo Recruiting Workspace",workspaceId:"demo_ws_local",demo:true,gmailConnected:false,ragConnected:false},
    reviewActions:[]
  };
  return {...base,dashboardMetrics:computeDashboardMetrics(base)};
}

function refreshWorkspace(state:WorkspaceState):WorkspaceState {
  return {...state,dashboardMetrics:computeDashboardMetrics(state)};
}

function createPrivateWorkspaceState(session:PrivateSession):WorkspaceState {
  return {
    version:1,
    inboxThreads:[],
    candidates:[],
    replyDrafts:[],
    interviewKits:[],
    dashboardMetrics:{
      hiringSignals:0,cvApplications:0,replyDrafts:0,humanReview:0,totalCandidates:0,
      priorityCandidates:0,priorityDrafts:0,triage:{highPriority:0,needsReview:0,fyi:0,done:0},queue:[]
    },
    workspaceSettings:{workspaceName:session.workspace.name,workspaceId:session.workspace.id,demo:false,gmailConnected:false,ragConnected:false},
    reviewActions:[]
  };
}

function getFirstName(fullName:string) {
  return fullName.split(" ").find(Boolean) ?? fullName;
}

function buildRegeneratedVariants(draft:Draft, settings:RegenerateSettings, candidate:Candidate) {
  const firstName = getFirstName(candidate.name);
  const purposeLines:Record<ReplyPurpose,string[]> = {
    "Shortlist":[
      `Hi ${firstName},`,
      `Thank you for your application. We would like to move your profile into the next recruiter review step.`
    ],
    "Need more information":[
      `Hi ${firstName},`,
      `Thank you for sharing your profile. We need a little more detail before we can move forward.`
    ],
    "Interview invitation":[
      `Hi ${firstName},`,
      `Thank you for your time. We would like to invite you to the next interview stage.`
    ],
    "Follow-up":[
      `Hi ${firstName},`,
      `Thank you for your patience while the team completes the review. Here is a verified update on the next step.`
    ],
    "Polite rejection":[
      `Hi ${firstName},`,
      `Thank you for the time and care you invested in the process. After review, we will not be moving forward at this stage.`
    ]
  };
  const toneClosings:Record<ReplyTone,string> = {
    Professional: "Best regards,\nRecruitment Team",
    Warm: "Warm regards,\nRecruitment Team",
    Direct: "Regards,\nRecruitment Team",
    "Policy-grounded": "Kind regards,\nRecruitment Team"
  };
  const lengthNotes:Record<ReplyLength,string[]> = {
    Short: [],
    Medium: [
      "This is a recruiter-controlled draft and can be adjusted before it is used."
    ],
    Detailed: [
      "If you have any time constraints or additional context to share, please reply with the details and we will review them carefully.",
      "We will keep the communication aligned with recruiter guidance before anything is sent."
    ]
  };
  const toneNotes:Record<ReplyTone,string> = {
    Professional: "The tone stays concise, clear, and recruiter-ready.",
    Warm: "The tone stays supportive and calm while still staying professional.",
    Direct: "The tone stays brief and straightforward.",
    "Policy-grounded": "The tone stays aligned with documented communication guardrails."
  };
  const describeVariant = (name:string) => `${settings.purpose} · ${settings.tone.toLowerCase()} · ${settings.length.toLowerCase()}`;
  const buildBody = (heading:string, extra:string[]) => [
    purposeLines[settings.purpose][0],
    "",
    purposeLines[settings.purpose][1],
    ...extra.map(line=>line ? ["", line].join("\n") : ""),
    "",
    toneNotes[settings.tone],
    settings.useSources && heading==="Policy Grounded" ? "" : "",
    "",
    toneClosings[settings.tone]
  ].filter(Boolean).join("\n");

  const shortBody = buildBody("Short Professional", [
    `We are keeping this note short and focused so the recruiter can review it quickly.${settings.length==="Short" ? "" : " The template can be expanded if more context is needed."}`
  ]);

  const warmBody = buildBody("Warm Detailed", [
    `We appreciate the time you have invested in the process and want to keep the next step clear and reassuring.`,
    ...lengthNotes[settings.length]
  ]);

  const policyBody = [
    `Hi ${firstName},`,
    "",
    settings.purpose === "Polite rejection"
      ? "Thank you for the time and care you invested in the process. This reply follows our documented communication standards and remains under recruiter review."
      : settings.purpose === "Need more information"
        ? "Thank you for the details you shared. This response follows our documented communication standards while we wait for a recruiter to verify the open points."
        : settings.purpose === "Follow-up"
          ? "Thank you for your patience. This response follows our documented communication standards and gives a verified update on the next step."
          : settings.purpose === "Shortlist"
            ? "Thank you for your application. This response follows our documented communication standards and keeps the next step recruiter-led."
            : "Thank you for your time. This response follows our documented communication standards and is ready for recruiter review.",
    "",
    settings.useSources
      ? "This draft is grounded in local policy references and stays within the recruiter-controlled review flow."
      : "This is a policy-aware template prepared for recruiter review.",
    "",
    toneNotes["Policy-grounded"],
    "",
    toneClosings["Policy-grounded"]
  ].join("\n");

  const policyDescription = settings.useSources ? "Policy-safe and source-ready" : "Policy-safe placeholder";

  return [
    {
      name: "Short Professional",
      description: describeVariant("Short Professional"),
      body: shortBody
    },
    {
      name: "Warm Detailed",
      description: describeVariant("Warm Detailed"),
      body: warmBody
    },
    {
      name: "Policy Grounded",
      description: policyDescription,
      body: policyBody,
      policy: true
    }
  ] as DraftVariant[];
}

const tabs: View[] = ["Overview","Inbox Triage","Candidate Review","Interview Kits","Reply Drafts"];
const nav: [string,View][] = [["Dashboard","Overview"],["Inbox","Inbox Triage"],["Candidates","Candidate Review"],["Interviews","Interview Kits"],["Drafts","Reply Drafts"],["Settings","Settings"]];

export default function Dashboard() {
  const appRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<number | null>(null);
  const [workspaceMode,setWorkspaceMode] = useState<WorkspaceMode>("loading");
  const [privateSession,setPrivateSession] = useState<PrivateSession|null>(null);
  const workspaceEmail=privateSession?.user.email??"";
  const [workspaceDataSource,setWorkspaceDataSource] = useState<BackendDataSource>("local");
  const [workspace,setWorkspace] = useState<WorkspaceState>(()=>createDemoWorkspaceState());
  const [workspaceReady,setWorkspaceReady] = useState(false);
  const [view,setView] = useState<View>("Overview");
  const [candidateId,setCandidateId] = useState(1);
  const [emailId,setEmailId] = useState(1);
  const [draftIndex,setDraftIndex] = useState<number | null>(0);
  const [workflow,setWorkflow] = useState("All workflows");
  const [menu,setMenu] = useState(false);
  const [query,setQuery] = useState("");
  const [copied,setCopied] = useState(false);
  const [kitCopied,setKitCopied] = useState(false);
  const [toast,setToast] = useState("");
  const candidate = workspace.candidates.find(x=>x.id===candidateId) ?? candidates[0];
  const email = workspace.inboxThreads.find(x=>x.id===emailId) ?? emails[0];
  const selectedDraft = draftIndex===null ? null : workspace.replyDrafts[draftIndex] ?? null;
  const draftVariant = selectedDraft?.selectedVariant ?? 0;
  const selectedDraftVariant = selectedDraft?.variants[draftVariant] ?? null;
  const selectedDraftGeneration = selectedDraft?.generationSettings ?? regenerateDefaults;
  const reviewedThreadIds = workspace.inboxThreads.filter(item=>item.status==="reviewed").map(item=>item.id);
  const hasContextData = view==="Inbox Triage" ? workspace.inboxThreads.length>0 : view==="Candidate Review"||view==="Interview Kits" ? workspace.candidates.length>0 : view==="Reply Drafts" ? workspace.replyDrafts.length>0 : true;
  const workflowMatch = (value:string) => workflow==="All workflows" || value.toLowerCase().includes(workflow.toLowerCase());
  const visibleEmails = useMemo(()=>workspace.inboxThreads.filter(x=>[x.sender,x.subject,x.category].join(" ").toLowerCase().includes(query.toLowerCase())&&workflowMatch(x.category)),[query,workflow,workspace.inboxThreads]);
  const visibleCandidates = useMemo(()=>workspace.candidates.filter(x=>[x.name,x.role,x.source,x.status,...x.skills].join(" ").toLowerCase().includes(query.toLowerCase())&&workflowMatch(x.source)),[query,workflow,workspace.candidates]);
  const showToast = (message:string) => {
    setToast(message);
    if(toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current=window.setTimeout(()=>setToast(""),2200);
  };
  const updateWorkspace = (updater:(current:WorkspaceState)=>WorkspaceState) => setWorkspace(current=>refreshWorkspace(updater(current)));
  const addAction = (state:WorkspaceState,type:string,entityType:ReviewAction["entityType"],entityId:number) => ({...state,reviewActions:[...state.reviewActions,{id:`${Date.now()}-${entityType}-${entityId}`,type,entityType,entityId,createdAt:new Date().toISOString()}].slice(-100)});
  const go = (next:View) => { setView(next); setMenu(false) };
  const chooseEmail = (item:EmailItem) => { setEmailId(item.id); setCandidateId(item.candidateId) };
  const chooseCandidate = (item:Candidate) => { setCandidateId(item.id); setEmailId(workspace.inboxThreads.find(thread=>thread.candidateId===item.id)?.id??emailId) };
  const chooseDraft = (index:number) => {
    const nextCandidateId=workspace.replyDrafts[index]?.candidateId??1;
    setDraftIndex(index);
    setCandidateId(nextCandidateId);
    setEmailId(workspace.inboxThreads.find(item=>item.candidateId===nextCandidateId)?.id??emailId)
  };
  const selectedDraftBody = selectedDraftVariant?.body??"";
  const markEmailReviewed = () => {
    updateWorkspace(state=>addAction({...state,inboxThreads:state.inboxThreads.map(item=>item.id===email.id?{...item,status:"reviewed"}:item)},"marked reviewed","thread",email.id));
    showToast("Marked reviewed");
  };
  const keepInQueue = () => {
    updateWorkspace(state=>addAction({...state,inboxThreads:state.inboxThreads.map(item=>item.id===email.id?{...item,status:"queued"}:item)},"kept in queue","thread",email.id));
    showToast("Kept in queue");
  };
  const analyzeCandidate = () => {
    updateWorkspace(state=>addAction({...state,candidates:state.candidates.map(item=>item.id===candidate.id?{...item,reviewStatus:"analyzed"}:item)},"routed to review","candidate",candidate.id));
    setCandidateId(email.candidateId);
    go("Candidate Review");
    showToast("Candidate routed to review");
  };
  const routeDraftForCandidate = () => {
    const index=workspace.replyDrafts.findIndex(item=>item.candidateId===candidate.id);
    if(index>=0) setDraftIndex(index);
    go("Reply Drafts");
  };
  const markCandidateReviewed = () => {
    updateWorkspace(state=>addAction({...state,candidates:state.candidates.map(item=>item.id===candidate.id?{...item,reviewStatus:"reviewed"}:item)},"marked reviewed","candidate",candidate.id));
    showToast("Marked reviewed");
  };
  const openInterviewKit = () => {
    setCandidateId(candidate.id);
    go("Interview Kits");
  };
  const markKitReviewed = () => {
    updateWorkspace(state=>addAction({...state,interviewKits:state.interviewKits.map(item=>item.candidateId===candidate.id?{...item,status:"reviewed"}:item)},"marked reviewed","kit",candidate.id));
    showToast("Marked reviewed");
  };
  const markDraftReviewed = () => {
    if(!selectedDraft) return;
    updateWorkspace(state=>addAction({...state,replyDrafts:state.replyDrafts.map(item=>item.id===selectedDraft.id?{...item,reviewStatus:"reviewed"}:item)},"marked reviewed","draft",selectedDraft.id));
    showToast("Marked reviewed");
  };
  const setDraftVariant = (index:number) => {
    if(!selectedDraft) return;
    updateWorkspace(state=>({...state,replyDrafts:state.replyDrafts.map(item=>item.id===selectedDraft.id?{...item,selectedVariant:index}:item)}));
  };
  const editDraftBody = (body:string) => {
    if(!selectedDraft) return;
    updateWorkspace(state=>({...state,replyDrafts:state.replyDrafts.map(item=>item.id===selectedDraft.id?{...item,variants:item.variants.map((variant,index)=>index===item.selectedVariant?{...variant,body}:variant)}:item)}));
  };
  const copy = async () => { if(!selectedDraftBody) return; try { await navigator.clipboard.writeText(selectedDraftBody) } catch {} setCopied(true); showToast("Draft copied"); window.setTimeout(()=>setCopied(false),1200) };
  const copyKit = async () => {
    const kit=workspace.interviewKits.find(item=>item.candidateId===candidate.id);
    if(!kit) return;
    const text=[`Interview kit for ${candidate.name}`,candidate.role,"",...kit.sections.flatMap(section=>[section.title,...section.questions.map((question,index)=>`${index+1}. ${question}`),""])].join("\n");
    try { await navigator.clipboard.writeText(text) } catch {}
    setKitCopied(true);
    showToast("Interview kit copied");
    window.setTimeout(()=>setKitCopied(false),1200);
  };
  const regenerateDraftOptions = (settings:RegenerateSettings) => {
    if(!selectedDraft) return;
    const draftCandidate=workspace.candidates.find(item=>item.id===selectedDraft.candidateId)??candidate;
    const nextVariants = buildRegeneratedVariants(selectedDraft, settings, draftCandidate);
    updateWorkspace(state=>addAction({...state,replyDrafts:state.replyDrafts.map(item=>item.id===selectedDraft.id?{...item,variants:nextVariants,selectedVariant:Math.min(item.selectedVariant,nextVariants.length-1),generationSettings:settings}:item)},"regenerated options","draft",selectedDraft.id));
    showToast("Reply options regenerated");
  };

  useLayoutEffect(()=>{
    if(!appRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(()=>{
      gsap.fromTo(
        ".view-canvas > *",
        {autoAlpha:0,y:7},
        {autoAlpha:1,y:0,duration:.28,ease:"power2.out",clearProps:"opacity,visibility,transform"}
      );
      gsap.fromTo(
        ".overview-stat, .priority-card",
        {autoAlpha:0,y:6},
        {autoAlpha:1,y:0,duration:.24,stagger:.035,ease:"power2.out",clearProps:"opacity,visibility,transform"}
      );
    },appRef);
    return ()=>context.revert();
  },[view]);

  const openDemoWorkspace=()=>{
    clearPrivateSession();
    setPrivateSession(null);
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY,"true");
    const fallback=createDemoWorkspaceState();
    setWorkspace(fallback);
    setWorkspaceDataSource("local");
    setCandidateId(1);
    setEmailId(1);
    setDraftIndex(0);
    setView("Overview");
    setWorkspaceMode("demo");
    setWorkspaceReady(true);

    void (async()=>{
    backend.startReadSession?.();
    try{
      const stored=await backend.getWorkspace<WorkspaceState>(fallback);
      const base=stored?.version===1
        ? {...fallback,...stored,workspaceSettings:{...fallback.workspaceSettings,...stored.workspaceSettings}}
        : fallback;
      const [inboxThreads,workspaceCandidates,replyDrafts,interviewKits]=await Promise.all([
        backend.listEmailThreads(base),
        backend.listCandidates(base),
        backend.listDrafts(base),
        backend.listInterviewKits(base)
      ]);
      setWorkspace(refreshWorkspace({...base,inboxThreads,candidates:workspaceCandidates,replyDrafts,interviewKits}));
      setWorkspaceDataSource(backend.getDataSource?.() ?? "local");
    }catch{
      setWorkspaceDataSource("local");
    }
    })();
  };

  const openPrivateWorkspace=async(session:PrivateSession)=>{
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    setWorkspaceReady(false);
    const [user,workspaceRecord,inboxThreads,privateCandidates,privateDrafts,privateKits]=await Promise.all([
      verifyPrivateSession(session.accessToken),
      getPrivateWorkspace(session.accessToken),
      getPrivateList<EmailItem>(session.accessToken,"email-threads"),
      getPrivateList<Candidate>(session.accessToken,"candidates"),
      getPrivateList<Draft>(session.accessToken,"drafts"),
      getPrivateList<InterviewKit>(session.accessToken,"interview-kits")
    ]);
    const currentSession={...session,user,workspace:workspaceRecord};
    storePrivateSession(currentSession);
    setPrivateSession(currentSession);
    const empty=createPrivateWorkspaceState(currentSession);
    setWorkspace({...empty,inboxThreads,candidates:privateCandidates,replyDrafts:privateDrafts,interviewKits:privateKits});
    setWorkspaceDataSource("backend");
    setCandidateId(1);setEmailId(1);setDraftIndex(null);setView("Overview");
    setWorkspaceMode("private");
    setWorkspaceReady(true);
  };

  useEffect(()=>{
    const session=readPrivateSession();
    if(session){
      void openPrivateWorkspace(session).catch(()=>{clearPrivateSession();setPrivateSession(null);setWorkspaceMode("gate")});
    }else if(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)==="true") openDemoWorkspace();
    else setWorkspaceMode("gate");
  },[]);

  useEffect(()=>{
    if(workspaceMode!=="demo"||!workspaceReady) return;
    void backend.saveWorkspace(workspace);
  },[workspace,workspaceMode,workspaceReady]);

  useEffect(()=>{
    if(workspaceMode!=="demo"||!workspaceReady||!selectedDraft) return;
    void backend.saveDraft(selectedDraft);
  },[selectedDraft,workspaceMode,workspaceReady]);

  useEffect(()=>()=>{if(toastTimer.current) window.clearTimeout(toastTimer.current)},[]);

  const exitWorkspace = () => {
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    clearPrivateSession();
    setPrivateSession(null);
    setWorkspaceReady(false);
    setWorkspaceMode("gate");
    setView("Overview");
  };

  if(workspaceMode==="loading") return <div className="auth-loading"><LogoLockup compact/><span>Preparing HRMind MailOps AI</span></div>;
  if(workspaceMode==="gate") return <AuthGate onDemo={openDemoWorkspace} onPrivate={session=>openPrivateWorkspace(session)}/>;
  if(!workspaceReady) return <div className="auth-loading"><LogoLockup compact/><span>Preparing HRMind MailOps AI</span></div>;

  return <main className="app-viewport" ref={appRef}><div className="app-frame"><div className="app-inner">
    <LeftRail view={view} onView={go}/>
    <div className="app-main">
      <TopNav menu={menu} query={query} workflow={workflow} workspaceMode={workspaceMode} workspaceEmail={workspaceEmail} workspaceDataSource={workspaceDataSource} onExit={exitWorkspace} onQuery={setQuery} onWorkflow={setWorkflow} onMenu={()=>setMenu(!menu)} onView={go}/>
      <div className={clsx("app-workspace",(view==="Overview"||view==="Settings")&&"dashboard-workspace",view==="Inbox Triage"&&"inbox-workspace",view==="Candidate Review"&&"candidate-workspace",view==="Interview Kits"&&"interview-workspace",view==="Reply Drafts"&&"drafts-workspace",view==="Settings"&&"settings-workspace")}>
      <section className={clsx("center-workspace",view==="Overview"&&"overview-workspace")}>
        {view!=="Overview"&&<WorkspaceHeader view={view} workspaceMode={workspaceMode}/>}
        <div className="view-canvas">
          {view==="Overview" && <Overview state={workspace} onReview={()=>go("Candidate Review")} onInbox={()=>go("Inbox Triage")} onDraft={()=>go("Reply Drafts")}/>}
          {view==="Inbox Triage" && <InboxView items={visibleEmails} selected={email} reviewed={reviewedThreadIds} query={query} onQuery={setQuery} onSelect={chooseEmail} onAnalyze={analyzeCandidate} onDraft={routeDraftForCandidate} onReviewed={markEmailReviewed} onKeep={keepInQueue}/>}
          {view==="Candidate Review" && <CandidateView items={visibleCandidates} selected={candidate} onSelect={chooseCandidate} onInterview={openInterviewKit} onDraft={routeDraftForCandidate} onReviewed={markCandidateReviewed}/>}
          {view==="Interview Kits" && <InterviewView items={visibleCandidates} selected={candidate} kit={workspace.interviewKits.find(item=>item.candidateId===candidate.id)} copied={kitCopied} onSelect={chooseCandidate} onCopy={copyKit} onReviewed={markKitReviewed}/>}
          {view==="Reply Drafts" && <DraftsView drafts={workspace.replyDrafts} candidates={workspace.candidates} selected={draftIndex} draft={selectedDraft} variant={draftVariant} body={selectedDraftBody} copied={copied} reviewed={selectedDraft?.reviewStatus==="reviewed"} generationSettings={selectedDraftGeneration} onSelect={chooseDraft} onVariant={setDraftVariant} onBody={editDraftBody} onCopy={copy} onReviewed={markDraftReviewed} onKeep={()=>showToast("Kept as draft")} onRegenerate={regenerateDraftOptions}/>}
          {view==="Settings" && <SettingsView workspaceMode={workspaceMode} token={privateSession?.accessToken??""} settings={workspace.workspaceSettings} onExit={exitWorkspace}/>}
        </div>
      </section>
      {(view==="Interview Kits"||view==="Reply Drafts")&&(hasContextData?<ContextIntelligence view={view} candidate={candidate} email={email} draft={selectedDraft} variant={draftVariant} reviewed={view==="Interview Kits"?workspace.interviewKits.find(item=>item.candidateId===candidate.id)?.status==="reviewed":selectedDraft?.reviewStatus==="reviewed"} kitCopied={kitCopied} draftCopied={copied} draftBody={selectedDraftBody} generationSettings={selectedDraftGeneration} onAnalyze={analyzeCandidate} onInterview={openInterviewKit} onDraft={routeDraftForCandidate} onCopyKit={copyKit} onCopyDraft={copy} onReviewed={view==="Interview Kits"?markKitReviewed:markDraftReviewed} onKeep={()=>showToast("Kept as draft")}/>:<ContextEmpty/>)}
    </div>
    </div>
  </div>{toast&&<Toast message={toast}/>}</div></main>;
}

function AuthGate({onDemo,onPrivate}:{onDemo:()=>void;onPrivate:(session:PrivateSession)=>Promise<void>}) {
  const [screen,setScreen] = useState<"welcome"|"login"|"signup">("welcome");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);

  const submit = async(event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");setBusy(true);
    try{
      const session=await authenticate(screen==="signup"?"signup":"login",{email,password});
      storePrivateSession(session);
      await onPrivate(session);
    }catch(error){setError(error instanceof Error?error.message:"Authentication failed.")}
    finally{setBusy(false)}
  };

  return <main className="auth-shell">
    <section className="auth-story">
      <LogoLockup inverse/>
      <div className="auth-positioning"><span>AI-assisted recruiter workflow</span><h1>Run hiring operations without living in your inbox.</h1><p>Classify hiring emails, review candidate signals, prepare interview kits, and approve reply drafts from one recruiter-controlled workspace.</p><div className="auth-benefits"><p><Inbox/><span><strong>Know what needs attention</strong><small>Hiring signals and CV applications arrive in clear review queues.</small></span></p><p><UserCheck/><span><strong>Keep decisions human</strong><small>Shortlist suggestions and risk notes always require recruiter review.</small></span></p><p><ShieldCheck/><span><strong>Draft only by design</strong><small>No automatic email sending, deleting, or final hiring decisions.</small></span></p></div></div>
      <p className="auth-footnote">
        <span>Frontend product demo</span><i aria-hidden="true">·</i>
        <span>Local sample data</span><i aria-hidden="true">·</i>
        <span>Gmail not connected</span>
      </p>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        {screen==="welcome"?<>
          <span className="auth-icon"><LockKeyhole/></span>
          <h2>Welcome to MailOps AI</h2>
          <p>Choose how you want to open the recruiter operations workspace.</p>
          <div className="auth-actions"><button className="auth-primary" onClick={onDemo}><Sparkles/> Continue with demo workspace</button><button className="auth-secondary" onClick={()=>setScreen("login")}><LogIn/> Create private workspace / Login</button></div>
          <div className="auth-safety"><ShieldCheck/><span><strong>Workspace trust notes</strong>Private workspaces use email/password authentication. Gmail and AI are not connected, and no automatic email sending is enabled.</span></div>
        </>:<form onSubmit={submit}>
          <button type="button" className="auth-back" onClick={()=>{setScreen("welcome");setError("")}}>← Back</button>
          <span className="auth-icon"><LockKeyhole/></span>
          <h2>{screen==="login"?"Log in to HRMind":"Create your workspace"}</h2>
          <p>{screen==="login"?"Log in to your private recruiter workspace.":"Create an empty private workspace for your recruiter-controlled data."}</p>
          <label>Email address<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="recruiter@company.com" required/></label>
          <label>Password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required/></label>
          {error&&<div className="auth-error"><AlertTriangle/>{error}</div>}
          <div className="auth-config"><Info/>Gmail not connected yet · AI not enabled yet · No automatic email sending</div>
          <button className="auth-primary" disabled={busy}>{busy?"Please wait…":screen==="login"?"Log in":"Create account"}</button>
          <p className="auth-switch">{screen==="login"?"Need an account?":"Already registered?"}<button type="button" onClick={()=>{setScreen(screen==="login"?"signup":"login");setError("")}}>{screen==="login"?"Sign up":"Log in"}</button></p>
        </form>}
      </div>
    </section>
  </main>
}

function TopNav({menu,query,workflow,workspaceMode,workspaceEmail,workspaceDataSource,onExit,onQuery,onWorkflow,onMenu,onView}:{menu:boolean;query:string;workflow:string;workspaceMode:WorkspaceMode;workspaceEmail:string;workspaceDataSource:BackendDataSource;onExit:()=>void;onQuery:(v:string)=>void;onWorkflow:(v:string)=>void;onMenu:()=>void;onView:(v:View)=>void}) {
  const demoLabel=workspaceDataSource==="backend" ? "Backend demo" : "Local demo";
  return <nav className="top-nav">
    <div className="header-search"><Search/><input value={query} onChange={event=>onQuery(event.target.value)} placeholder="Search candidates, emails, or workflows"/><label className="workflow-select"><SlidersHorizontal/><select aria-label="Workflow filter" value={workflow} onChange={event=>onWorkflow(event.target.value)}><option>All workflows</option><option>CV Application</option><option>Candidate Follow-up</option><option>HR Policy</option><option>Offers / Salary</option></select><ChevronDown/></label></div>
    <div className="nav-actions"><span className={clsx("demo-state",workspaceMode==="private"&&"private")}><i/>{workspaceMode==="private"?"Private workspace":demoLabel}</span><IconButton label="Settings" onClick={()=>onView("Settings")}><Settings/></IconButton><IconButton label="Notifications"><Bell/></IconButton><button className="profile-chip" title="Exit workspace" onClick={onExit}><span>{workspaceMode==="private"?(workspaceEmail[0]??"R").toUpperCase():"SJ"}</span><span><strong>{workspaceMode==="private"?"Private workspace":"Demo workspace"}</strong><small>{workspaceMode==="private"?workspaceEmail:"Demo workspace"}</small></span></button><button className="mobile-menu" onClick={onMenu}>{menu?<X/>:<Menu/>}</button></div>
    {menu&&<div className="mobile-nav">{nav.map(([label,target])=><button key={label} onClick={()=>onView(target)}>{label}</button>)}</div>}
  </nav>
}

function LeftRail({view,onView}:{view:View;onView:(v:View)=>void}) {
  const items:[string,View,ElementType][]=[["Dashboard","Overview",Inbox],["Inbox","Inbox Triage",Mail],["Candidates","Candidate Review",UserCheck],["Interviews","Interview Kits",CalendarDays],["Drafts","Reply Drafts",Send]];
  return <aside className="left-rail"><button className="sidebar-logo" aria-label="Open HRMind dashboard" onClick={()=>onView("Overview")}><LogoLockup compact inverse/></button><span className="rail-navigation-label">Workspace</span><div className="rail-navigation">{items.map(([label,target,Icon])=><button title={label} aria-label={label} className={clsx(view===target&&"active")} key={label} onClick={()=>onView(target)}><Icon/><span>{label}</span>{label==="Inbox"&&<i>21</i>}</button>)}</div>
    <div className="rail-footer"><button className={clsx("rail-settings",view==="Settings"&&"active")} onClick={()=>onView("Settings")}><Settings/><span>Settings</span></button><div className="rail-safety" title="Human review required"><i/><ShieldCheck/><span><strong>Safe Mode</strong><small>Human review on</small></span></div></div>
  </aside>
}

function WorkspaceHeader({view,workspaceMode}:{view:View;workspaceMode:WorkspaceMode}){
  const context:Record<Exclude<View,"Overview">,[string,string]>={
    "Inbox Triage":["Inbox Triage","Review classified recruiter emails and route them into hiring workflows."],
    "Candidate Review":["Candidate Review","Compare candidate signals, gaps, and recruiter-safe next steps."],
    "Interview Kits":["Interview Kits","Review tailored questions before recruiter screening."],
    "Reply Drafts":["Reply Drafts","Review recruiter-ready drafts before anything is sent."],
    "Settings":["Workspace Settings","Demo data, privacy, auth, and integration readiness."]
  };
  const [title,subtitle]=context[view as Exclude<View,"Overview">];
  return <header className="workspace-header"><div><Label>Recruiter operations workspace</Label><h1>{title}</h1><p>{subtitle}</p></div><div className="header-actions"><div className="header-chips"><Chip icon={ShieldCheck}>Human review required</Chip><Chip icon={workspaceMode==="private"?LockKeyhole:Sparkles}>{workspaceMode==="private"?"Private workspace":"Demo workspace"}</Chip></div></div></header>
}
function ViewTabs({view,onView}:{view:View;onView:(v:View)=>void}){return <div className="view-tabs">{(view==="Settings"?["Settings" as View]:tabs).map(tab=><button key={tab} className={clsx(view===tab&&"active")} onClick={()=>onView(tab)}>{tab==="Settings"?"Workspace Settings":tab}</button>)}</div>}

function Overview({state,onReview,onInbox,onDraft}:{state:WorkspaceState;onReview:()=>void;onInbox:()=>void;onDraft:()=>void}){
  const metrics=state.dashboardMetrics;
  const totalTriage=Object.values(metrics.triage).reduce((sum,value)=>sum+value,0);
  const activity=[
    {label:"Signals",value:metrics.hiringSignals,tone:"cyan"},
    {label:"Applications",value:metrics.cvApplications,tone:"blue"},
    {label:"Drafts",value:metrics.replyDrafts,tone:"teal"},
    {label:"Review",value:metrics.humanReview,tone:"amber"}
  ];
  const activityMax=Math.max(1,...activity.map(item=>item.value));
  const highEnd=totalTriage?(metrics.triage.highPriority/totalTriage)*100:0;
  const reviewEnd=totalTriage?highEnd+(metrics.triage.needsReview/totalTriage)*100:0;
  const fyiEnd=totalTriage?reviewEnd+(metrics.triage.fyi/totalTriage)*100:0;
  const workflowChart=totalTriage
    ? `conic-gradient(#e9b949 0 ${highEnd}%, #178be5 ${highEnd}% ${reviewEnd}%, #19c9d7 ${reviewEnd}% ${fyiEnd}%, #20c4ad ${fyiEnd}% 100%)`
    : "rgba(104, 128, 142, .18)";
  const kpis:{label:string;value:number;meta:string;Icon:ElementType;tone:string}[]=[
    {label:"Hiring Signals",value:metrics.hiringSignals,meta:metrics.hiringSignals?"Active workflow signals":"No signals yet",Icon:Inbox,tone:"cyan"},
    {label:"CV Applications",value:metrics.cvApplications,meta:`${state.candidates.length} profiles in review`,Icon:FileText,tone:"blue"},
    {label:"Reply Drafts",value:metrics.replyDrafts,meta:`${metrics.priorityDrafts} awaiting approval`,Icon:Send,tone:"teal"},
    {label:"Human Review",value:metrics.humanReview,meta:`${metrics.triage.highPriority} high priority`,Icon:ShieldCheck,tone:"amber"}
  ];
  return <div className="overview-layout">
    <header className="dashboard-heading">
      <div><span>Recruiter operations</span><h1>Dashboard</h1><p>Monitor hiring signals, review queues, and recruiter-controlled actions.</p></div>
      <div className="dashboard-heading-actions"><span className="dashboard-snapshot"><CalendarDays/><span><small>Current snapshot</small><strong>{state.workspaceSettings.demo?"Demo workspace":"Private workspace"}</strong></span></span><Button onClick={onInbox}>Review inbox <ArrowUpRight/></Button></div>
    </header>
    <section className="overview-stats">{kpis.map(({label,value,meta,Icon,tone})=><article className="overview-stat panel" key={label}><div><h2>{label}</h2><strong>{value}</strong><small>{meta}</small></div><span className={clsx("stat-icon",tone)}><Icon/></span></article>)}</section>
    <div className="dashboard-analytics">
      <section className="activity-panel panel">
        <header className="dashboard-panel-head"><div><h2>Hiring activity</h2><span>Current workspace volume</span></div><button type="button"><SlidersHorizontal/> Current data</button></header>
        <div className="activity-chart"><div className="activity-grid" aria-hidden="true"><i/><i/><i/><i/></div><div className="activity-bars">{activity.map(item=><div className="activity-bar-group" key={item.label}><span><i className={item.tone} style={{height:item.value?`${Math.max(10,Math.round(item.value/activityMax*100))}%`:"3px"}}/><b>{item.value}</b></span><small>{item.label}</small></div>)}</div>{activity.every(item=>item.value===0)&&<p className="activity-empty-copy">Activity will appear when workspace data is added.</p>}</div>
      </section>
      <section className="workflow-panel panel">
        <header className="dashboard-panel-head"><div><h2>Workflow status</h2><span>Inbox and review states</span></div><button className="card-link" onClick={onInbox}>Open inbox <ArrowUpRight/></button></header>
        <div className="workflow-status-body"><div className="workflow-donut" style={{background:workflowChart}}><span><strong>{totalTriage}</strong><small>Total items</small></span></div><div className="workflow-legend">{[["High priority",metrics.triage.highPriority,"high"],["Needs review",metrics.triage.needsReview,"review"],["FYI",metrics.triage.fyi,"fyi"],["Completed",metrics.triage.done,"done"]].map(([label,value,tone])=><p key={String(label)}><i className={String(tone)}/><span>{label}</span><strong>{value}</strong></p>)}</div></div>
      </section>
    </div>
    <div className="dashboard-data-row">
      <section className="top-candidates panel">
        <header className="dashboard-panel-head"><div><h2>Top candidates</h2><span>Highest current match scores</span></div><button className="card-link" onClick={onReview}>View all <ArrowUpRight/></button></header>
        <div className={clsx("top-candidate-table",state.candidates.length===0&&"empty")}><div className="top-candidate-head"><span>Candidate</span><span>Match</span><span>Status</span><span/></div>{state.candidates.slice(0,4).map((item,index)=><article key={item.id}><span className="person"><Avatar name={item.name}/><span><strong>{item.name}</strong><small>{item.role} · {item.source}</small></span></span><b>{item.score}%</b><Status tone={item.reviewStatus==="reviewed"?"green":item.reviewStatus==="analyzed"?"blue":"amber"}>{item.reviewStatus==="reviewed"?"Reviewed":item.reviewStatus==="analyzed"?"Analyzed":index===0?"Shortlist":"Review"}</Status><button onClick={onReview} aria-label={`Review ${item.name}`}><ArrowUpRight/></button></article>)}{state.candidates.length===0&&<div className="dashboard-empty"><span><UserCheck/></span><strong>No candidates yet</strong><p>Candidate records will appear after data is imported.</p></div>}</div>
      </section>
      <section className="recent-operations panel">
        <header className="dashboard-panel-head"><div><h2>Recent operations</h2><span>Interview and draft queue</span></div><button className="card-link" onClick={onDraft}>View drafts <ArrowUpRight/></button></header>
        <div className={clsx("operation-list",metrics.queue.length===0&&"empty")}>{metrics.queue.slice(0,4).map((item,index)=><article key={`${item.time}-${item.title}`}><span className={clsx("operation-icon",index%2?"draft":"interview")}>{index%2?<Send/>:<CalendarDays/>}</span><span><strong>{item.title}</strong><small>{item.time} · {item.meta}</small></span><Status tone={item.status==="Reviewed"?"green":item.status==="Ready"?"blue":"amber"}>{item.status}</Status></article>)}{metrics.queue.length===0&&<div className="dashboard-empty"><span><CalendarDays/></span><strong>No recent operations</strong><p>Interview and draft activity will appear here.</p></div>}</div>
      </section>
    </div>
</div>}

function InboxView({items,selected,reviewed,query,onQuery,onSelect,onAnalyze,onDraft,onReviewed,onKeep}:{items:EmailItem[];selected:EmailItem;reviewed:number[];query:string;onQuery:(s:string)=>void;onSelect:(e:EmailItem)=>void;onAnalyze:()=>void;onDraft:()=>void;onReviewed:()=>void;onKeep:()=>void}){
  if(items.length===0) return <WorkspaceEmpty icon={Mail} title="No inbox threads" body="This workspace has no local hiring threads. Gmail remains disconnected."/>;
  return <div className="split-view inbox-triage-grid">
    <section className="list-panel panel inbox-queue">
      <div className="list-toolbar"><div><small>Queue</small><strong>Hiring inbox</strong><em>{items.length} classified threads</em></div><div className="queue-tools"><label><Search/><input value={query} placeholder="Filter" onChange={e=>onQuery(e.target.value)}/></label><button type="button" aria-label="Sort newest first">Newest <ChevronDown/></button></div></div>
      <div className="scroll-list">{items.map(item=><button key={item.id} className={clsx("email-row",selected.id===item.id&&"active")} onClick={()=>onSelect(item)}><span className="queue-avatar"><Avatar name={item.sender}/><i className={item.priority.toLowerCase()}/></span><span><b>{item.sender}<small>{item.time}</small></b><strong>{item.subject}</strong><em>{item.preview}</em><span className="row-tags"><Tag>{item.category}</Tag>{reviewed.includes(item.id)&&<Tag>Reviewed</Tag>}</span></span></button>)}</div>
    </section>
    <section className="detail-panel panel inbox-message">
      <div className="detail-scroll">
        <div className="detail-heading"><div><Status tone={selected.priority==="High"?"amber":"blue"}>{selected.priority} priority</Status><h2>{selected.subject}</h2><p>From {selected.sender} · To Recruitment Team · Today at {selected.time}</p></div><strong>{selected.confidence}%</strong></div>
        <div className="email-tags"><Tag>{selected.category}</Tag><Tag>Confidence {selected.confidence}%</Tag><Tag>{selected.attachment==="No attachment"?"No CV detected":"CV detected"}</Tag><Tag>{selected.attachment==="No attachment"?"No attachment":"1 attachment"}</Tag></div>
        <div className="email-body"><p>Hello Recruitment Team,</p><p>{selected.preview.replace(/\.{3}$/,".")}</p><p>Please let me know if you need further information before the next step.</p></div>
        <div className="reason-card"><Sparkles/><div><strong>AI classification reason</strong><p>{selected.reason}</p></div><Status tone="blue">{selected.confidence}%</Status></div>
      </div>
      <div className="action-bar"><Button onClick={onAnalyze}>Analyze candidate</Button><Button secondary onClick={onDraft}>Generate reply draft</Button><Button quiet onClick={onReviewed}><CheckCircle2/> Mark reviewed</Button><Button quiet onClick={onKeep}>Keep in queue</Button></div>
    </section>
    <aside className="inbox-intelligence panel">
      <div className="inbox-intelligence-scroll">
        <header><span className="intel-mail-icon"><Mail/></span><h2>Message intelligence</h2></header>
        <p className="inbox-section-label">Classification</p>
        <div className="inbox-confidence"><span><small>Confidence</small><strong>{selected.confidence}%</strong></span><Status tone={selected.priority==="High"?"amber":"blue"}>{selected.priority} priority</Status><i><span style={{width:`${selected.confidence}%`}}/></i></div>
        <InfoGrid items={[["Category",selected.category],["CV detected",selected.attachment==="No attachment"?"No":"Yes"],["Attachment",selected.attachment],["Received",selected.time]]}/>
        <IntelBlock title="AI reasoning"><p>{selected.reason}</p></IntelBlock>
        <IntelBlock title="Suggested next step"><div className="suggested-action"><ArrowUpRight/>{selected.category==="CV Application"?"Analyze the candidate profile and verify the extracted evidence.":"Review the message classification before routing it."}</div></IntelBlock>
        <Note>AI-assisted classification requires recruiter verification.</Note>
      </div>
    </aside>
  </div>
}

function CandidateView({items,selected,onSelect,onInterview,onDraft,onReviewed}:{items:Candidate[];selected:Candidate;onSelect:(c:Candidate)=>void;onInterview:()=>void;onDraft:()=>void;onReviewed:()=>void}){
  if(items.length===0) return <WorkspaceEmpty icon={UserCheck} title="No candidates yet" body="Candidate profiles will appear after recruiter-controlled inbox analysis."/>;
  return <div className="candidate-view candidate-review-grid">
    <section className="candidate-table panel"><div className="table-head"><span>Candidate</span><span>Role</span><span>Workflow</span><span>Score</span><span>Recommendation</span><span>Next step</span></div><div className="scroll-list">{items.map(c=>{
      const recommendation=c.reviewStatus==="reviewed"?"reviewed":c.reviewStatus==="analyzed"?"analyzed":c.status;
      return <button className={clsx("candidate-row",selected.id===c.id&&"active")} key={c.id} onClick={()=>onSelect(c)}><span className="person"><Avatar name={c.name}/><strong title={c.name}>{c.name}</strong></span><span title={c.role}>{c.role}</span><span title={c.source}>{c.source}</span><b>{c.score}%</b><Status tone={c.score>=90?"green":"amber"} title={recommendation} ariaLabel={`Recommendation: ${recommendation}`}>{recommendationLabel(recommendation)}</Status><span className="next-step" title={c.reviewStatus==="reviewed"?"Complete":c.score>=90?"Interview kit":"Recruiter review"}>{c.reviewStatus==="reviewed"?"Complete":c.score>=90?"Interview kit":"Recruiter review"}</span></button>
    })}</div></section>
    <section className="candidate-focus panel candidate-intelligence"><div className="candidate-focus-scroll">
      <div className="focus-top"><Avatar name={selected.name} large/><div><h2>{selected.name}</h2><p>{selected.role}</p><small>{selected.source} workflow · {selected.location} · {selected.experience}</small></div><div className="candidate-score"><small>Match score</small><strong>{selected.score}%</strong></div></div>
      <section className="candidate-intel-section"><h3>Summary</h3><p>{selected.summary}</p></section>
      <div className="candidate-skill-grid"><SkillBlock title="Matched skills" items={selected.skills}/><SkillBlock title="Missing skills" items={selected.gaps} warning/></div>
      <div className="candidate-risk"><AlertTriangle/><div><strong>Risk note</strong><p>{selected.risk}</p></div></div>
      <section className="candidate-intel-section"><h3>AI reasoning</h3><p>Current fit is supported by {selected.skills.slice(0,3).join(", ")}. {selected.gaps.length?`Recruiter review should validate ${selected.gaps.join(" and ")} before advancing.`:"No material skill gaps were detected in the current profile."}</p></section>
      <section className="candidate-intel-section"><h3>Suggested next steps</h3><ol><li>Verify profile evidence and the risk note.</li><li>Open the tailored interview kit.</li><li>Prepare a recruiter-controlled reply draft.</li></ol></section>
      <div className="candidate-disclaimer"><ShieldCheck/><div><strong>Human review required</strong><p>This is decision support only. A recruiter must verify the profile before any hiring action.</p></div></div>
    </div><div className="focus-actions"><Button onClick={onInterview}>Open interview kit</Button><Button secondary onClick={onDraft}>Generate reply draft</Button><Button quiet onClick={onReviewed}>Mark reviewed</Button></div></section>
  </div>
}

function InterviewView({items,selected,kit,copied,onSelect,onCopy,onReviewed}:{items:Candidate[];selected:Candidate;kit?:InterviewKit;copied:boolean;onSelect:(c:Candidate)=>void;onCopy:()=>void;onReviewed:()=>void}) {
  const groups=kit?.sections??defaultInterviewSections;
  if(items.length===0) return <WorkspaceEmpty icon={CalendarDays} title="No interview kits yet" body="Private workspaces start empty. Interview kits will appear after candidate review."/>;
  return <div className="kit-view"><aside className="kit-list panel"><ListHeading icon={CalendarDays} title="Interview kits" sub={`${items.length} ready for review`}/><div className="scroll-list">{items.map(c=><button className={clsx("person-row",selected.id===c.id&&"active")} key={c.id} onClick={()=>onSelect(c)}><Avatar name={c.name}/><span><strong>{c.name}</strong><small>{c.role}</small></span></button>)}</div></aside><section className="kit-content panel"><div className="content-head"><div><Status tone={kit?.status==="reviewed"?"blue":"green"}>{kit?.status==="reviewed"?"Reviewed":"Ready for review"}</Status><h2>{selected.name}</h2><p>{selected.role} · generated interview kit</p></div><div className="kit-actions"><Button secondary onClick={onCopy}><Clipboard/> {copied?"Copied":"Copy kit"}</Button><Button quiet onClick={onReviewed}>Mark reviewed</Button></div></div><div className="question-grid scroll-list">{groups.map((group,i)=><article className={`question q${i}`} key={group.title}><span className="question-index">{String(i+1).padStart(2,"0")}</span><strong>{group.title}</strong><ol>{group.questions.map(question=><li key={question}>{question}</li>)}</ol></article>)}</div></section></div>
}

function DraftQueue({drafts,candidates,selected,onSelect}:{drafts:Draft[];candidates:Candidate[];selected:number|null;onSelect:(index:number)=>void}) {
  const times=["09:52","10:24","11:40","12:18","13:36"];
  return <div className="scroll-list">{drafts.map((item,index)=>{
    const candidate=candidates.find(entry=>entry.id===item.candidateId) ?? candidates[0];
    return <button className={clsx("draft-row",selected===index&&"active")} key={item.title} onClick={()=>onSelect(index)}><span><Mail/></span><div><b><strong>{item.title}</strong><time>{times[index]}</time></b><small>{candidate.name} · {item.type}</small><em><i/>Draft only</em></div></button>;
  })}</div>;
}

function DraftsView({
  drafts,
  candidates,
  selected,
  draft,
  variant,
  body,
  copied,
  reviewed,
  generationSettings,
  onSelect,
  onVariant,
  onBody,
  onCopy,
  onReviewed,
  onKeep,
  onRegenerate
}:{drafts:Draft[];candidates:Candidate[];selected:number | null;draft:Draft | null;variant:number;body:string;copied:boolean;reviewed:boolean;generationSettings:RegenerateSettings;onSelect:(n:number)=>void;onVariant:(n:number)=>void;onBody:(body:string)=>void;onCopy:()=>void;onReviewed:()=>void;onKeep:()=>void;onRegenerate:(settings:RegenerateSettings)=>void}){
  const [editing,setEditing]=useState(false);
  const [showRegenerate,setShowRegenerate]=useState(false);
  const [regenerating,setRegenerating]=useState(false);
  const [regenerateError,setRegenerateError]=useState("");
  const [settings,setSettings]=useState<RegenerateSettings>(regenerateDefaults);
  useEffect(()=>{setEditing(false);setShowRegenerate(false);setRegenerating(false);setRegenerateError("");setSettings(generationSettings)},[selected,generationSettings]);

  const submitRegeneration = async (event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(!draft){setRegenerateError("Select a draft before regenerating options.");return}
    setRegenerateError("");
    setRegenerating(true);
    await new Promise(resolve=>window.setTimeout(resolve,650));
    onRegenerate(settings);
    setRegenerating(false);
    setShowRegenerate(false);
    setEditing(false);
  };

  const sourceNote = settings.useSources
    ? "RAG-ready placeholder — company documents are not connected in this demo workspace."
    : "Policy-grounded template generated without connected company documents in this demo workspace.";

  if(!draft){
    return <div className="draft-view">
      <aside className="draft-list panel">
        <ListHeading icon={Send} title="Reply drafts" sub={`${drafts.filter(item=>item.reviewStatus!=="reviewed").length} awaiting review`}/>
        <DraftQueue drafts={drafts} candidates={candidates} selected={selected} onSelect={index=>{setEditing(false);onSelect(index)}}/>
      </aside>
      <section className="draft-editor panel draft-empty">
        <div className="content-head">
          <div>
            <Status tone="amber">Draft only</Status>
            <h2>No draft selected</h2>
            <p>Select a draft from the left list to review, regenerate, or copy a reply.</p>
          </div>
        </div>
        <div className="draft-empty-state">
          <EmptyResults label="Choose a draft to open the regenerate workflow." />
          <div className="draft-empty-note">
            <strong>Safe workflow</strong>
            <p>No send action, no auto-send wording, and human review remains required.</p>
          </div>
        </div>
        <div className="action-bar">
          <Button disabled onClick={onCopy}>Copy selected draft</Button>
          <Button secondary disabled>Edit manually</Button>
          <Button onClick={()=>setShowRegenerate(true)}><RefreshCcw/> Regenerate options</Button>
          <Button quiet disabled onClick={onReviewed}>Mark reviewed</Button>
          <button className="text-action" disabled>Keep as draft</button>
        </div>
      </section>
      {showRegenerate&&<RegenerateModal
        busy={regenerating}
        error={regenerateError}
        settings={settings}
        onChange={setSettings}
        onClose={()=>{setShowRegenerate(false);setRegenerateError("");setSettings(generationSettings)}}
        onSubmit={submitRegeneration}
        selectedTitle="No draft selected"
        sourceNote={sourceNote}
        hasDraft={false}
      />}
    </div>
  }

  const selectedVariant=draft.variants[variant] ?? draft.variants[0];
  const currentVariantIndex=Math.min(variant,draft.variants.length-1);
  return <div className="draft-view">
    <aside className="draft-list panel">
      <ListHeading icon={Send} title="Reply drafts" sub={`${drafts.filter(item=>item.reviewStatus!=="reviewed").length} awaiting review`}/>
      <DraftQueue drafts={drafts} candidates={candidates} selected={selected} onSelect={index=>{setEditing(false);onSelect(index)}}/>
    </aside>
    <section className="draft-editor panel">
      <div className="content-head">
        <div>
          <Status tone={reviewed?"green":"amber"}>{reviewed?"Reviewed":"Draft only"}</Status>
          <h2>{draft.title}</h2>
          <p>Human review required before anything is used.</p>
        </div>
      </div>
      <div className="variant-picker">
        {draft.variants.map((item,index)=><button className={clsx(index===currentVariantIndex&&"active")} key={item.name} onClick={()=>{setEditing(false);onVariant(index)}}>{index===currentVariantIndex&&<Check className="variant-check"/>}<span className="variant-preview-lines"><i/><i/><i/></span><strong>{item.name}</strong><small>{item.description}</small></button>)}
      </div>
      <div className="draft-body scroll-list">
        {editing
          ? <textarea aria-label="Edit selected draft" value={body} onChange={event=>onBody(event.target.value)} />
          : body.split("\n").map((line,i)=><p key={i}>{line||"\u00a0"}</p>)}
        {selectedVariant.policy&&<div className="source-card"><strong>Sources used</strong><div><Tag>Interview Process Guide</Tag><Tag>Offer Communication Policy</Tag><Tag>Benefits FAQ</Tag></div><p>{sourceNote}</p></div>}
      </div>
      <div className="action-bar">
        <Button onClick={onCopy}><Clipboard/>{copied?"Copied":"Copy selected draft"}</Button>
        <Button secondary onClick={()=>setEditing(value=>!value)}>{editing?"Done editing":"Edit manually"}</Button>
        <Button onClick={()=>setShowRegenerate(true)}><RefreshCcw/> Regenerate options</Button>
        <Button quiet onClick={onReviewed}><CheckCircle2/> {reviewed?"Reviewed":"Mark reviewed"}</Button>
        <button className="text-action" onClick={onKeep}>Keep as draft</button>
      </div>
      {showRegenerate&&<RegenerateModal
        busy={regenerating}
        error={regenerateError}
        settings={settings}
        onChange={setSettings}
        onClose={()=>{setShowRegenerate(false);setRegenerateError("");setSettings(generationSettings)}}
        onSubmit={submitRegeneration}
        selectedTitle={draft.title}
        sourceNote={sourceNote}
        hasDraft={true}
      />}
    </section>
  </div>
}

function RegenerateModal({busy,error,settings,onChange,onClose,onSubmit,selectedTitle,sourceNote,hasDraft}:{busy:boolean;error:string;settings:RegenerateSettings;onChange:(value:RegenerateSettings)=>void;onClose:()=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;selectedTitle:string;sourceNote:string;hasDraft:boolean}){
  return <div className="regenerate-backdrop" onClick={onClose}>
    <div className="regenerate-modal panel" onClick={event=>event.stopPropagation()}>
      <div className="regenerate-head">
        <div>
          <Status tone="blue">Draft only</Status>
          <h2>Regenerate reply options</h2>
          <p>Create three recruiter-controlled draft variants for this thread.</p>
        </div>
        <button type="button" className="modal-close" aria-label="Close regenerate modal" onClick={onClose}><X/></button>
      </div>
      <form className="regenerate-form" onSubmit={onSubmit}>
        <div className="regenerate-body">
          <div className="regenerate-grid">
            <label className="regen-purpose">
              <span>Reply purpose</span>
              <select value={settings.purpose} onChange={event=>onChange({...settings,purpose:event.target.value as ReplyPurpose})}>
                <option>Shortlist</option>
                <option>Need more information</option>
                <option>Interview invitation</option>
                <option>Follow-up</option>
                <option>Polite rejection</option>
              </select>
            </label>
            <label className="regen-choice">
              <span>Tone</span>
              <div className="regen-segments">{(["Professional","Warm","Direct","Policy-grounded"] as ReplyTone[]).map(tone=><button type="button" className={clsx(settings.tone===tone&&"active")} key={tone} onClick={()=>onChange({...settings,tone})}>{tone}</button>)}</div>
            </label>
            <label className="regen-choice">
              <span>Length</span>
              <div className="regen-segments">{(["Short","Medium","Detailed"] as ReplyLength[]).map(length=><button type="button" className={clsx(settings.length===length&&"active")} key={length} onClick={()=>onChange({...settings,length})}>{length}</button>)}</div>
            </label>
            <label className="regen-toggle">
              <span>Use policy/RAG sources</span>
              <input type="checkbox" checked={settings.useSources} onChange={event=>onChange({...settings,useSources:event.target.checked})}/>
            </label>
            <label className="regen-instruction">
              <span>Extra instruction</span>
              <textarea value={settings.extraInstruction} onChange={event=>onChange({...settings,extraInstruction:event.target.value})} placeholder="Example: Keep the reply concise and recruiter-controlled." />
            </label>
          </div>
          <div className="regen-note">
            <Sparkles/>
            <p>{hasDraft ? sourceNote : "Select a draft first. This modal stays local and draft-only."}</p>
          </div>
          {error && <div className="regen-error"><AlertTriangle/>{error}</div>}
        </div>
        <div className="regen-actions">
          <Button secondary type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy?"Regenerating options...":"Generate 3 options"}</Button>
        </div>
      </form>
    </div>
  </div>;
}

function Toast({message}:{message:string}){
  return <div className="toast" role="status" aria-live="polite"><CheckCircle2/><span>{message}</span></div>;
}

function GmailMark(){
  return <svg viewBox="0 0 28 22" fill="none" aria-hidden="true">
    <path d="M3 18.5V6.4" stroke="#4285F4" strokeWidth="3.2" strokeLinecap="round"/>
    <path d="M3.6 5.2 14 12.8" stroke="#EA4335" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m14 12.8 10.4-7.6" stroke="#FBBC04" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25 6.4v12.1" stroke="#34A853" strokeWidth="3.2" strokeLinecap="round"/>
  </svg>;
}

type GuardrailKey = "reviewRequired" | "draftOnly" | "noAutoSend";
type StagedRagFile = { id:string; name:string; type:string; size:number; addedAt:string };
type LocalSettings = {
  version: 1;
  guardrails: Record<GuardrailKey,boolean>;
  demoMode: boolean;
  ragFiles: StagedRagFile[];
};

const createDefaultLocalSettings = ():LocalSettings => ({
  version: 1,
  guardrails: {reviewRequired:true,draftOnly:true,noAutoSend:true},
  demoMode: true,
  ragFiles: []
});
const parseStagedRagFiles = (value:unknown):StagedRagFile[] => Array.isArray(value)
  ? value.filter((file):file is StagedRagFile=>Boolean(file&&typeof file.id==="string"&&typeof file.name==="string"&&typeof file.type==="string"&&typeof file.size==="number"&&typeof file.addedAt==="string"))
  : [];

function formatFileSize(bytes:number){
  if(bytes<1024) return `${bytes} B`;
  if(bytes<1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function SettingsView({workspaceMode,token,settings,onExit}:{workspaceMode:WorkspaceMode;token:string;settings:WorkspaceSettingsState;onExit:()=>void}) {
  type SettingsRow = {
    id: string;
    Icon: ElementType;
    title: string;
    body: string;
    state: string;
    tone: "green" | "amber" | "blue";
    iconClass?: string;
    details?: [string,string][];
    tags?: string[];
    upload?: boolean;
    action?: { label:string; disabled?:boolean; onClick?:()=>void };
  };
  const [localSettings,setLocalSettings] = useState<LocalSettings>(createDefaultLocalSettings);
  const [settingsReady,setSettingsReady] = useState(false);
  const [settingsModal,setSettingsModal] = useState<"gmail"|"rag"|null>(null);
  const [isDragging,setIsDragging] = useState(false);
  const [uploadMessage,setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextPersist = useRef(false);
  const isPrivate=workspaceMode==="private";
  const privateRagKey=`hrmind:private-rag:${settings.workspaceId}`;

  useEffect(()=>{
    let active=true;
    setSettingsReady(false);
    const settingsRequest=isPrivate
      ? getPrivateSettings(token).then(parsed=>({
          ...createDefaultLocalSettings(),demoMode:false,
          guardrails:{reviewRequired:parsed.human_review_required,draftOnly:parsed.draft_only,noAutoSend:parsed.no_auto_send},
          ragFiles:parseStagedRagFiles(JSON.parse(localStorage.getItem(privateRagKey)??"[]"))
        }))
      : backend.getSettings<LocalSettings>(createDefaultLocalSettings());
    settingsRequest.then(parsed=>{
      if(!active) return;
      const guardrails=parsed.guardrails as Partial<Record<GuardrailKey,boolean>>|undefined;
      setLocalSettings({
        version:1,
        guardrails:{
          reviewRequired:typeof guardrails?.reviewRequired==="boolean"?guardrails.reviewRequired:true,
          draftOnly:typeof guardrails?.draftOnly==="boolean"?guardrails.draftOnly:true,
          noAutoSend:typeof guardrails?.noAutoSend==="boolean"?guardrails.noAutoSend:true
        },
        demoMode:!isPrivate,
        ragFiles:parseStagedRagFiles(parsed.ragFiles)
      });
    }).catch(()=>{
      if(active) setLocalSettings(createDefaultLocalSettings());
    }).finally(()=>{
      if(active) setSettingsReady(true);
    });
    return ()=>{active=false};
  },[isPrivate,privateRagKey,token]);

  useEffect(()=>{
    if(!settingsReady) return;
    if(skipNextPersist.current){
      skipNextPersist.current=false;
      return;
    }
    if(isPrivate){
      void savePrivateSettings(token,{
        human_review_required:localSettings.guardrails.reviewRequired,
        draft_only:localSettings.guardrails.draftOnly,
        no_auto_send:localSettings.guardrails.noAutoSend,
        no_message_deletion:true
      });
      localStorage.setItem(privateRagKey,JSON.stringify(localSettings.ragFiles));
    }else{
      void backend.saveSettings(localSettings);
      void backend.stageRagSourceMetadata(localSettings.ragFiles);
    }
  },[isPrivate,localSettings,privateRagKey,settingsReady,token]);

  useEffect(()=>{
    if(!settingsModal) return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape") setSettingsModal(null)};
    window.addEventListener("keydown",closeOnEscape);
    return ()=>window.removeEventListener("keydown",closeOnEscape);
  },[settingsModal]);

  const toggleGuardrail=(key:GuardrailKey)=>{
    setLocalSettings(current=>({...current,guardrails:{...current.guardrails,[key]:!current.guardrails[key]}}));
  };
  const handleFiles=(files:FileList|File[])=>{
    const accepted:StagedRagFile[]=[];
    const rejected:string[]=[];
    Array.from(files).forEach((file,index)=>{
      const extension=file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if(![".pdf",".docx",".txt"].includes(extension)){
        rejected.push(`${file.name}: unsupported file type`);
        return;
      }
      if(file.size>20*1024*1024){
        rejected.push(`${file.name}: exceeds 20MB`);
        return;
      }
      accepted.push({
        id:`${Date.now()}-${index}-${file.name}`,
        name:file.name,
        type:file.type||extension.slice(1).toUpperCase(),
        size:file.size,
        addedAt:new Date().toISOString()
      });
    });
    if(accepted.length){
      setLocalSettings(current=>({...current,ragFiles:[...current.ragFiles,...accepted]}));
    }
    setUploadMessage(rejected.length?rejected.join(" · "):accepted.length?`${accepted.length} document${accepted.length===1?"":"s"} staged locally.`:"");
  };
  const resetSettings=()=>{
    skipNextPersist.current=true;
    if(isPrivate){
      localStorage.removeItem(privateRagKey);
      void savePrivateSettings(token,{human_review_required:true,draft_only:true,no_auto_send:true,no_message_deletion:true});
    }else void backend.clearDemoSettings();
    setLocalSettings({...createDefaultLocalSettings(),demoMode:!isPrivate});
    setUploadMessage(`${isPrivate?"Private":"Demo"} settings restored. Local RAG metadata was cleared.`);
  };

  const rows:SettingsRow[]=[
    {id:"workspace",Icon:Building2,title:"Workspace",body:isPrivate?"Private workspace identity and membership.":"Core workspace identity and local demo membership.",details:[["Workspace name",settings.workspaceName],["Workspace ID",settings.workspaceId],["Created",settings.demo?"Demo only":"Private workspace"],["Members","1"]],state:settings.demo?"Demo":"Private",tone:"blue",iconClass:"workspace"},
    {id:"authentication",Icon:LockKeyhole,title:"Authentication",body:isPrivate?"This private workspace is protected by email/password authentication.":"Public demo access does not require an account.",details:[["Session",isPrivate?"Authenticated":"Public visitor"],["Verification",isPrivate?"Email verification not enabled yet":"Not applicable"],["Auth method",isPrivate?"Email and password":"Demo session"],["2FA status","Not enabled"]],state:isPrivate?"Signed in":"Demo only",tone:isPrivate?"green":"amber",iconClass:"auth",action:{label:isPrivate?"Log out":"Exit demo",onClick:onExit}},
    {id:"demo-data",Icon:Inbox,title:isPrivate?"Private Data":"Demo Data",body:isPrivate?"Private data is isolated from the public demo workspace.":"Demo mode is active for public visitors.",details:isPrivate?[["Data source","Private data"],["Current state","Ready for recruiter-controlled data"]]:[["Demo mode","Active"],["Real data","Create a private workspace to use real data."]],state:isPrivate?"Private":"Active",tone:"green",iconClass:"data"},
    {id:"privacy",Icon:ShieldCheck,title:"Privacy & Guardrails",body:"Recruiter-controlled safeguards apply across every workflow.",state:"Required",tone:"green",iconClass:"privacy",tags:["No automatic sending","No message deletion","Human review required","Draft-only replies"]},
    {id:"environment",Icon:FileText,title:"Environment",body:"Frontend and backend foundation prepared for deployment.",details:[["Environment",isPrivate?"Private workspace":"Frontend Demo"],["AI","Not enabled yet"],["Email sending","Disabled"]],state:isPrivate?"Private ready":"Demo ready",tone:"blue",iconClass:"environment"},
    {id:"gmail",Icon:GmailMark,title:"Gmail Readonly Import",body:"Gmail not connected yet. HRMind does not send, delete, relabel, or modify Gmail messages.",state:"Not connected",tone:"amber",iconClass:"gmail",tags:["Readonly only","No automatic email sending","Not connected"],action:{label:"Configure Gmail",onClick:()=>setSettingsModal("gmail")}},
    {id:"rag",Icon:FileText,title:"Knowledge Base / RAG",body:"RAG indexing is not enabled. Document metadata can remain staged locally for this portfolio demo.",state:localSettings.ragFiles.length?"RAG metadata staged locally":isPrivate?"Local staging only":"Not connected in demo",tone:localSettings.ragFiles.length?"green":"blue",iconClass:"rag",tags:["Local-only metadata","No indexing"],upload:true,action:{label:"Configure RAG sources",onClick:()=>setSettingsModal("rag")}}
  ];
  return <div className="settings-page scroll-list"><section className="settings-list">{rows.map(({id,Icon,title,body,state,tone,iconClass,details,tags,upload,action},index)=>{
    const isDemoRow = id==="demo-data";
    const isPrivacyRow = id==="privacy";
    const isGmailRow = id==="gmail";
    const isRagRow = id==="rag";
    return <article className={clsx("settings-row panel",`settings-row-${id}`)} key={title}>
      <span className={clsx("settings-row-icon",iconClass)}><Icon/></span>
      <div className="settings-row-copy">
        <h2>{index+1}. {title}</h2>
        <p>{body}</p>
        {details&&<div className={clsx("settings-details",details.length===1&&"compact")}>{details.map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>}
        {tags&&<div className={clsx("settings-row-tags",isPrivacyRow&&"guardrail-tags",isGmailRow&&"gmail-tags",isRagRow&&"rag-tags")}>{tags.map(tag=><Tag key={tag}>{tag}</Tag>)}</div>}
        {isPrivacyRow&&!localSettings.guardrails.noAutoSend&&<p className="settings-guardrail-warning">{isPrivate?"Private guardrail saved. Email sending remains disabled at the backend.":"Demo guardrail changed locally. Production email sending still requires backend approval."}</p>}
        {upload&&<>
          <button type="button" className={clsx("rag-dropzone",isDragging&&"dragging")} onClick={()=>fileInputRef.current?.click()} onDragEnter={()=>setIsDragging(true)} onDragOver={event=>{event.preventDefault();setIsDragging(true)}} onDragLeave={()=>setIsDragging(false)} onDrop={event=>{event.preventDefault();setIsDragging(false);handleFiles(event.dataTransfer.files)}} aria-label="Upload RAG documents">
            <FileText/><div><strong>Drag and drop files here or click to upload</strong><small>PDF, DOCX, TXT — max 20MB each</small></div>
          </button>
          <input ref={fileInputRef} className="settings-file-input" type="file" accept=".pdf,.docx,.txt" multiple onChange={event=>{if(event.target.files) handleFiles(event.target.files);event.target.value=""}}/>
          {uploadMessage&&<p className={clsx("settings-upload-message",uploadMessage.includes("unsupported")||uploadMessage.includes("exceeds")?"error":"")}>{uploadMessage}</p>}
          {localSettings.ragFiles.length>0&&<div className="settings-files" aria-label="Staged RAG documents">{localSettings.ragFiles.map(file=><article key={file.id}>
            <FileText/>
            <div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · Added {new Date(file.addedAt).toLocaleDateString()}</small></div>
            <Status tone="green">Staged locally</Status>
            <button type="button" onClick={()=>setLocalSettings(current=>({...current,ragFiles:current.ragFiles.filter(item=>item.id!==file.id)}))}>Remove</button>
          </article>)}</div>}
        </>}
      </div>
      <div className={clsx("settings-row-controls",isPrivacyRow&&"stacked",isGmailRow&&"integration",isRagRow&&"integration rag")}>
        {isDemoRow?<Status tone="green">{isPrivate?"Private data":"Demo mode active"}</Status>:isPrivacyRow?<div className="guardrail-toggles" aria-label="Privacy and guardrail settings">
          {([["reviewRequired","Review"],["draftOnly","Draft only"],["noAutoSend","No send"]] as [GuardrailKey,string][]).map(([key,label])=><button type="button" key={key} className={clsx(!localSettings.guardrails[key]&&"off")} aria-pressed={localSettings.guardrails[key]} disabled={!settingsReady} onClick={()=>toggleGuardrail(key)}><i/><span>{label}</span></button>)}
        </div>:<Status tone={tone}>{state}</Status>}
        {action&&<Button secondary disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>}
      </div>
    </article>;
  })}
    <div className="settings-reset"><button type="button" onClick={resetSettings} disabled={!settingsReady}><RefreshCcw/>Reset {isPrivate?"private":"demo"} settings</button><span>{isPrivate?"Private guardrails return to safe defaults; staged RAG metadata remains local-only.":"Only local Settings preferences and staged RAG metadata will be cleared."}</span></div>
  </section>
  {settingsModal&&<div className="settings-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSettingsModal(null)}}>
    <section className="settings-modal panel" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="settings-modal-head">
        <span className={clsx("settings-modal-icon",settingsModal==="gmail"&&"gmail")}>{settingsModal==="gmail"?<GmailMark/>:<FileText/>}</span>
        <div>
          <h2 id="settings-modal-title">{settingsModal==="gmail"?"Gmail readonly import":"Configure Knowledge Base / RAG"}</h2>
          <p>{settingsModal==="gmail"?"Gmail is not connected yet. HRMind will not send, delete, relabel, or modify emails.":"Documents remain local-only metadata. RAG indexing and retrieval are not enabled yet."}</p>
        </div>
        <button type="button" className="modal-close" aria-label="Close settings modal" onClick={()=>setSettingsModal(null)}><X/></button>
      </div>
      <div className="settings-modal-body">
        {settingsModal==="gmail"?<div className="settings-modal-status"><small>Status</small><Status tone="amber">Not connected in demo</Status></div>:<>
          <div className="settings-modal-facts"><div><small>Accepted file types</small><strong>PDF, DOCX, TXT</strong></div><div><small>Current staged files</small><strong>{localSettings.ragFiles.length}</strong></div></div>
          <p className="settings-modal-note">Files remain local metadata only. No document indexing or retrieval is active.</p>
        </>}
      </div>
      <div className="settings-modal-actions">
        <Button secondary onClick={()=>setSettingsModal(null)}>Close</Button>
        {settingsModal==="rag"&&<Button onClick={()=>fileInputRef.current?.click()}>Upload documents</Button>}
      </div>
    </section>
  </div>}
  </div>
}

function ContextIntelligence({view,candidate,email,draft,variant,reviewed,kitCopied,draftCopied,draftBody,generationSettings,onAnalyze,onInterview,onDraft,onCopyKit,onCopyDraft,onReviewed,onKeep}:{view:View;candidate:Candidate;email:EmailItem;draft:Draft | null;variant:number;reviewed:boolean;kitCopied:boolean;draftCopied:boolean;draftBody:string;generationSettings:RegenerateSettings;onAnalyze:()=>void;onInterview:()=>void;onDraft:()=>void;onCopyKit:()=>void;onCopyDraft:()=>void;onReviewed:()=>void;onKeep:()=>void}){
  if(view==="Inbox Triage") return <IntelligenceShell title="Email Classification" actions={<>{email.category==="CV Application"&&<Button onClick={onAnalyze}>Analyze candidate</Button>}<Button secondary={email.category==="CV Application"} onClick={onDraft}>Generate reply draft</Button><Button quiet onClick={onReviewed}>{reviewed&&<Check/>}{reviewed?"Reviewed":"Mark reviewed"}</Button><Button quiet onClick={onKeep}>Keep in queue</Button></>}><div className="intel-email-heading"><span className="intel-mail-icon"><Mail/></span><div><h2>{email.subject}</h2><p>From {email.sender}</p></div></div><div className="intel-score"><div><small>Classification confidence</small><strong>{email.confidence}%</strong></div><Status tone={email.priority==="High"?"amber":"blue"}>{email.priority} priority</Status><span className="confidence-track" aria-hidden="true"><i style={{width:`${email.confidence}%`}}/></span></div><InfoGrid items={[["Category",email.category],["CV detected",email.attachment==="No attachment"?"No":"Yes"],["Attachment",email.attachment],["Received",email.time]]}/><IntelBlock title="AI reason"><p>{email.reason}</p></IntelBlock><IntelBlock title="Suggested action"><div className="suggested-action"><ArrowUpRight/>Analyze the candidate profile and route it into the relevant hiring workflow.</div></IntelBlock><Note>Classification is AI-assisted. Recruiter should verify before routing.</Note></IntelligenceShell>;

  if(view==="Candidate Review") return <IntelligenceShell title="Candidate Fit Intelligence" actions={<><Button onClick={onInterview}>Open interview kit</Button><Button secondary onClick={onDraft}>Generate reply draft</Button><Button quiet onClick={onReviewed}>{reviewed&&<Check/>}{reviewed?"Reviewed":"Mark reviewed"}</Button></>}><div className="intel-person"><Avatar name={candidate.name} large/><div><h2>{candidate.name}</h2><p>{candidate.role}</p></div></div><div className="intel-score match-score"><div><small>Match score</small><strong>{candidate.score}%</strong></div><Status tone={candidate.score>=90?"green":"amber"}>{candidate.status}</Status><span className="match-track" aria-hidden="true"><i style={{width:`${candidate.score}%`}}/></span></div><IntelBlock title="Skills summary"><div className="tags">{candidate.skills.map(skill=><Tag key={skill}>{skill}</Tag>)}{candidate.gaps.map(skill=><Tag warning key={skill}>{skill}</Tag>)}</div></IntelBlock><IntelBlock title="AI reasoning"><p>{candidate.summary}</p></IntelBlock><IntelBlock title="Suggested next steps"><ol className="intel-next-steps"><li>Verify the risk note and profile evidence.</li><li>Open the tailored interview kit.</li><li>Prepare a recruiter-controlled reply draft.</li></ol></IntelBlock><Note>Shortlist suggestion only. Human review is required.</Note></IntelligenceShell>;

  if(view==="Interview Kits") return <IntelligenceShell title="Interview Kit Status" actions={<><Button onClick={onCopyKit}><Clipboard/>{kitCopied?"Copied":"Copy kit"}</Button><Button secondary onClick={onReviewed}>{reviewed?"Reviewed":"Mark reviewed"}</Button><Button quiet disabled>Download PDF</Button></>}><div className="intel-person"><Avatar name={candidate.name} large/><div><h2>{candidate.name}</h2><p>{candidate.role}</p></div></div><div className="kit-meta"><div><small>Prepared on</small><strong>Today</strong></div><div><small>Reviewed status</small><strong>{reviewed?"Reviewed":"Pending review"}</strong></div></div><div className="kit-completeness"><span><strong>Completeness</strong><b>100%</b></span><i><em/></i></div><IntelBlock title="Sections checklist"><div className="kit-checklist">{["Technical questions","Behavioral questions","Role-fit questions","Red flags & signals","What to listen for"].map(item=><p key={item}><CheckCircle2/>{item}</p>)}</div></IntelBlock><IntelBlock title="Recruiter notes"><div className="kit-notes-placeholder">Add recruiter notes after reviewing the kit.</div></IntelBlock><Note>Recruiter should verify every question before screening.</Note></IntelligenceShell>;

  const selectedVariant = draft?.variants[variant] ?? null;
  if(!draft){
    return <IntelligenceShell title="Draft Review" actions={<><Button disabled onClick={onCopyDraft}><Clipboard/> Copy selected draft</Button><Button secondary disabled onClick={onReviewed}>Mark reviewed</Button><Button quiet disabled onClick={onKeep}>Keep as draft</Button></>}><div className="intel-empty"><Status tone="amber">Draft only</Status><h2>No draft selected</h2><p>Choose a draft from the left list to inspect the selected variant, regenerate options, or copy text.</p></div><Note>Safe workflow stays local. No sending, no auto-send, and human review is still required.</Note></IntelligenceShell>
  }
  return <IntelligenceShell title="Draft Review" actions={<><Button onClick={onCopyDraft}><Clipboard/>{draftCopied?"Copied":"Copy selected draft"}</Button><Button secondary onClick={onReviewed}>{reviewed?"Reviewed":"Mark reviewed"}</Button><Button quiet onClick={onKeep}>Keep as draft</Button></>}><div className="intel-person"><Avatar name={candidate.name} large/><div><h2>{draft.title}</h2><p>{candidate.name} · {candidate.role}</p></div></div><div className="intel-score"><div><small>Selected variant</small><strong className="draft-type">{selectedVariant?.name ?? "Short Professional"}</strong></div><Status tone={reviewed?"green":"amber"}>{reviewed?"Reviewed":"Draft only"}</Status></div><IntelBlock title="Draft status"><div className="draft-status"><Mail/>Local draft only · never auto-sent</div></IntelBlock><IntelBlock title="Review status"><div className="draft-status"><ShieldCheck/>{reviewed?"Reviewed and kept in review history":"Human review required before use"}</div></IntelBlock><IntelBlock title="RAG / source status"><p>{selectedVariant?.policy?"RAG-ready placeholder — company documents are not connected in this demo workspace.":"No policy sources used for this variant."}</p></IntelBlock><IntelBlock title="Risk note"><div className="risk"><AlertTriangle/>{candidate.risk}</div></IntelBlock><Note>HRMind does not send email automatically. Copy only after recruiter approval.</Note></IntelligenceShell>
}

function IntelligenceShell({title,children,actions}:{title:string;children:ReactNode;actions:ReactNode}){return <aside className="intelligence-panel"><div className="intelligence-scroll"><Label>✦ {title}</Label>{children}</div><div className="intel-actions">{actions}</div></aside>}
function ContextEmpty(){return <aside className="intelligence-panel"><div className="intelligence-scroll"><Label>✦ Workspace status</Label><div className="intel-empty"><Status tone="blue">No local data</Status><h2>Nothing selected</h2><p>This workspace is ready for recruiter-controlled data when integrations are configured.</p></div><Note>Gmail is not connected and no data is inferred.</Note></div></aside>}

function Pipeline({total,onView}:{total:number;onView:()=>void}){return <section className="pipeline panel"><PanelTitle eyebrow="Hiring signal movement" title="Candidate Pipeline"><button className="card-link" onClick={onView}>View pipeline <ArrowUpRight/></button></PanelTitle><div className="pipeline-content"><div className="pipeline-total"><strong>{total}</strong><span><b>Total Candidates</b><small>{total?"+14% vs last 7 days":"No candidate data yet"}</small></span></div><div className="chart"><svg viewBox="0 0 600 105" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity=".38"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/></linearGradient></defs><path d="M0 86 C70 78 90 40 155 62 S260 92 320 43 S430 75 495 32 S555 24 600 15 L600 105 L0 105 Z" fill="url(#area)"/><path d="M0 86 C70 78 90 40 155 62 S260 92 320 43 S430 75 495 32 S555 24 600 15" fill="none" stroke="#0ea5e9" strokeWidth="3"/><circle cx="495" cy="32" r="5" fill="#fff" stroke="#0284c7" strokeWidth="3"/></svg></div><div className="chart-labels">{["Apr 22","Apr 29","May 6","May 13","May 20"].map(label=><span key={label}>{label}</span>)}</div></div></section>}

function InfoGrid({items}:{items:[string,string][]}){return <div className="info-grid">{items.map(x=><div key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong></div>)}</div>}
function SkillBlock({title,items,warning}:{title:string;items:string[];warning?:boolean}){return <div className="skill-block"><strong>{title}</strong><div className="tags">{items.map(x=><Tag warning={warning} key={x}>{x}</Tag>)}</div></div>}
function IntelBlock({title,children}:{title:string;children:ReactNode}){return <div className="intel-block"><strong>{title}</strong>{children}</div>}
function PanelTitle({eyebrow,title,children}:{eyebrow:string;title:string;children?:ReactNode}){return <div className="panel-title"><div><small>{eyebrow}</small><h2>{title}</h2></div>{children}</div>}
function Signal({icon:Icon,label,className}:{icon:ElementType;label:string;className:string}){return <div className={clsx("signal",className)}><Icon/><span>{label}</span><Check/></div>}
function ListHeading({icon:Icon,title,sub}:{icon:ElementType;title:string;sub:string}){return <div className="list-heading"><Icon/><span><strong>{title}</strong><small>{sub}</small></span></div>}
function Label({children}:{children:ReactNode}){return <p className="label">{children}</p>}
function Avatar({name,large}:{name:string;large?:boolean}){return <span className={clsx("avatar",large&&"large")}>{name.split(" ").map(x=>x[0]).join("").slice(0,2)}</span>}
function Tag({children,warning}:{children:ReactNode;warning?:boolean}){return <span className={clsx("tag",warning&&"warning")}>{children}</span>}
function recommendationLabel(value:string){
  return ({"shortlist suggestion":"Shortlist","needs recruiter review":"Review","human review required":"Human review","draft only":"Draft only"} as Record<string,string>)[value]??value;
}
function Status({children,tone,title,ariaLabel}:{children:ReactNode;tone:"green"|"amber"|"blue";title?:string;ariaLabel?:string}){return <span className={clsx("status",tone)} title={title} aria-label={ariaLabel}>{children}</span>}
function Chip({icon:Icon,children}:{icon:ElementType;children:ReactNode}){return <span className="header-chip"><Icon/>{children}</span>}
function Note({children}:{children:ReactNode}){return <div className="note"><ShieldCheck/><p>{children}</p></div>}
function EmptyResults({label}:{label:string}){return <div className="empty-results"><Search/><p>{label}</p></div>}
function WorkspaceEmpty({icon:Icon,title,body}:{icon:ElementType;title:string;body:string}){return <section className="workspace-empty panel"><span><Icon/></span><h2>{title}</h2><p>{body}</p><small>Local workspace data only · no connected Gmail data</small></section>}
function Button({children,secondary,quiet,onClick,disabled,type}:{children:ReactNode;secondary?:boolean;quiet?:boolean;onClick?:()=>void;disabled?:boolean;type?:"button"|"submit"}){
  return <button type={type ?? "button"} className={clsx("button",secondary&&"secondary",quiet&&"quiet")} onClick={onClick} disabled={disabled}>{children}</button>
}
function IconButton({label,children,onClick}:{label:string;children:ReactNode;onClick?:()=>void}){return <button className="nav-icon" aria-label={label} onClick={onClick}>{children}</button>}
