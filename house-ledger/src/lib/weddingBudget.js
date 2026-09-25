// Pure helpers for the wedding planner's task -> subtask -> vendor-option
// hierarchy. A subtask's cost is whichever of its vendor options is
// approved (there's at most one, enforced by a DB unique index); a subtask
// with no options costs nothing. Total spend = every approved option's
// quote, across every subtask, plus every misc item.
export function subtasksFor(subtasks, taskId) {
  return subtasks.filter((s) => s.task_id === taskId);
}

export function optionsFor(vendorOptions, subtaskId) {
  return vendorOptions.filter((o) => o.subtask_id === subtaskId);
}

export function approvedOption(vendorOptions, subtaskId) {
  return vendorOptions.find((o) => o.subtask_id === subtaskId && o.approved) || null;
}

// Once a vendor's actual final cost is known it supersedes the original
// quote — the quote was only ever an estimate.
export function optionCost(option) {
  if (!option) return 0;
  return Number(option.actual_cost ?? option.quote_amount) || 0;
}

export function subtaskCost(vendorOptions, subtaskId) {
  return optionCost(approvedOption(vendorOptions, subtaskId));
}

export function taskSubtotal(subtasks, vendorOptions, taskId) {
  return subtasksFor(subtasks, taskId).reduce((sum, s) => sum + subtaskCost(vendorOptions, s.id), 0);
}

export function totalApproved(tasks, subtasks, vendorOptions) {
  return tasks.reduce((sum, t) => sum + taskSubtotal(subtasks, vendorOptions, t.id), 0);
}

export function totalMisc(miscItems) {
  return miscItems.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
}

export function pendingSubtasks(subtasks, vendorOptions) {
  return subtasks.filter((s) => optionsFor(vendorOptions, s.id).length > 0 && !approvedOption(vendorOptions, s.id));
}
