// lanerun.js：按处理预算处理并留账，收尾不限预算把账做完
import { putTagOf, pickOf } from "./lane.js";

function code(spec, name, fallback) {
  const value = spec && spec[name];
  return typeof value === "string" && value ? value : fallback;
}

function fail(spec, name, fallback, message) {
  const error = new Error(message);
  error.code = code(spec, name, fallback);
  throw error;
}

function cloneState(state) {
  const source = state || {};
  return {
    tags: (source.tags || []).map(function (row) { return [row[0], row[1].slice()]; }),
    next: source.next || "",
    assign: (source.assign || []).map(function (row) { return [row[0], row[1]]; }),
    ledger: (source.ledger || []).map(function (row) { return row.slice(); }),
    applied: (source.applied || []).slice()
  };
}

function nonEmptyText(value) {
  return typeof value === "string" && value.length > 0;
}

function positiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isTagEvent(item) {
  return item && typeof item === "object" && item.kind === "tag";
}

function isSubmitEvent(item) {
  return item && typeof item === "object" && item.kind === "submit";
}

// 事件 -> 账上四元组：tag 为 [kind, worker, tag, null]，submit 为 [kind, null, tag, task]
function toTuple(item) {
  if (Array.isArray(item)) { return item.slice(); }
  if (isSubmitEvent(item)) {
    return ["submit", null, item.tag, item.task];
  }
  if (isTagEvent(item)) {
    return ["tag", item.worker, item.tag, null];
  }
  return [item && item.kind, item && item.worker, item && item.tag, item && item.task];
}

function tupleToEvent(row) {
  if (row[0] === "submit") { return { kind: "submit", task: row[3], tag: row[2] }; }
  if (row[0] === "tag") { return { kind: "tag", worker: row[1], tag: row[2] }; }
  return { kind: row[0], worker: row[1], tag: row[2], task: row[3] };
}

function keyOf(item) {
  if (Array.isArray(item)) {
    return item[0] === "submit" ? "task:" + item[3] : "tag:" + item[1] + ":" + item[2];
  }
  if (isSubmitEvent(item)) { return "task:" + item.task; }
  if (isTagEvent(item)) { return "tag:" + item.worker + ":" + item.tag; }
  return null;
}

function validate(spec, event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(spec, "event_error_code", "E_BAD_EVENT", "事件必须是对象");
  }
  if (isTagEvent(event)) {
    if (!nonEmptyText(event.worker)) {
      fail(spec, "bad_worker_code", "E_BAD_WORKER", "工作者名不能为空");
    }
    if (!nonEmptyText(event.tag)) {
      fail(spec, "bad_tag_code", "E_BAD_TAG", "标签不能为空");
    }
  } else if (isSubmitEvent(event)) {
    if (!nonEmptyText(event.tag)) {
      fail(spec, "bad_tag_code", "E_BAD_TAG", "标签不能为空");
    }
    if (!positiveInteger(event.task)) {
      fail(spec, "bad_task_code", "E_BAD_TASK", "任务号必须是正整数");
    }
  } else {
    fail(spec, "event_error_code", "E_BAD_EVENT", "不认识的事件类型");
  }
}

function run(spec, unlimited) {
  const state = cloneState(spec.state);
  const cap = unlimited ? Infinity : Math.max(0, Math.floor(Number(spec.budget) || 0));
  const events = Array.isArray(spec.events) ? spec.events : [];

  // 先清旧账，再处理新事件；预算用尽后整条剩余序列原样压回账上
  const queue = state.ledger
    .map(function (row) { return tupleToEvent(row); })
    .concat(events.map(toTuple).map(tupleToEvent));
  const bound = queue.length;
  state.ledger = [];

  let served = 0;
  let judged = 0;
  let exhausted = false;

  for (const raw of queue) {
    if (exhausted) { state.ledger.push(toTuple(raw)); continue; }
    const key = keyOf(raw);
    if (key !== null && state.applied.indexOf(key) !== -1) { continue; }
    judged += 1;
    validate(spec, raw);

    if (isTagEvent(raw)) {
      const row = state.tags.find(function (item) { return item[0] === raw.worker; });
      if (row && row[1].indexOf(raw.tag) !== -1) {
        fail(spec, "dup_tag_code", "E_DUP_TAG", "同一工作者重复贴同一标签");
      }
      state.tags = putTagOf(state.tags, raw.worker, raw.tag);
    } else {
      if (state.assign.some(function (item) { return item[0] === raw.task; })) {
        fail(spec, "dup_task_code", "E_DUP_TASK", "同一任务号重复提交");
      }
      const worker = pickOf(state.tags, raw.tag, state.next);
      if (!worker) {
        fail(spec, "no_worker_code", "E_NO_WORKER", "没有工作者带所需标签");
      }
      state.next = worker;
      state.assign.push([raw.task, worker]);
    }

    state.applied.push(key);
    served += 1;
    if (!unlimited && served >= cap) { exhausted = true; }
  }

  return { state: state, served: served, judged: judged, judged_bound: bound };
}

export function step(spec) {
  const result = run(spec, false);
  return {
    state: result.state,
    served: result.served,
    ledger_before: result.state.ledger.length,
    ledger: result.state.ledger.map(function (row) { return row.slice(); }),
    judged: result.judged,
    judged_bound: result.judged_bound
  };
}

export function close(spec) {
  const result = run(spec, true);
  return { state: result.state, catchup: result.served };
}
