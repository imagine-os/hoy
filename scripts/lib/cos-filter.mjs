// A Company OS `/query` filter played on a fake record `{ id, data }` (integration guide §4, "Filters"), for the test
// fakes. Operators: eq neq in gt gte lt lte contains is_null is_not_null; nodes and / or / { all: true }; `{ $me: true }`
// as a value is the caller's user id. Anything else throws (status 400), as Company OS answers an unknown operator, so a
// fake never quietly matches every row.
const bad = (why) => Object.assign(new Error(why), { status: 400, code: 'invalid_query' });
const present = (v) => v !== undefined && v !== null && v !== '';

export function cosFilter(rec, f, me = null) {
  if (f == null) return true;
  if (typeof f !== 'object') throw bad('filter is not an object');
  if (f.all === true) return true;
  if (Array.isArray(f.and)) return f.and.every((x) => cosFilter(rec, x, me));
  if (Array.isArray(f.or)) return f.or.some((x) => cosFilter(rec, x, me));
  if (typeof f.field !== 'string') throw bad('filter without a field');
  const v = f.field === 'id' ? rec.id : f.field === 'created_by' ? rec.createdBy : rec.data?.[f.field];
  const want = f.value && typeof f.value === 'object' && !Array.isArray(f.value) && f.value.$me === true ? me : f.value;
  switch (f.op) {
    case 'eq': return v === want;
    case 'neq': return v !== want;
    // A single value counts as a one-item list; values compare as strings; an empty or missing field never matches.
    case 'in': return present(v) && (Array.isArray(want) ? want : [want]).map(String).includes(String(v));
    case 'gt': return present(v) && v > want;
    case 'gte': return present(v) && v >= want;
    case 'lt': return present(v) && v < want;
    case 'lte': return present(v) && v <= want;
    case 'contains': return typeof v === 'string' && typeof want === 'string' && v.toLowerCase().includes(want.toLowerCase());
    case 'is_null': return v == null;
    case 'is_not_null': return v != null;
    default: throw bad(`unknown filter operator ${String(f.op)}`);
  }
}
