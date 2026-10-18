import {
  RequestValidationError,
  appendRequest,
  createRequest,
  loadRequests,
  saveRequests,
  PRIORITIES,
  STATUSES,
  requestView,
  saveManagerUpdate,
  validRequestDate,
} from "./request-store.js";

const form = document.querySelector("#request-form");
const message = document.querySelector("#form-message");
const neededByInput = document.querySelector("#needed-by");
const count = document.querySelector("#request-count");
const emptyState = document.querySelector("#empty-state");
const sections = document.querySelector("#request-sections");
const priorityFilter = document.querySelector("#priority-filter");
const managerMessage = document.querySelector("#manager-message");

let requests = [];
let storageReady = false;
try {
  requests = loadRequests();
  storageReady = true;
} catch {
  managerMessage.textContent = "Stored requests could not be loaded. Existing data has been kept; saving is disabled. Restore browser storage access or repair the stored data, then reload.";
  managerMessage.classList.add("error");
  form.querySelector("button").disabled = true;
}

neededByInput.min = new Date().toISOString().slice(0, 10);
priorityFilter.value = "All Priorities";
renderRequests();
priorityFilter.addEventListener("change", renderRequests);
window.addEventListener("pageshow", () => {
  priorityFilter.value = "All Priorities";
  renderRequests();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFieldErrors();
  setMessage("");

  const input = Object.fromEntries(new FormData(form).entries());

  try {
    if (!storageReady) throw new Error("Storage unavailable.");
    const request = createRequest(input);
    const updated = appendRequest(requests, request);
    saveRequests(updated);
    requests = updated;
    form.reset();
    neededByInput.min = new Date().toISOString().slice(0, 10);
    setMessage("Request added.");
    renderRequests();
    document.querySelector("#requester").focus();
  } catch (error) {
    if (error instanceof RequestValidationError) {
      showFieldErrors(error.errors);
      setMessage("Complete all required fields.", true);
      return;
    }

    setMessage("The request could not be saved. Try again.", true);
    console.error(error);
  }
});

function renderRequests() {
  const view = requestView(requests, priorityFilter.value);
  count.textContent = `${requests.length} ${requests.length === 1 ? "request" : "requests"}`;
  emptyState.hidden = view.pending.length + view.completed.length > 0;
  sections.replaceChildren(
    createSection("Pending", view.pending),
    createSection("Completed", view.completed),
    createSection("Missing/Unrecognized", view.review, true),
  );
}

function createSection(title, records, review = false) {
  const section = document.createElement("section");
  section.className = "request-section";
  const heading = document.createElement("h3");
  heading.id = review ? "review-title" : `${title.toLowerCase()}-title`;
  heading.textContent = title;
  section.setAttribute("aria-labelledby", heading.id);
  section.append(heading);
  if (!records.length) {
    const empty = document.createElement("p");
    empty.textContent = "No requests in this section.";
    section.append(empty);
    return section;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", `${title} requests, scroll to see all columns`);
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.className = "sr-only";
  caption.textContent = `${title} equipment requests`;
  const head = document.createElement("thead");
  const headers = document.createElement("tr");
  for (const label of ["Requester", "Department", "Equipment", "Priority", "Status", "Needed by", "Business reason", "Submitted", "Manager actions"]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headers.append(th);
  }
  head.append(headers);
  const body = document.createElement("tbody");
  body.append(...records.map((request) => createRequestRow(request, review)));
  table.append(caption, head, body);
  wrapper.append(table);
  section.append(wrapper);
  return section;
}

function createRequestRow(request, review) {
  const row = document.createElement("tr");
  const values = [
    request.requester,
    request.department,
    request.equipment,
    request.priority ?? "Missing",
    request.status,
    formatDate(request.neededBy),
    request.reason,
    formatDateTime(request.createdAt),
  ];

  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }

  const actions = document.createElement("td");
  const index = requests.indexOf(request);
  if (review) actions.append(createCorrectionForm(request, index));
  actions.append(createStatusForm(request, index));
  row.append(actions);

  return row;
}

function labeledControl(form, text, control, id) {
  const field = document.createElement("div");
  field.className = "field";
  control.id = id;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = text;
  field.append(label, control);
  form.append(field);
  return control;
}

function selectOptions(values, selected) {
  const select = document.createElement("select");
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || "Select a priority";
    select.append(option);
  }
  select.value = selected;
  return select;
}

function createCorrectionForm(request, index) {
  const editor = document.createElement("form");
  editor.className = "manager-editor";
  editor.setAttribute("aria-label", `Manager review for ${request.requester ?? "request"}`);
  editor.noValidate = true;
  // Only invalid fields are editable, preserving valid fields exactly as stored.
  let priority;
  let date;
  if (!PRIORITIES.includes(request.priority)) {
    priority = labeledControl(editor, "Correct priority", selectOptions(["", ...PRIORITIES], ""), `correct-priority-${index}`);
  }
  if (!validRequestDate(request.createdAt)) {
    date = document.createElement("input");
    date.type = "datetime-local";
    date.step = "0.001";
    labeledControl(editor, "Correct request date", date, `correct-date-${index}`);
  }
  const approve = document.createElement("button");
  approve.type = "submit";
  approve.textContent = "Approve and save corrections";
  editor.append(approve);
  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const changes = {};
    if (priority) changes.priority = priority.value;
    if (date) changes.createdAt = validRequestDate(date.value) ? new Date(date.value).toISOString() : "";
    applyManagerUpdate(index, changes, approve);
  });
  return editor;
}

function createStatusForm(request, index) {
  const editor = document.createElement("form");
  editor.className = "manager-editor";
  editor.setAttribute("aria-label", `Manager status for ${request.requester ?? "request"}`);
  const status = labeledControl(editor, "Manager: work status", selectOptions(STATUSES, request.status), `status-${index}`);
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Save status";
  editor.append(save);
  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    applyManagerUpdate(index, { status: status.value }, save);
  });
  return editor;
}

function applyManagerUpdate(index, changes, button) {
  try {
    if (!storageReady) throw new Error("Browser storage is unavailable.");
    const controlId = button.form.querySelector("select, input")?.id;
    requests = saveManagerUpdate(requests, index, changes);
    managerMessage.classList.remove("error");
    managerMessage.textContent = "Changes saved.";
    renderRequests();
    (document.getElementById(controlId) ?? priorityFilter).focus();
  } catch (error) {
    managerMessage.classList.add("error");
    managerMessage.textContent = `Changes were not saved. ${error.message}`;
    // Reset status editing to the persisted value on failure.
    if ("status" in changes) button.form.querySelector("select").value = requests[index].status;
  }
}

function formatDate(value) {
  if (typeof value !== "string" || !validRequestDate(value)) return value || "Missing";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatDateTime(value) {
  if (!validRequestDate(value)) return value || "Missing";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function showFieldErrors(errors) {
  const firstInvalidField = Object.keys(errors)[0];

  for (const fieldName of Object.keys(errors)) {
    form.elements[fieldName]?.setAttribute("aria-invalid", "true");
  }

  form.elements[firstInvalidField]?.focus();
}

function clearFieldErrors() {
  for (const element of form.elements) {
    element.removeAttribute?.("aria-invalid");
  }
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}
