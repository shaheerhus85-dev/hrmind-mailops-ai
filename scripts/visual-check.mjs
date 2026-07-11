import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts/phase-8b2-review", { recursive: true });
await mkdir("artifacts/phase-8b3-review", { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
  args: ["--disable-gpu"]
});

const authPage = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
await authPage.route("**/api/**", route => route.abort());
await authPage.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60_000 });
await authPage.locator(".auth-shell").waitFor({ state: "visible" });
const publicDemoChecks = {
  opensOnOnboarding: await authPage.locator(".auth-shell").isVisible(),
  demoActionVisible: await authPage.getByRole("button", { name: /continue with demo workspace/i }).isVisible(),
  privateActionVisible: await authPage.getByRole("button", { name: /create private workspace \/ login/i }).isVisible()
};
await authPage.screenshot({ path: "artifacts/auth-screen.png", fullPage: false });
await authPage.getByRole("button", { name: /continue with demo workspace/i }).click();
await authPage.locator(".overview-layout").waitFor({ state: "visible" });
publicDemoChecks.continueDemoOpensDashboard = true;
await authPage.reload({ waitUntil: "domcontentloaded" });
await authPage.locator(".overview-layout").waitFor({ state: "visible" });
publicDemoChecks.refreshKeepsDemo = true;
await authPage.locator(".profile-chip").click();
await authPage.locator(".auth-shell").waitFor({ state: "visible" });
publicDemoChecks.exitReturnsToOnboarding = await authPage.evaluate(() => localStorage.getItem("hrmind:demo-session:v1") === null);
await authPage.close();

const iconPage = await browser.newPage({ viewport: { width: 160, height: 160 }, deviceScaleFactor: 2 });
await iconPage.goto("http://localhost:3000/icon.svg", { waitUntil: "domcontentloaded", timeout: 60_000 });
await iconPage.locator("svg").waitFor({ state: "visible" });
await iconPage.screenshot({ path: "artifacts/app-icon.png", fullPage: false, omitBackground: true });
await iconPage.close();

const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
await page.route("**/api/**", route => route.abort());
await page.emulateMedia({ reducedMotion: "reduce" });
await page.addInitScript(() => window.localStorage.setItem("hrmind:demo-session:v1", "true"));
const consoleErrors = [];
page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(3000);
await page.locator(".overview-layout").waitFor({ state: "visible" });
await page.screenshot({ path: "artifacts/dashboard-overview-top.png", fullPage: false });
await page.screenshot({ path: "artifacts/phase-8b3-review/final-dashboard.png", fullPage: false });
await page.locator(".left-rail").screenshot({ path: "artifacts/dashboard-sidebar.png" });

const overviewMetrics = await page.evaluate(() => ({
  viewport: { width: window.innerWidth, height: window.innerHeight },
  documentWidth: document.documentElement.scrollWidth,
  documentHeight: document.documentElement.scrollHeight,
  canvasWidth: document.querySelector(".overview-layout")?.getBoundingClientRect().width,
  canvasHeight: document.querySelector(".overview-layout")?.getBoundingClientRect().height,
  scrollArea: (() => {
    const element = document.querySelector(".overview-workspace .view-canvas");
    return element ? { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight } : null;
  })()
}));

await page.locator(".overview-workspace .view-canvas").evaluate(element => {
  element.scrollTop = element.scrollHeight;
});
await page.waitForTimeout(150);
await page.screenshot({ path: "artifacts/dashboard-overview-lower.png", fullPage: false });

await page.getByRole("button", { name: "Inbox", exact: true }).click();
await page.locator(".split-view").waitFor({ state: "visible" });
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/inbox.png", fullPage: false });

await page.getByRole("button", { name: "Candidates", exact: true }).click();
await page.locator(".candidate-view").waitFor({ state: "visible" });
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/candidate-review.png", fullPage: false });

await page.getByRole("button", { name: "Interviews", exact: true }).click();
await page.locator(".kit-view").waitFor({ state: "visible" });
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/interview-kits.png", fullPage: false });
await page.screenshot({ path: "artifacts/phase-8b2-review/interview-kits.png", fullPage: false });

const workflowFunctionalChecks = {};
await page.locator(".kit-list .person-row").nth(1).click();
workflowFunctionalChecks.interviewSelection = await page.locator(".kit-content .content-head").getByText("Omar Siddiqui", { exact: true }).isVisible();
await page.locator(".kit-list .person-row").first().click();
workflowFunctionalChecks.singleKitCopyAction = await page.getByRole("button", { name: /copy kit/i }).count() === 1;
await page.getByRole("button", { name: /copy kit/i }).click();
await page.getByText("Interview kit copied", { exact: true }).waitFor({ state: "visible" });
workflowFunctionalChecks.copyKit = true;
await page.locator(".kit-content").getByRole("button", { name: /mark reviewed/i }).click();
await page.getByText("Marked reviewed", { exact: true }).waitFor({ state: "visible" });
workflowFunctionalChecks.reviewKit = true;

