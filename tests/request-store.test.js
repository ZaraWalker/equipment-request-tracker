import assert from "node:assert/strict";
import test from "node:test";

import {
  RequestValidationError,
  STORAGE_KEY,
  appendRequest,
  createRequest,
  loadRequests,
  saveRequests,
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

test("loadRequests safely handles damaged stored data", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "not-json");

  assert.deepEqual(loadRequests(storage), []);
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

test("older requests without priority remain intact and default to Normal", () => {
  const storage = new MemoryStorage();
  const legacy = createRequest(validInput, {
    id: "legacy",
    now: new Date("2026-08-17T12:00:00.000Z"),
  });
  delete legacy.priority;
  storage.setItem(STORAGE_KEY, JSON.stringify([legacy]));

  const loaded = loadRequests(storage);
  assert.deepEqual(loaded, [{ ...legacy, priority: "Normal" }]);
  saveRequests(loaded, storage);
  assert.deepEqual(loadRequests(storage), loaded);
});
