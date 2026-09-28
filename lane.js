// lane.js：标签写入与轮转找人
export function putTagOf(tags, worker, tag) {
  const next = tags.map(function (row) { return [row[0], row[1].slice()]; });
  let row = next.find(function (item) { return item[0] === worker; });
  if (!row) {
    row = [worker, []];
    next.push(row);
  }
  row[1].push(tag);
  row[1].sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  next.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  return next;
}

export function pickOf(tags, tag, after) {
  const names = tags.map(function (row) { return row[0]; }).sort(function (a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  });
  let start = 0;
  if (after) {
    const found = names.findIndex(function (name) { return name > after; });
    start = found === -1 ? 0 : found;
  }
  const total = names.length;
  for (let stepIndex = 0; stepIndex < total; stepIndex += 1) {
    const name = names[(start + stepIndex) % total];
    const row = tags.find(function (item) { return item[0] === name; });
    if (row[1].indexOf(tag) !== -1) { return name; }
  }
  return "";
}
