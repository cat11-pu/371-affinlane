// lanerun.js：按处理预算处理并留账
import { putTagOf, pickOf } from "./lane.js";

function fail(spec, key, fallback) {
  const error = new Error(fallback);
  error.code = (spec && spec[key]) || fallback;
  throw error;
}

function copyState(src) {
  const state = src || {};
  return {
    tags: (state.tags || []).map(function (row) { return [row[0], row[1].slice()]; }),
    next: state.next || "",
    assign: (state.assign || []).map(function (row) { return [row[0], row[1]]; }),
    ledger: (state.ledger || []).map(function (entry) { return entry.slice(); }),
    applied: (state.applied || []).slice()
  };
}

function normalize(item) {
  if (Array.isArray(item)) {
    return { kind: item[0], worker: item[1], tag: item[2], task: item[3] };
  }
  return item;
}

function toLedgerEntry(ev) {
  return [ev && ev.kind != null ? ev.kind : null,
          ev && ev.worker != null ? ev.worker : null,
          ev && ev.tag != null ? ev.tag : null,
          ev && ev.task != null ? ev.task : null];
}

function checkEvent(spec, ev) {
  if (!ev || typeof ev !== "object" || Array.isArray(ev)) fail(spec, "event_error_code", "E_BAD_EVENT");
  if (ev.kind !== "tag" && ev.kind !== "submit") fail(spec, "event_error_code", "E_BAD_EVENT");
  if (ev.kind === "tag") {
    if (typeof ev.worker !== "string" || ev.worker === "") fail(spec, "bad_worker_code", "E_BAD_WORKER");
    if (typeof ev.tag !== "string" || ev.tag === "") fail(spec, "bad_tag_code", "E_BAD_TAG");
  } else {
    if (typeof ev.tag !== "string" || ev.tag === "") fail(spec, "bad_tag_code", "E_BAD_TAG");
    if (typeof ev.task !== "number" || !Number.isInteger(ev.task) || ev.task <= 0) fail(spec, "bad_task_code", "E_BAD_TASK");
  }
}

function applyEvent(spec, state, ev) {
  checkEvent(spec, ev);
  if (ev.kind === "tag") {
    const row = state.tags.find(function (r) { return r[0] === ev.worker; });
    if (row && row[1].indexOf(ev.tag) !== -1) fail(spec, "dup_tag_code", "E_DUP_TAG");
    state.tags = putTagOf(state.tags, ev.worker, ev.tag);
  } else {
    if (state.assign.some(function (r) { return r[0] === ev.task; })) fail(spec, "dup_task_code", "E_DUP_TASK");
    const worker = pickOf(state.tags, ev.tag, state.next);
    if (worker === "") fail(spec, "no_worker_code", "E_NO_WORKER");
    state.assign.push([ev.task, worker]);
    state.next = worker;
  }
}

export function step(spec) {
  const state = copyState(spec && spec.state);
  const events = (spec && spec.events) || [];
  let budget = spec && typeof spec.budget === "number" ? spec.budget : 0;
  const judged_bound = budget;
  let served = 0;
  const items = state.ledger.concat(events);
  state.ledger = [];
  for (const item of items) {
    const ev = normalize(item);
    const id = ev && typeof ev === "object" && !Array.isArray(ev) ? ev.id : undefined;
    if (id != null && state.applied.indexOf(id) !== -1) continue;
    if (budget <= 0) {
      state.ledger.push(toLedgerEntry(ev));
      if (id != null) state.applied.push(id);
      continue;
    }
    budget -= 1;
    applyEvent(spec, state, ev);
    served += 1;
    if (id != null) state.applied.push(id);
  }
  return { state: state, served: served, ledger_before: state.ledger.length,
           ledger: state.ledger, judged: served, judged_bound: judged_bound };
}

export function close(spec) {
  const state = copyState(spec && spec.state);
  let catchup = 0;
  const items = state.ledger;
  state.ledger = [];
  for (const item of items) {
    applyEvent(spec, state, normalize(item));
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
