export const STORAGE_KEY = "mis4173-equipment-requests";
export const PRIORITIES = ["High", "Normal", "Low"];
export const STATUSES = ["Pending", "Completed"];

export class RequestValidationError extends Error {
  constructor(errors) {
    super("The equipment request is incomplete.");
    this.name = "RequestValidationError";
    this.errors = errors;
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateRequest(input = {}) {
  const errors = {};

  if (!clean(input.requester)) errors.requester = "Enter the requester name.";
  if (!clean(input.department)) errors.department = "Select a department.";
  if (!clean(input.equipment)) errors.equipment = "Enter the equipment needed.";
  if (!clean(input.neededBy)) errors.neededBy = "Select the date needed.";
  if (!clean(input.reason)) errors.reason = "Enter a business reason.";

  if (input.priority !== undefined && !["Low", "Normal", "High"].includes(input.priority)) {
    errors.priority = "Select Low, Normal, or High priority.";
  }

  return errors;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createRequest(input, options = {}) {
  const errors = validateRequest(input);
  if (Object.keys(errors).length > 0) {
    throw new RequestValidationError(errors);
  }

  const now = options.now ?? new Date();

  return {
    id: options.id ?? createId(),
    requester: clean(input.requester),
    department: clean(input.department),
    equipment: clean(input.equipment),
    priority: input.priority ?? "Normal",
    status: "Pending",
    neededBy: clean(input.neededBy),
    reason: clean(input.reason),
    createdAt: now.toISOString(),
  };
}

export function appendRequest(requests, request) {
  return [request, ...requests];
}

export function loadRequests(storage = globalThis.localStorage) {
  if (!storage) throw new Error("Browser storage is unavailable.");
  const stored = storage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const parsed = JSON.parse(stored);
  // Refuse to overwrite unreadable data; never silently discard records.
  if (!Array.isArray(parsed) || parsed.some((value) => !value || typeof value !== "object" || Array.isArray(value))) {
    throw new Error("Stored requests could not be read.");
  }
  return parsed.map((request) => ({
    ...request,
    status: STATUSES.includes(request.status) ? request.status : "Pending",
  }));
}

export function saveRequests(requests, storage = globalThis.localStorage) {
  if (!storage) throw new Error("Browser storage is unavailable.");
  storage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function validRequestDate(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

export function needsReview(request) {
  return !PRIORITIES.includes(request.priority) || !validRequestDate(request.createdAt);
}

export function requestView(requests, priority = "All Priorities") {
  const review = requests.filter(needsReview);
  const eligible = requests.filter((request) => !needsReview(request) &&
    (priority === "All Priorities" || request.priority === priority));
  const sorted = eligible.toSorted((a, b) =>
    Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
    PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  return {
    pending: sorted.filter((request) => request.status !== "Completed"),
    completed: sorted.filter((request) => request.status === "Completed"),
    review,
  };
}

// Use the list index so even legacy records with missing/duplicate IDs stay distinct.
// Persist the candidate before returning it; callers keep their old state on failure.
export function saveManagerUpdate(requests, index, changes, storage = globalThis.localStorage) {
  if (!requests[index]) throw new Error("Request not found.");
  const fields = Object.keys(changes);
  const statusUpdate = fields.length === 1 && fields[0] === "status";
  if (statusUpdate) {
    if (!STATUSES.includes(changes.status)) throw new Error("Select Pending or Completed.");
  } else {
    if (!fields.length || fields.some((field) => !["priority", "createdAt"].includes(field))) {
      throw new Error("Only priority and request date can be corrected.");
    }
    const corrected = { ...requests[index], ...changes };
    if (needsReview(corrected)) throw new Error("Assign a valid priority and request date before approval.");
  }
  const updated = requests.map((request, position) => position === index ? { ...request, ...changes } : request);
  saveRequests(updated, storage);
  return updated;
}