await page.getByRole("button", { name: "Drafts", exact: true }).click();
await page.locator(".draft-view").waitFor({ state: "visible" });
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/reply-drafts.png", fullPage: false });
await page.screenshot({ path: "artifacts/phase-8b2-review/reply-drafts.png", fullPage: false });
await page.locator(".draft-list .draft-row").nth(1).click();
workflowFunctionalChecks.draftSelection = await page.locator(".draft-editor .content-head").getByText("Additional information request", { exact: true }).isVisible();
await page.locator(".draft-list .draft-row").first().click();
await page.getByRole("button", { name: /warm detailed/i }).click();
workflowFunctionalChecks.variantSwitching = await page.getByRole("button", { name: /warm detailed/i }).evaluate(element => element.classList.contains("active"));
workflowFunctionalChecks.singleDraftCopyAction = await page.getByRole("button", { name: /copy selected draft/i }).count() === 1;
await page.locator(".draft-editor").getByRole("button", { name: /copy selected draft/i }).click();
await page.getByText("Draft copied", { exact: true }).waitFor({ state: "visible" });
workflowFunctionalChecks.copyDraft = true;
await page.getByRole("button", { name: "Edit manually", exact: true }).click();
workflowFunctionalChecks.editDraft = await page.getByRole("textbox", { name: "Edit selected draft" }).isVisible();
await page.getByRole("button", { name: "Done editing", exact: true }).click();
await page.getByRole("button", { name: "Keep as draft", exact: true }).click();
await page.getByText("Kept as draft", { exact: true }).waitFor({ state: "visible" });
workflowFunctionalChecks.keepDraft = true;
await page.getByRole("button", { name: /policy grounded/i }).click();
await page.getByRole("button", { name: /regenerate options/i }).first().click();
await page.locator(".regenerate-modal").waitFor({ state: "visible" });
await page.screenshot({ path: "artifacts/regenerate-modal.png", fullPage: false });
workflowFunctionalChecks.regenerateModal = true;

workflowFunctionalChecks.noClippedWorkflowButtons = await page.evaluate(() =>
  [...document.querySelectorAll(".kit-actions .button, .status-panel-footer .button, .draft-editor .action-bar .button")].every(button => {
    const buttonRect = button.getBoundingClientRect();
    const panelRect = button.closest(".panel")?.getBoundingClientRect();
    return panelRect && buttonRect.left >= panelRect.left && buttonRect.right <= panelRect.right && buttonRect.top >= panelRect.top && buttonRect.bottom <= panelRect.bottom;
  })
);

const draftMetrics = await page.evaluate(() => ({
  documentWidth: document.documentElement.scrollWidth,
  documentHeight: document.documentElement.scrollHeight,
  draftPanelCount: document.querySelectorAll(".draft-list, .draft-editor, .draft-review-panel").length,
  modalVisible: Boolean(document.querySelector(".regenerate-modal"))
}));

await page.getByRole("button", { name: /close regenerate modal/i }).click();
await page.locator(".rail-settings").click();
await page.locator(".settings-page").waitFor({ state: "visible" });
await page.waitForTimeout(2200);
await page.locator(".settings-page").evaluate(element => {
  element.scrollTop = 0;
});
await page.waitForTimeout(150);
await page.screenshot({ path: "artifacts/settings.png", fullPage: false });
await page.screenshot({ path: "artifacts/settings-top-1366x768.png", fullPage: false });
await page.screenshot({ path: "artifacts/phase-8b3-review/demo-settings-top.png", fullPage: false });

const settingsMetrics = await page.evaluate(() => {
  const scroller = document.querySelector(".settings-page");
  const lastRow = document.querySelector(".settings-row-rag");
  return {
    documentWidth: document.documentElement.scrollWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollArea: scroller ? { clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight } : null,
    rowCount: document.querySelectorAll(".settings-row").length,
    lastRowWidth: lastRow?.getBoundingClientRect().width
  };
});

await page.locator(".settings-page").evaluate(element => {
  element.scrollTop = element.scrollHeight;
});
await page.setViewportSize({ width: 1365, height: 768 });
await page.waitForTimeout(50);
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(150);
await page.screenshot({ type: "png", fullPage: false });
await page.screenshot({ path: "artifacts/settings-bottom-1366x768.png", fullPage: false });
await page.screenshot({ path: "artifacts/phase-8b3-review/demo-settings-bottom.png", fullPage: false });

