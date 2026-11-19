import assert from "node:assert/strict";
import test from "node:test";

import {
  RequestValidationError,
  STORAGE_KEY,
  appendRequest,
  createRequest,
  loadRequests,
  saveRequests,
  requestView,
  saveManagerUpdate,
  needsReview,
} from "../src/request-store.js";

const validInput = {
  requester: "  Jordan Lee  ",
  department: "Operations",
  equipment: "  Laptop  ",
  neededBy: "2026-09-15",
  reason: "  Replace a failed field computer.  ",
};

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

test("createRequest trims input and adds system fields", () => {
  const request = createRequest(validInput, {
    id: "request-1",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  assert.deepEqual(request, {
    id: "request-1",
    requester: "Jordan Lee",
    department: "Operations",
    equipment: "Laptop",
    priority: "Normal",
    status: "Pending",
    neededBy: "2026-09-15",
    reason: "Replace a failed field computer.",
    createdAt: "2026-08-17T12:00:00.000Z",
  });
});

test("createRequest reports missing required fields", () => {
  assert.throws(
    () => createRequest({ ...validInput, requester: "", equipment: " " }),
    (error) => {
      assert.ok(error instanceof RequestValidationError);
      assert.deepEqual(Object.keys(error.errors), ["requester", "equipment"]);
      return true;
    },
  );
});

test("appendRequest returns a new list with the newest request first", () => {
  const original = [{ id: "old" }];
  const result = appendRequest(original, { id: "new" });

  assert.deepEqual(result.map((request) => request.id), ["new", "old"]);
  assert.deepEqual(original.map((request) => request.id), ["old"]);
});

test("saveRequests and loadRequests round-trip valid records", () => {
  const storage = new MemoryStorage();
  const request = createRequest(validInput, {
    id: "request-2",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });

  saveRequests([request], storage);

  assert.deepEqual(loadRequests(storage), [request]);
});

test("loadRequests refuses damaged stored data so it cannot be overwritten", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "not-json");

  assert.throws(() => loadRequests(storage));
  assert.equal(storage.getItem(STORAGE_KEY), "not-json");
});

test("createRequest preserves each supported priority", () => {
  for (const priority of ["Low", "Normal", "High"]) {
    assert.equal(createRequest({ ...validInput, priority }).priority, priority);
  }
});

test("createRequest rejects unsupported priorities", () => {
  for (const priority of ["Urgent", "", null]) {
    assert.throws(
      () => createRequest({ ...validInput, priority }),
      (error) => {
        assert.ok(error instanceof RequestValidationError);
        assert.deepEqual(Object.keys(error.errors), ["priority"]);
        return true;
      },
    );
  }
});

test("stored priorities survive saving and reloading", () => {
  const storage = new MemoryStorage();
  const requests = ["Low", "Normal", "High"].map((priority) =>
    createRequest({ ...validInput, priority }),
  );
  saveRequests(requests, storage);
  assert.deepEqual(loadRequests(storage), requests);
});

test("older requests without priority remain intact for manager review", () => {
  const storage = new MemoryStorage();
  const legacy = createRequest(validInput, {
    id: "legacy",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });
  delete legacy.priority;
  storage.setItem(STORAGE_KEY, JSON.stringify([legacy]));

  const loaded = loadRequests(storage);
  assert.deepEqual(loaded, [legacy]);
  assert.equal(needsReview(loaded[0]), true);
  saveRequests(loaded, storage);
  assert.deepEqual(loadRequests(storage), loaded);
});

function record(id, priority = "High", createdAt = "2026-10-18T12:00:00Z", status = "Pending") {
  return { ...createRequest(validInput), id, priority, createdAt, status };
}

test("views filter both statuses, order by date then priority, and keep ties stable (AC 1-3)", () => {
  const requests = [record("low", "Low"), record("high-1"), record("normal", "Normal"),
    record("high-2"), record("new-low", "Low", "2026-10-19"),
    record("done", "High", "2026-10-20", "Completed"), record("old", "High", "2026-10-01")];
  const original = structuredClone(requests);
  assert.deepEqual(requestView(requests).pending.map((r) => r.id), ["new-low", "high-1", "high-2", "normal", "low", "old"]);
  assert.deepEqual(requestView(requests).completed.map((r) => r.id), ["done"]);
  for (const priority of ["High", "Normal", "Low"]) {
    const view = requestView(requests, priority);
    assert.ok([...view.pending, ...view.completed].every((r) => r.priority === priority));
  }
  assert.deepEqual(requests, original);
});

test("missing/invalid fields are preserved and reviewed once regardless of filter (AC 5, 11)", () => {
  const storage = new MemoryStorage();
  const requests = [record("missing", undefined), record("unknown", "Urgent"),
    record("date"), record("bad-date", "Normal", "not a date"), record("both", "", "")];
  delete requests[0].priority;
  delete requests[2].createdAt;
  requests[0].extra = { keep: true };
  saveRequests(requests, storage);
  const raw = storage.getItem(STORAGE_KEY);
  const loaded = loadRequests(storage);
  assert.deepEqual(loaded, requests);
  for (const filter of ["All Priorities", "High", "Normal", "Low"]) {
    const view = requestView(loaded, filter);
    assert.equal(view.review.length, 5);
    assert.equal(view.pending.length + view.completed.length, 0);
  }
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});

