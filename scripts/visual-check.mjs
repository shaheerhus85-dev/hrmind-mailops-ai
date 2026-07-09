import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
  args: ["--disable-gpu"]
});

const authPage = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
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

await page.getByRole("button", { name: "Drafts", exact: true }).click();
await page.locator(".draft-view").waitFor({ state: "visible" });
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/reply-drafts.png", fullPage: false });
await page.getByRole("button", { name: /policy grounded/i }).click();
await page.getByRole("button", { name: /regenerate options/i }).first().click();
await page.locator(".regenerate-modal").waitFor({ state: "visible" });
await page.screenshot({ path: "artifacts/regenerate-modal.png", fullPage: false });

const draftMetrics = await page.evaluate(() => ({
  documentWidth: document.documentElement.scrollWidth,
  documentHeight: document.documentElement.scrollHeight,
  draftPanelCount: document.querySelectorAll(".draft-list, .draft-editor, .intelligence-panel").length,
  modalVisible: Boolean(document.querySelector(".regenerate-modal"))
}));

await page.getByRole("button", { name: /close regenerate modal/i }).click();
await page.locator(".rail-settings").click();
await page.locator(".settings-page").waitFor({ state: "visible" });
await page.locator(".settings-page").evaluate(element => {
  element.scrollTop = 0;
});
await page.waitForTimeout(150);
await page.screenshot({ path: "artifacts/settings.png", fullPage: false });
await page.screenshot({ path: "artifacts/settings-top-1366x768.png", fullPage: false });

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
settingsFunctionalChecks.gmailModal = await gmailDialog.getByText("Not connected in demo").isVisible();
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

await browser.close();

console.log(JSON.stringify({ publicDemoChecks, overviewMetrics, draftMetrics, settingsMetrics, settingsFunctionalChecks, viewportChecks, consoleErrors }, null, 2));