const settingsFunctionalChecks = {};
for (const label of ["Review", "Draft only", "No send"]) {
  const toggle = page.getByRole("button", { name: label, exact: true });
  await toggle.click();
  settingsFunctionalChecks[`${label} toggles`] = await toggle.getAttribute("aria-pressed") === "false";
  if (label !== "No send") await toggle.click();
}
settingsFunctionalChecks.noSendWarning = await page.getByText("Demo guardrail changed locally. Production email sending still requires backend approval.").isVisible();

settingsFunctionalChecks.demoStatus = await page.getByText("Demo mode is active for public visitors.", { exact: true }).isVisible();
settingsFunctionalChecks.realDataNotice = await page.getByText("Create a private workspace to use real data.", { exact: true }).isVisible();
settingsFunctionalChecks.noDemoToggle = await page.getByRole("button", { name: /demo mode:/i }).count() === 0;

await page.getByRole("button", { name: "Configure Gmail", exact: true }).click();
const gmailDialog = page.getByRole("dialog", { name: "Gmail readonly import" });
await gmailDialog.waitFor({ state: "visible" });
settingsFunctionalChecks.gmailModal = await gmailDialog.getByText("Not connected", { exact: true }).isVisible();
await gmailDialog.getByRole("button", { name: "Close", exact: true }).click();

await page.getByRole("button", { name: "Configure RAG sources", exact: true }).click();
const ragDialog = page.getByRole("dialog", { name: "Configure Knowledge Base / RAG" });
await ragDialog.waitFor({ state: "visible" });
const fileChooserPromise = page.waitForEvent("filechooser");
await ragDialog.getByRole("button", { name: "Upload documents", exact: true }).click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles({ name: "employee-policy.pdf", mimeType: "application/pdf", buffer: Buffer.from("Local demo policy") });
await page.getByText("employee-policy.pdf", { exact: true }).waitFor({ state: "visible" });
settingsFunctionalChecks.filePicker = true;
settingsFunctionalChecks.ragStatus = await page.locator(".settings-row-rag .settings-row-controls").getByText("RAG metadata staged locally", { exact: true }).isVisible();
await page.waitForFunction(() => {
  const value = window.localStorage.getItem("hrmind:settings:v1");
  if (!value) return false;
  const parsed = JSON.parse(value);
  return parsed.guardrails.noAutoSend === false && parsed.demoMode === true && parsed.ragFiles?.[0]?.name === "employee-policy.pdf";
});
settingsFunctionalChecks.localStorage = true;
await ragDialog.getByRole("button", { name: "Close", exact: true }).click();

await page.reload({ waitUntil: "domcontentloaded" });
await page.locator(".overview-layout").waitFor({ state: "visible" });
await page.locator(".rail-settings").click();
await page.locator(".settings-page").waitFor({ state: "visible" });
settingsFunctionalChecks.refreshPersistence =
  await page.getByRole("button", { name: "No send", exact: true }).getAttribute("aria-pressed") === "false"
  && await page.getByText("Demo mode is active for public visitors.", { exact: true }).isVisible()
  && await page.getByText("employee-policy.pdf", { exact: true }).isVisible();

await page.getByRole("button", { name: "Remove", exact: true }).click();
await page.getByText("employee-policy.pdf", { exact: true }).waitFor({ state: "detached" });
settingsFunctionalChecks.removeFile = true;

const dropzone = page.getByRole("button", { name: "Upload RAG documents", exact: true });
await dropzone.evaluate(element => {
  const transfer = new DataTransfer();
  transfer.items.add(new File(["Local handbook"], "recruiting-handbook.txt", { type: "text/plain" }));
  element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
});
await page.getByText("recruiting-handbook.txt", { exact: true }).waitFor({ state: "visible" });
settingsFunctionalChecks.dragDrop = true;
await page.locator(".settings-page").evaluate(element => {
  element.scrollTop = element.scrollHeight;
});
await page.setViewportSize({ width: 1365, height: 768 });
await page.waitForTimeout(50);
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(150);
await page.screenshot({ type: "png", fullPage: false });
await page.screenshot({ path: "artifacts/settings-rag-staged-1366x768.png", fullPage: false });
await page.screenshot({ path: "artifacts/phase-8b3-review/rag-staged-file.png", fullPage: false });

await page.getByRole("button", { name: "Reset demo settings", exact: true }).click();
await page.waitForTimeout(50);
settingsFunctionalChecks.reset = await page.evaluate(() => window.localStorage.getItem("hrmind:settings:v1") === null);
settingsFunctionalChecks.resetClearsRag = await page.getByText("recruiting-handbook.txt", { exact: true }).count() === 0;
settingsFunctionalChecks.resetRestoresGuardrails = await page.getByRole("button", { name: "No send", exact: true }).getAttribute("aria-pressed") === "true";

