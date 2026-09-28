// lane.js：标签写入与轮转找人
export function putTagOf(tags, worker, tag) {
  const rows = (tags || []).map(function (row) { return [row[0], row[1].slice()]; });
  let hit = null;
  for (const row of rows) { if (row[0] === worker) { hit = row; break; } }
  if (!hit) { hit = [worker, []]; rows.push(hit); }
  if (hit[1].indexOf(tag) === -1) hit[1].push(tag);
  hit[1].sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  return rows;
}

export function pickOf(tags, tag, after) {
  const names = (tags || []).map(function (row) { return row[0]; })
    .sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  const ordered = names.filter(function (n) { return n > after; })
    .concat(names.filter(function (n) { return n <= after; }));
  for (const name of ordered) {
    const row = (tags || []).find(function (r) { return r[0] === name; });
    if (row && row[1].indexOf(tag) !== -1) return name;
  }
  return "";
}
