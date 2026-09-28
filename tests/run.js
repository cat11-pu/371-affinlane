import assert from "node:assert";
import { putTagOf, pickOf } from "../lane.js";
import { step, close } from "../lanerun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { tags: [], next: "", assign: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "tag", worker: "x", tag: "fast" }],
  bad_worker_code: "E_BAD_WORKER", bad_tag_code: "E_BAD_TAG",
  dup_tag_code: "E_DUP_TAG", bad_task_code: "E_BAD_TASK",
  dup_task_code: "E_DUP_TASK", no_worker_code: "E_NO_WORKER",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("putTagOf returns a list", () => {
  assert.ok(Array.isArray(putTagOf([], "x", "a")));
});

check("pickOf returns text", () => {
  assert.strictEqual(typeof pickOf([["x", ["a"]]], "a", ""), "string");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