const destinations = [
  ["Dashboard", ".overview-layout"],
  ["Inbox", ".split-view"],
  ["Candidates", ".candidate-view"],
  ["Interviews", ".kit-view"],
  ["Settings", ".settings-page"]
];
for (const [name, selector] of destinations) {
  if (name === "Settings") await page.locator(".rail-settings").click();
  else await page.getByRole("button", { name, exact: true }).click();
  await page.locator(selector).waitFor({ state: "visible" });
}

const viewportChecks = [];
for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(150);
  viewportChecks.push(await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    documentWidth: document.documentElement.scrollWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  })));
}

if (process.env.QA_PRIVATE_CAPTURE === "1") {
  const privatePage = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  await privatePage.emulateMedia({ reducedMotion: "reduce" });
  const privateUser = { id: "user_private_qa", email: "private@example.com", name: "Private Recruiter", role: "owner", is_verified: true, created_at: new Date().toISOString() };
  const privateWorkspace = { id: "workspace_private_qa", owner_user_id: privateUser.id, name: "Private workspace", mode: "private", created_at: new Date().toISOString() };
  let privateSettings = { demo_mode: false, human_review_required: true, draft_only: true, no_auto_send: true, no_message_deletion: true };
  await privatePage.addInitScript(({ user, workspace }) => {
    localStorage.removeItem("hrmind:demo-session:v1");
    localStorage.setItem("hrmind:private-session:v1", JSON.stringify({ accessToken: "qa-private-token", expiresAt: Date.now() + 3_600_000, user, workspace }));
  }, { user: privateUser, workspace: privateWorkspace });
  await privatePage.route("**/api/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    let body = pathname.endsWith("/auth/me") ? privateUser : pathname.endsWith("/workspaces/me") ? privateWorkspace : [];
    if (pathname.endsWith("/private/settings")) {
      if (route.request().method() === "PATCH") privateSettings = { ...privateSettings, ...route.request().postDataJSON() };
      body = privateSettings;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await privatePage.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60_000 });
  await privatePage.locator(".overview-layout").waitFor({ state: "visible" });
  await privatePage.getByRole("button", { name: "Interviews", exact: true }).click();
  await privatePage.getByText("No interview kits yet", { exact: true }).waitFor({ state: "visible" });
  await privatePage.screenshot({ path: "artifacts/phase-8b2-review/private-interview-empty.png", fullPage: false });
  workflowFunctionalChecks.privateInterviewEmpty = await privatePage.getByText("Interview kits will appear after candidate review.", { exact: true }).isVisible();
  await privatePage.getByRole("button", { name: "Drafts", exact: true }).click();
  await privatePage.getByText("No reply drafts yet", { exact: true }).waitFor({ state: "visible" });
  await privatePage.screenshot({ path: "artifacts/phase-8b2-review/private-draft-empty.png", fullPage: false });
  workflowFunctionalChecks.privateDraftEmpty = await privatePage.getByText("Reviewed draft options will appear here.", { exact: true }).isVisible();
  await privatePage.locator(".rail-settings").click();
  await privatePage.locator(".settings-page").waitFor({ state: "visible" });
  await privatePage.getByText("private@example.com", { exact: true }).waitFor({ state: "visible" });
  await privatePage.screenshot({ path: "artifacts/phase-8b3-review/private-settings.png", fullPage: false });
  settingsFunctionalChecks.privateIdentity = await privatePage.getByText("Private workspace", { exact: true }).first().isVisible() && await privatePage.getByText("private@example.com", { exact: true }).isVisible();
  settingsFunctionalChecks.privateDisconnectedStates = await privatePage.getByText("Not connected / indexed", { exact: true }).isVisible() && await privatePage.getByText("Readonly only", { exact: true }).isVisible();
  await privatePage.getByRole("button", { name: "No send", exact: true }).click();
  await privatePage.waitForFunction(() => document.querySelector('button[aria-label="No send"]')?.getAttribute("aria-pressed") === "false");
  await privatePage.reload({ waitUntil: "networkidle" });
  await privatePage.locator(".overview-layout").waitFor({ state: "visible" });
  await privatePage.locator(".rail-settings").click();
  await privatePage.locator(".settings-page").waitFor({ state: "visible" });
  settingsFunctionalChecks.privateGuardrailPersistence = await privatePage.getByRole("button", { name: "No send", exact: true }).getAttribute("aria-pressed") === "false";
  settingsFunctionalChecks.demoPrivateSeparation = await privatePage.evaluate(() => localStorage.getItem("hrmind:settings:v1") === null);
  await privatePage.close();
}

await browser.close();

console.log(JSON.stringify({ publicDemoChecks, overviewMetrics, draftMetrics, workflowFunctionalChecks, settingsMetrics, settingsFunctionalChecks, viewportChecks, consoleErrors }, null, 2));
