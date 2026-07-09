import { apiAdapter, backendApiConfigured } from "@/lib/backend/apiAdapter";
import { demoAdapter } from "@/lib/backend/demoAdapter";
import { firebaseConfigured } from "@/lib/firebase";

export const PRIVATE_WORKSPACE_UNAVAILABLE_MESSAGE =
  "Private workspaces are coming next. Continue with demo workspace for now.";

export const backend=backendApiConfigured ? apiAdapter : demoAdapter;

export const backendAvailability={
  provider:backend.kind,
  apiConfigPresent:backendApiConfigured,
  firebaseConfigPresent:firebaseConfigured,
  privateWorkspacesConnected:backend.privateWorkspacesConnected
} as const;

export type { BackendAdapter, BackendDataSource, BackendKind } from "@/lib/backend/types";
