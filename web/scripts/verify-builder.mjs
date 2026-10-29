/** Focused browser regression; accepts an existing Playwright Page (no new deps).
 * Run in an isolated browser profile, e.g. via Playwright MCP browser_run_code.
 * This authors test drafts in that profile only. It does not run a paid model.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Loaded as the entry function by Playwright MCP's filename option.
async function verifyBuilder(page, baseUrl = "http://localhost:3001") {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  await page.goto(`${baseUrl}/playground`);
  const agent = page.locator('.react-flow__node[data-id="node_agent"]');
  await agent.waitFor({ state: "visible" });

  // True held-pointer drag. Inspect after intermediate moves while still held,
  // not just before/after the gesture (which missed the original vanish bug).
  const before = await agent.evaluate((node) => node.style.transform);
  const bounds = await agent.boundingBox();
  await page.mouse.move(bounds.x + 40, bounds.y + 25);
  await page.mouse.down();
  const drag = [];
  try {
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(bounds.x + 40 + i * 6, bounds.y + 25 + i * 2);
      drag.push(await agent.evaluate((node) => ({
        visible: getComputedStyle(node).visibility === "visible",
        dragging: node.classList.contains("dragging"), transform: node.style.transform,
      })));
    }
  } finally { await page.mouse.up(); }
  check(drag.every((sample) => sample.visible && sample.dragging), "Node hidden or drag not engaged mid-gesture");
  check(new Set(drag.map((sample) => sample.transform)).size > 3, "Drag did not move through intermediate positions");
  const dropped = await agent.evaluate((node) => node.style.transform);
  check(before !== dropped, "Drag did not commit");

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.waitForFunction((expected) => document.querySelector('[data-id="node_agent"]').style.transform === expected, before);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.waitForFunction((expected) => document.querySelector('[data-id="node_agent"]').style.transform === expected, dropped);
  await page.waitForFunction(() => {
    const graph = JSON.parse(localStorage.getItem("legible.builder.graph-draft.v2") || "null");
    const position = graph?.nodes.find((node) => node.id === "node_agent")?.position;
    const transform = document.querySelector('[data-id="node_agent"]').style.transform;
    const coords = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    return position && coords && Math.abs(position.x - Number(coords[1])) < 0.01 && Math.abs(position.y - Number(coords[2])) < 0.01;
  });

  await agent.click({ position: { x: 40, y: 25 } });
  await page.getByRole("button", { name: "Duplicate node", exact: true }).click();
  check(await page.locator(".react-flow__node").count() === 7, "Duplicate missing");
  check((await page.getByRole("complementary", { name: "Agent details" }).innerText()).includes("unreachable"), "Duplicate validation reason missing");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  check(await page.locator(".react-flow__node").count() === 6, "Duplicate undo failed");

  await page.getByRole("button", { name: "Edit branch label yes", exact: true }).click();
  await page.getByRole("textbox", { name: "Branch label", exact: true }).fill("approved");
  await page.getByRole("textbox", { name: "Branch label", exact: true }).press("Escape");
  check(await page.getByRole("button", { name: "Edit branch label yes", exact: true }).count() === 1, "Escape did not cancel label edit");
  await page.getByRole("button", { name: "Edit branch label yes", exact: true }).click();
  await page.getByRole("textbox", { name: "Branch label", exact: true }).fill("approved");
  await page.getByRole("textbox", { name: "Branch label", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Edit branch label approved", exact: true }).waitFor();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Edit branch label yes", exact: true }).waitFor();

  const name = page.getByRole("textbox", { name: "Workflow name", exact: true });
  const originalName = await name.inputValue();
  await name.fill("Grouped name");
  await name.press("End");
  await name.pressSequentially(" edit");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  check(await name.inputValue() === originalName, "Text session was not grouped into one undo");

  const picker = page.getByRole("combobox", { name: "New workflow from template" });
  page.once("dialog", (dialog) => dialog.dismiss());
  await picker.selectOption("blank");
  check(await page.locator(".react-flow__node").count() === 6, "Cancelled template replaced work");
  page.once("dialog", (dialog) => dialog.accept());
  await picker.selectOption("blank");
  check(await page.locator(".react-flow__node").count() === 2, "Blank template failed");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await agent.waitFor({ state: "visible" });
  check(await name.inputValue() === originalName, "Template undo lost graph metadata");

  // Connectivity retries must not create runs or request credentials.
  let starts = 0, tokens = 0;
  const requests = (request) => {
    if (request.method() === "POST" && request.url().endsWith("/runs")) starts++;
    if (request.url().endsWith("/api/playground/token")) tokens++;
  };
  page.on("request", requests);
  await page.route("**/healthz", (route) => route.abort());
  try {
    await page.getByRole("button", { name: "Run workflow", exact: true }).click();
    await page.getByRole("button", { name: "Retry connection", exact: true }).waitFor();
    await page.getByRole("button", { name: "Retry connection", exact: true }).click();
    await page.getByRole("button", { name: "Retry connection", exact: true }).waitFor({ state: "visible" });
    check(starts === 0 && tokens === 0, "Connectivity retries created a run or minted a token");
  } finally {
    await page.unroute("**/healthz");
    page.off("request", requests);
  }
  return { dragSamples: drag.length, hiddenFrames: drag.filter((sample) => !sample.visible).length,
    checks: ["held drag", "drop persistence", "drag undo/redo", "duplicate validation/undo", "label commit/cancel/undo", "text grouping", "template confirmation/undo", "offline retry without creation"] };
}