test("approval requires all invalid fields, persists corrections, and preserves other data (AC 6-8, 11)", () => {
  const storage = new MemoryStorage();
  const original = [record("bad", "Urgent", "bad"), record("untouched", "Low")];
  saveRequests(original, storage);
  assert.throws(() => saveManagerUpdate(original, 0, { priority: "High" }, storage));
  assert.deepEqual(loadRequests(storage), original);
  const statusOnly = saveManagerUpdate(original, 0, { status: "Completed" }, storage);
  assert.equal(requestView(statusOnly).review.length, 1);
  const changes = { priority: "Normal", createdAt: "2026-10-17T13:00:00Z" };
  const updated = saveManagerUpdate(statusOnly, 0, changes, storage);
  assert.deepEqual(updated, [{ ...original[0], status: "Completed", ...changes }, original[1]]);
  assert.equal(requestView(updated, "High").completed.length, 0);
  assert.equal(requestView(updated, "Normal").completed.length, 1);
  assert.equal(requestView(updated).review.length, 0);
  assert.deepEqual(loadRequests(storage), updated);
  assert.equal(original[0].priority, "Urgent");
});

test("completion and reopening persist only status; requester cannot assign it (AC 14-15)", () => {
  const storage = new MemoryStorage();
  assert.equal(createRequest({ ...validInput, status: "Completed" }).status, "Pending");
  const original = [record("open")];
  const completed = saveManagerUpdate(original, 0, { status: "Completed" }, storage);
  assert.deepEqual(completed, [{ ...original[0], status: "Completed" }]);
  assert.equal(requestView(loadRequests(storage), "High").completed.length, 1);
  const reopened = saveManagerUpdate(completed, 0, { status: "Pending" }, storage);
  assert.deepEqual(reopened, original);
  assert.equal(requestView(loadRequests(storage)).pending.length, 1);
  assert.throws(() => saveManagerUpdate(original, 0, { status: "Other" }, storage));
  assert.throws(() => saveManagerUpdate(original, 0, { requester: "Changed" }, storage));
});

test("failed saves leave original data and sections intact (AC 9, 16)", () => {
  const storage = new MemoryStorage();
  for (const [original, changes] of [
    [[record("review", "Urgent")], { priority: "High" }],
    [[record("open")], { status: "Completed" }],
  ]) {
    saveRequests(original, storage);
    const raw = storage.getItem(STORAGE_KEY);
    const failingStorage = { getItem: storage.getItem.bind(storage), setItem() { throw new Error("Quota exceeded"); } };
    const before = structuredClone(original);
    assert.throws(() => saveManagerUpdate(original, 0, changes, failingStorage), /Quota/);
    assert.deepEqual(original, before);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.deepEqual(loadRequests(storage), original);
  }
  assert.throws(() => saveRequests([], null), /unavailable/);
});

test("missing and invalid statuses intentionally default to Pending without changing other data (AC 11, 14)", () => {
  const storage = new MemoryStorage();
  const actionable = record("actionable");
  const missing = record("legacy-missing");
  delete missing.status;
  missing.extra = { keep: "missing-status data" };
  const invalid = record("legacy-invalid");
  invalid.status = "Blocked";
  invalid.extra = { keep: "invalid-status data" };
  const completed = record("completed", "Low", "2026-10-17T12:00:00Z", "Completed");
  saveRequests([actionable, missing, invalid, completed], storage);

  const raw = storage.getItem(STORAGE_KEY);
  const loaded = loadRequests(storage);
  const normalized = [
    actionable,
    { ...missing, status: "Pending" },
    { ...invalid, status: "Pending" },
    completed,
  ];
  assert.deepEqual(loaded, normalized);
  assert.equal(storage.getItem(STORAGE_KEY), raw);

  // A successful explicit manager save persists the intentional status normalization
  // while preserving every non-status field on the converted legacy requests.
  const updated = saveManagerUpdate(loaded, 0, { status: "Completed" }, storage);
  assert.deepEqual(updated, [
    { ...actionable, status: "Completed" },
    { ...missing, status: "Pending" },
    { ...invalid, status: "Pending" },
    completed,
  ]);
  assert.deepEqual(loadRequests(storage), updated);
});

test("empty, pending-only, and completed-only views retain both status lists (AC 10, 17)", () => {
  for (const requests of [[], [record("pending")], [record("completed", "High", "2026-10-18", "Completed")]]) {
    for (const priority of ["All Priorities", "High", "Normal", "Low"]) {
      const view = requestView(requests, priority);
      assert.ok(Array.isArray(view.pending));
      assert.ok(Array.isArray(view.completed));
    }
  }
});
