import { chromium } from "playwright-core";

const key = "hrmind:demoWorkspace:v1";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript(() => {
  window.sessionStorage.setItem("hrmind-demo-workspace", "true");
});

const readState = () => page.evaluate(storageKey => JSON.parse(window.localStorage.getItem(storageKey) ?? "null"), key);
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.evaluate(storageKey => window.localStorage.removeItem(storageKey), key);
await page.reload({ waitUntil: "networkidle" });
await page.locator(".overview-layout").waitFor();

await page.getByRole("button", { name: "Inbox", exact: true }).click();
await page.locator(".split-view").waitFor();
await page.locator(".detail-panel").getByRole("button", { name: /mark reviewed/i }).click();
await page.getByText("Marked reviewed", { exact: true }).waitFor();
await page.waitForFunction(storageKey => JSON.parse(localStorage.getItem(storageKey)).inboxThreads[0].status === "reviewed", key);

let state = await readState();
expect(state.dashboardMetrics.humanReview === 20, "Human review metric did not decrease.");
expect(state.reviewActions.some(action => action.type === "marked reviewed" && action.entityType === "thread"), "Inbox review activity was not recorded.");

await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Inbox", exact: true }).click();
await page.locator(".email-row").first().getByText("Reviewed", { exact: true }).waitFor();

await page.locator(".detail-panel").getByRole("button", { name: /analyze candidate/i }).click();
await page.locator(".candidate-view").waitFor();
await page.getByText("Candidate routed to review", { exact: true }).waitFor();

await page.getByRole("button", { name: "Inbox", exact: true }).click();
await page.locator(".detail-panel").getByRole("button", { name: /generate reply draft/i }).click();
await page.locator(".draft-view").waitFor();
await page.getByRole("button", { name: /warm detailed/i }).click();
await page.waitForFunction(storageKey => JSON.parse(localStorage.getItem(storageKey)).replyDrafts[0].selectedVariant === 1, key);
await page.locator(".draft-editor").getByRole("button", { name: /copy selected draft/i }).click();
await page.getByText("Draft copied", { exact: true }).waitFor();

await page.locator(".draft-editor").getByRole("button", { name: /regenerate options/i }).click();
await page.locator(".regenerate-modal").getByRole("button", { name: /generate 3 options/i }).click();
await page.getByText("Reply options regenerated", { exact: true }).waitFor();
await page.waitForFunction(storageKey => JSON.parse(localStorage.getItem(storageKey)).reviewActions.some(action => action.type === "regenerated options"), key);
await page.locator(".draft-editor").getByRole("button", { name: /mark reviewed/i }).click();
await page.getByText("Marked reviewed", { exact: true }).waitFor();

await page.getByRole("button", { name: "Candidates", exact: true }).click();
await page.locator(".candidate-focus").getByRole("button", { name: /mark reviewed/i }).click();
await page.getByText("Marked reviewed", { exact: true }).waitFor();
await page.locator(".candidate-focus").getByRole("button", { name: /open interview kit/i }).click();
await page.locator(".kit-view").waitFor();
await page.locator(".kit-content").getByRole("button", { name: /copy kit/i }).click();
await page.getByText("Interview kit copied", { exact: true }).waitFor();
await page.locator(".kit-content").getByRole("button", { name: /mark reviewed/i }).click();
await page.getByText("Marked reviewed", { exact: true }).waitFor();

await page.getByRole("button", { name: "Inbox", exact: true }).click();
await page.locator(".email-row").nth(1).click();
await page.locator(".detail-panel").getByRole("button", { name: /keep in queue/i }).click();
await page.getByText("Kept in queue", { exact: true }).waitFor();

await page.reload({ waitUntil: "networkidle" });
state = await readState();
expect(state.inboxThreads[0].status === "reviewed", "Inbox review did not persist after refresh.");
expect(state.candidates[0].reviewStatus === "reviewed", "Candidate review did not persist after refresh.");
expect(state.replyDrafts[0].selectedVariant === 1, "Selected draft variant did not persist.");
expect(state.replyDrafts[0].variants.length === 3, "Regenerated draft variants did not persist.");
expect(state.replyDrafts[0].reviewStatus === "reviewed", "Draft review status did not persist.");
expect(state.interviewKits[0].status === "reviewed", "Interview kit review status did not persist.");
expect(state.inboxThreads[1].status === "queued", "Keep-in-queue status did not persist.");
expect(state.dashboardMetrics.priorityCandidates === 11, "Candidate dashboard metric did not update.");
expect(state.dashboardMetrics.replyDrafts === 57, "Draft dashboard metric did not update.");
expect(state.reviewActions.length >= 7, "Review activity history is incomplete.");

console.log(JSON.stringify({
  persisted: true,
  storageKey: key,
  humanReview: state.dashboardMetrics.humanReview,
  priorityCandidates: state.dashboardMetrics.priorityCandidates,
  selectedVariant: state.replyDrafts[0].selectedVariant,
  reviewActions: state.reviewActions.length
}, null, 2));

await browser.close();
