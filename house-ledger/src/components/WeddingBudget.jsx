import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, ChevronRight, Clock } from "lucide-react";
import { supabase } from "../supabaseClient";
import { fmt } from "../lib/balances";
import {
  subtasksFor,
  optionsFor,
  approvedOption,
  optionCost,
  taskSubtotal,
  totalApproved,
  totalMisc,
  pendingSubtasks,
} from "../lib/weddingBudget";
import SectionLabel from "./SectionLabel";

const inputClass = "px-1 py-3 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal placeholder:text-charcoal/40";
const PALETTE = ["#C1452E", "#35507A", "#5C7A45", "#B8862C", "#7A3F5C", "#2F7A72"];

const TIMEFRAMES = ["12+ Months Before", "9-11 Months Before", "6-8 Months Before", "3-5 Months Before", "1-2 Months Before", "Final Month"];
const timeframeRank = (tf) => {
  const i = TIMEFRAMES.indexOf(tf);
  return i === -1 ? TIMEFRAMES.length : i;
};

const STATUS_META = {
  not_started: { label: "Not started", cls: "bg-charcoal/6 text-charcoal/45" },
  in_progress: { label: "In progress", cls: "bg-brass/15 text-brass" },
  done: { label: "Done", cls: "bg-sage/15 text-sage" },
};
const STATUS_ORDER = ["not_started", "in_progress", "done"];

const VENDOR_STATUS_META = {
  researching: { label: "Researching", cls: "bg-charcoal/6 text-charcoal/45" },
  contacted: { label: "Contacted", cls: "bg-brass/15 text-brass" },
  booked: { label: "Booked", cls: "bg-sage/15 text-sage" },
};
const VENDOR_STATUS_ORDER = ["researching", "contacted", "booked"];

export default function WeddingBudget({ tasks, subtasks, vendorOptions, miscItems, settings, refresh }) {
  const [groupBy, setGroupBy] = useState("task");
  const approved = totalApproved(tasks, subtasks, vendorOptions);
  const misc = totalMisc(miscItems);
  const spent = approved + misc;
  const deciding = pendingSubtasks(subtasks, vendorOptions);

  const saveBudget = async (amount) => {
    await supabase.from("wedding_settings").upsert({ id: true, budget_target: amount, updated_at: new Date().toISOString() });
    await refresh();
  };

  const addTask = async (title) => {
    await supabase.from("wedding_tasks").insert({ title });
    await refresh();
  };

  const addMiscItem = async (description, amount) => {
    await supabase.from("wedding_misc_items").insert({ description, amount });
    await refresh();
  };

  const deleteMiscItem = async (id) => {
    await supabase.from("wedding_misc_items").delete().eq("id", id);
    await refresh();
  };

  const taskTitle = (id) => tasks.find((t) => t.id === id)?.title || "";

  return (
    <div>
      <BudgetSummary
        tasks={tasks}
        subtasks={subtasks}
        vendorOptions={vendorOptions}
        spent={spent}
        approved={approved}
        misc={misc}
        deciding={deciding}
        settings={settings}
        onSaveBudget={saveBudget}
      />

      <div className="flex items-baseline justify-between mb-3.5">
        <SectionLabel n="02" title="Tasks" />
        <div className="flex gap-1 mb-3.5">
          {[["task", "By task"], ["timeframe", "By timeframe"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGroupBy(key)}
              className={`px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide rounded-full border cursor-pointer ${
                groupBy === key ? "btn-gradient border-transparent" : "bg-paper-2 border-charcoal/20 text-charcoal/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {groupBy === "task" ? (
        <div className="flex flex-col gap-2.5 mb-4">
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                subtasks={subtasksFor(subtasks, t.id)}
                vendorOptions={vendorOptions}
                subtotal={taskSubtotal(subtasks, vendorOptions, t.id)}
                refresh={refresh}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <TimeframeView subtasks={subtasks} vendorOptions={vendorOptions} taskTitle={taskTitle} refresh={refresh} />
      )}
      {groupBy === "task" && <AddRow placeholder="New task, e.g. Flowers" onAdd={addTask} />}

      <SectionLabel n="03" title="Miscellaneous" />
      {miscItems.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">One-off costs that aren't tied to a task go here — they still count toward the total.</div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          <AnimatePresence initial={false}>
            {miscItems.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="flex items-center gap-2.5 pl-3 pr-2 py-3 bg-paper-2 rounded-md"
              >
                <span className="flex-1 text-[13px] font-medium">{m.description}</span>
                <span className="font-mono font-semibold text-sm">{fmt(Number(m.amount))}</span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => deleteMiscItem(m.id)}
                  title="Remove"
                  className="bg-transparent border-none text-rust/60 cursor-pointer p-2 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
                >
                  <X size={14} />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <AddMiscRow onAdd={addMiscItem} />
    </div>
  );
}

// Same subtask rows as the task-grouped view, just bucketed by timeframe
// instead of nested under a task accordion — same data, different lens.
function TimeframeView({ subtasks, vendorOptions, taskTitle, refresh }) {
  const buckets = {};
  subtasks.forEach((s) => {
    const key = s.timeframe || "No timeframe set";
    (buckets[key] = buckets[key] || []).push(s);
  });
  const keys = Object.keys(buckets).sort((a, b) => timeframeRank(a) - timeframeRank(b) || a.localeCompare(b));

  if (subtasks.length === 0) {
    return <div className="text-[13px] opacity-55 italic py-2 mb-4">No checklist items yet — add subtasks under a task, then tag them with a timeframe.</div>;
  }

  return (
    <div className="flex flex-col gap-4 mb-4">
      {keys.map((key) => (
        <div key={key}>
          <div className="text-[11px] font-bold uppercase tracking-wide opacity-55 mb-1.5 flex items-center gap-1.5">
            <Clock size={11} />
            {key}
          </div>
          <div className="flex flex-col gap-1.5">
            {buckets[key].map((s) => (
              <SubtaskRow key={s.id} subtask={s} options={optionsFor(vendorOptions, s.id)} refresh={refresh} taskLabel={taskTitle(s.task_id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetSummary({ tasks, subtasks, vendorOptions, spent, approved, misc, deciding, settings, onSaveBudget }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const target = settings?.budget_target || 0;

  const commit = () => {
    const amount = parseFloat(value);
    if (!amount || amount <= 0) return;
    onSaveBudget(amount);
    setEditing(false);
    setValue("");
  };

  const remaining = target > 0 ? target - spent : null;
  const pctUsed = target > 0 ? Math.min(100, (spent / target) * 100) : 0;
  const over = remaining !== null && remaining < 0;

  const maxVal = Math.max(1, ...tasks.map((t) => taskSubtotal(subtasks, vendorOptions, t.id)), misc);

  return (
    <div>
      <SectionLabel n="01" title="Where the money's going" />
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5">
          <div className="text-[11px] opacity-55 mb-1">Wedding budget</div>
          {target > 0 && !editing ? (
            <>
              <div className="font-mono text-xl font-semibold">{fmt(target)}</div>
              <button onClick={() => setEditing(true)} className="bg-transparent border-none p-0 text-[10px] uppercase tracking-wide underline opacity-55 cursor-pointer mt-0.5">
                change
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                className={`${inputClass} w-full py-1`}
                placeholder="e.g. 15000"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && commit()}
              />
              <motion.button whileTap={{ scale: 0.9 }} onClick={commit} className="w-8 h-8 shrink-0 rounded-lg btn-gradient flex items-center justify-center">
                <Check size={14} />
              </motion.button>
            </div>
          )}
        </div>
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5">
          <div className="text-[11px] opacity-55 mb-1">Spent so far</div>
          <div className="font-mono text-xl font-semibold">{fmt(spent)}</div>
          <div className="text-[10.5px] opacity-55 mt-0.5">
            {fmt(approved)} approved + {fmt(misc)} misc
          </div>
        </div>
      </div>

      <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-3">
        <div className="text-[11px] opacity-55 mb-1">Remaining</div>
        {target > 0 ? (
          <>
            <div className={`font-mono text-xl font-semibold ${over ? "text-rust" : "text-sage"}`}>
              {over ? `${fmt(Math.abs(remaining))} over` : fmt(remaining)}
            </div>
            <div className="h-2 rounded bg-charcoal/10 overflow-hidden mt-2">
              <div className={`h-full rounded ${over ? "bg-rust" : "bg-sage"}`} style={{ width: `${pctUsed}%` }} />
            </div>
          </>
        ) : (
          <div className="font-mono text-xl font-semibold opacity-40">—</div>
        )}
        {deciding.length > 0 && (
          <div className="text-[11px] opacity-60 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rust shrink-0" />
            {deciding.length} subtask{deciding.length === 1 ? "" : "s"} still deciding on a vendor — not counted above yet
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-4">
          <div className="text-[11px] opacity-55 mb-2">By task</div>
          <div className="flex flex-col gap-1.5">
            {tasks.map((t, i) => {
              const val = taskSubtotal(subtasks, vendorOptions, t.id);
              return (
                <div key={t.id} className="flex items-center gap-2 text-[12px]">
                  <span className="w-16 shrink-0 truncate">{t.title}</span>
                  <span className="flex-1 h-1.5 rounded bg-charcoal/8 overflow-hidden">
                    <span className="block h-full rounded" style={{ width: `${(val / maxVal) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </span>
                  <span className="w-14 text-right font-mono opacity-70">{fmt(val)}</span>
                </div>
              );
            })}
            {misc > 0 && (
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-16 shrink-0 truncate">Misc</span>
                <span className="flex-1 h-1.5 rounded bg-charcoal/8 overflow-hidden">
                  <span className="block h-full rounded bg-rust" style={{ width: `${(misc / maxVal) * 100}%` }} />
                </span>
                <span className="w-14 text-right font-mono opacity-70">{fmt(misc)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, subtasks, vendorOptions, subtotal, refresh }) {
  const [open, setOpen] = useState(false);

  const addSubtask = async (payload) => {
    await supabase.from("wedding_subtasks").insert({ task_id: task.id, ...payload });
    await refresh();
    setOpen(true);
  };

  const deleteTask = async (e) => {
    e.stopPropagation();
    await supabase.from("wedding_tasks").delete().eq("id", task.id);
    await refresh();
  };

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-paper-2 border border-charcoal/10 rounded-lg overflow-hidden">
      <div onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 pl-3.5 pr-1.5 py-3 cursor-pointer">
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} className="opacity-50 shrink-0">
          <ChevronRight size={14} />
        </motion.span>
        <span className="flex-1 font-display font-semibold text-[14px]">{task.title}</span>
        <span className="text-[11px] opacity-55">
          {subtasks.length} item{subtasks.length === 1 ? "" : "s"}
        </span>
        <span className="font-mono font-semibold text-[13.5px]">{fmt(subtotal)}</span>
        <motion.button whileTap={{ scale: 0.85 }} onClick={deleteTask} title="Remove task" className="bg-transparent border-none text-rust/60 cursor-pointer p-1.5 shrink-0">
          <X size={14} />
        </motion.button>
      </div>

      {open && (
        <div className="px-2.5 pb-2.5">
          <div className="flex flex-col gap-1.5">
            {subtasks.map((s) => (
              <SubtaskRow key={s.id} subtask={s} options={optionsFor(vendorOptions, s.id)} refresh={refresh} />
            ))}
          </div>
          <div className="mt-1.5">
            <AddSubtaskRow onAdd={addSubtask} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SubtaskRow({ subtask, options, refresh, taskLabel }) {
  const [open, setOpen] = useState(false);
  const approved = approvedOption(options, subtask.id) || options.find((o) => o.approved);
  const statusMeta = STATUS_META[subtask.status] || STATUS_META.not_started;

  const cycleStatus = async (e) => {
    e.stopPropagation();
    const idx = STATUS_ORDER.indexOf(subtask.status);
    const next = STATUS_ORDER[(idx === -1 ? 0 : idx + 1) % STATUS_ORDER.length];
    await supabase.from("wedding_subtasks").update({ status: next, done: next === "done" }).eq("id", subtask.id);
    await refresh();
  };

  const addOption = async (payload) => {
    await supabase.from("wedding_vendor_options").insert({ subtask_id: subtask.id, ...payload });
    await refresh();
  };

  const updateOption = async (id, patch) => {
    await supabase.from("wedding_vendor_options").update(patch).eq("id", id);
    await refresh();
  };

  const approveOption = async (optionId) => {
    // The DB enforces at most one approved option per subtask, so the old
    // one must be unapproved before the new one is approved — doing both at
    // once would collide with that constraint.
    const currentlyApproved = options.find((o) => o.approved && o.id !== optionId);
    if (currentlyApproved) {
      await supabase.from("wedding_vendor_options").update({ approved: false }).eq("id", currentlyApproved.id);
    }
    await supabase.from("wedding_vendor_options").update({ approved: true, status: "booked" }).eq("id", optionId);
    await refresh();
  };

  const deleteOption = async (id) => {
    await supabase.from("wedding_vendor_options").delete().eq("id", id);
    await refresh();
  };

  const deleteSubtask = async (e) => {
    e.stopPropagation();
    await supabase.from("wedding_subtasks").delete().eq("id", subtask.id);
    await refresh();
  };

  return (
    <div className="bg-[#f7f4ec] rounded-md border border-charcoal/8">
      <div className="flex items-center gap-2 px-2.5 py-2.5 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={cycleStatus}
          title={statusMeta.label}
          className={`w-[19px] h-[19px] shrink-0 rounded-full flex items-center justify-center text-paper ${
            subtask.status === "done" ? "bg-sage border-none" : subtask.status === "in_progress" ? "bg-brass border-none" : "bg-transparent border-[1.5px] border-charcoal/30"
          }`}
        >
          {subtask.status === "done" && <Check size={11} strokeWidth={3} />}
        </motion.button>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium ${subtask.status === "done" ? "line-through opacity-50" : ""}`}>{subtask.title}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10.5px] opacity-55">
            {taskLabel && <span>{taskLabel}</span>}
            {subtask.due_date && <span>due {subtask.due_date}</span>}
            {subtask.timeframe && <span>{subtask.timeframe}</span>}
            {subtask.owner && <span>{subtask.owner}</span>}
          </div>
        </div>
        {approved ? (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-sage/15 text-sage shrink-0 whitespace-nowrap">
            {fmt(optionCost(approved))} &middot; {approved.vendor_name}
          </span>
        ) : options.length > 0 ? (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-rust/15 text-rust shrink-0">
            {options.length} option{options.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${statusMeta.cls}`}>{statusMeta.label}</span>
        )}
        <motion.button whileTap={{ scale: 0.85 }} onClick={deleteSubtask} title="Remove subtask" className="bg-transparent border-none text-rust/60 cursor-pointer p-1 shrink-0">
          <X size={13} />
        </motion.button>
      </div>

      {open && (
        <div className="border-t border-dashed border-charcoal/15 px-2.5 pb-2.5 pt-2">
          {subtask.comments && <div className="text-[11.5px] opacity-70 italic mb-2">&ldquo;{subtask.comments}&rdquo;</div>}
          <div className="flex flex-col gap-1.5 mb-1.5">
            <AnimatePresence initial={false}>
              {options.map((o) => (
                <OptionRow key={o.id} option={o} onApprove={approveOption} onDelete={deleteOption} onUpdate={updateOption} />
              ))}
            </AnimatePresence>
          </div>
          <AddOptionRow onAdd={addOption} />
        </div>
      )}
    </div>
  );
}

function OptionRow({ option: o, onApprove, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null); // populated on first expand

  const startEdit = () => {
    setForm({
      contact_name: o.contact_name || "",
      phone: o.phone || "",
      email: o.email || "",
      deposit_paid: o.deposit_paid ?? "",
      actual_cost: o.actual_cost ?? "",
      amount_paid: o.amount_paid ?? "",
      contract_signed: !!o.contract_signed,
    });
    setOpen(true);
  };

  const save = async () => {
    await onUpdate(o.id, {
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      deposit_paid: form.deposit_paid === "" ? null : parseFloat(form.deposit_paid),
      actual_cost: form.actual_cost === "" ? null : parseFloat(form.actual_cost),
      amount_paid: form.amount_paid === "" ? null : parseFloat(form.amount_paid),
      contract_signed: form.contract_signed,
    });
    setOpen(false);
  };

  const cycleVendorStatus = async () => {
    const idx = VENDOR_STATUS_ORDER.indexOf(o.status);
    const next = VENDOR_STATUS_ORDER[(idx === -1 ? 0 : idx + 1) % VENDOR_STATUS_ORDER.length];
    await onUpdate(o.id, { status: next });
  };

  const vendorStatusMeta = VENDOR_STATUS_META[o.status] || VENDOR_STATUS_META.researching;
  const balanceDue = optionCost(o) - (Number(o.amount_paid) || 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 20 }}
      className={`rounded-md text-[12px] ${o.approved ? "bg-sage/10 outline outline-1 outline-sage/40" : "bg-paper-2"}`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2 cursor-pointer" onClick={() => (open ? setOpen(false) : startEdit())}>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} className="opacity-40 shrink-0">
          <ChevronRight size={11} />
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{o.vendor_name}</div>
          {(o.link || o.notes) && (
            <div className="text-[10.5px] opacity-55 truncate">
              {o.link && (
                <a
                  href={/^https?:\/\//.test(o.link) ? o.link : `https://${o.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline"
                >
                  {o.link}
                </a>
              )}
              {o.link && o.notes ? " · " : ""}
              {o.notes}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            cycleVendorStatus();
          }}
          className={`text-[9.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border-none cursor-pointer shrink-0 whitespace-nowrap ${vendorStatusMeta.cls}`}
        >
          {vendorStatusMeta.label}
        </button>
        <span className="font-mono font-semibold w-16 text-right shrink-0">{fmt(optionCost(o))}</span>
        {o.approved ? (
          <span className="text-[10px] font-bold uppercase text-sage w-16 text-center shrink-0">&#10003; Approved</span>
        ) : (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={(e) => {
              e.stopPropagation();
              onApprove(o.id);
            }}
            className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border-[1.5px] border-brass text-brass bg-transparent cursor-pointer shrink-0"
          >
            Approve
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(o.id);
          }}
          className="bg-transparent border-none text-rust/60 cursor-pointer p-1 shrink-0"
        >
          <X size={13} />
        </motion.button>
      </div>

      {open && form && (
        <div className="px-2.5 pb-2.5 pt-1 flex flex-col gap-1.5 border-t border-dashed border-charcoal/15" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1.5">
            <input className={`${inputClass} flex-1 min-w-0 py-1.5 text-[11.5px]`} placeholder="Contact name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <input className={`${inputClass} flex-1 min-w-0 py-1.5 text-[11.5px]`} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <input className={`${inputClass} py-1.5 text-[11.5px]`} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">Deposit paid</div>
              <input inputMode="decimal" className={`${inputClass} w-full py-1.5 text-[11.5px]`} value={form.deposit_paid} onChange={(e) => setForm({ ...form, deposit_paid: e.target.value.replace(/[^0-9.]/g, "") })} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">Actual cost</div>
              <input inputMode="decimal" className={`${inputClass} w-full py-1.5 text-[11.5px]`} placeholder={o.quote_amount ? String(o.quote_amount) : ""} value={form.actual_cost} onChange={(e) => setForm({ ...form, actual_cost: e.target.value.replace(/[^0-9.]/g, "") })} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">Amount paid</div>
              <input inputMode="decimal" className={`${inputClass} w-full py-1.5 text-[11.5px]`} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value.replace(/[^0-9.]/g, "") })} />
            </div>
          </div>
          {balanceDue > 0 && <div className="text-[10.5px] opacity-60">Balance due: {fmt(balanceDue)}</div>}
          <label className="flex items-center gap-2 text-[11.5px] py-0.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.contract_signed} onChange={(e) => setForm({ ...form, contract_signed: e.target.checked })} className="w-4 h-4 accent-brass" />
            Contract signed
          </label>
          <motion.button whileTap={{ scale: 0.97 }} onClick={save} className="w-full py-2 text-[12px] font-semibold rounded-lg btn-gradient cursor-pointer mt-1">
            Save details
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

function AddRow({ placeholder, onAdd, small }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };
  return (
    <div className={`flex gap-2 ${small ? "" : "mb-4"}`}>
      <input
        className={`${inputClass} flex-1 min-w-0 ${small ? "py-2 text-[13px]" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <motion.button
        whileTap={value.trim() ? { scale: 0.9 } : {}}
        disabled={!value.trim()}
        onClick={submit}
        className={`shrink-0 rounded-lg btn-gradient flex items-center justify-center disabled:opacity-40 ${small ? "w-9 h-9" : "w-[46px]"}`}
      >
        <Plus size={small ? 15 : 18} />
      </motion.button>
    </div>
  );
}

function AddSubtaskRow({ onAdd }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [owner, setOwner] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({ title: trimmed, timeframe: timeframe || null, owner: owner.trim() || null });
    setTitle("");
    setTimeframe("");
    setOwner("");
    setExpanded(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1 min-w-0 py-2 text-[13px]`}
          placeholder="Add a subtask"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <motion.button
          whileTap={title.trim() ? { scale: 0.9 } : {}}
          disabled={!title.trim()}
          onClick={submit}
          className="w-9 h-9 shrink-0 rounded-lg btn-gradient flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={15} />
        </motion.button>
      </div>
      {expanded && (
        <div className="flex gap-1.5">
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={`${inputClass} flex-1 min-w-0 py-1.5 text-[11.5px]`}>
            <option value="">Timeframe (optional)</option>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} flex-1 min-w-0 py-1.5 text-[11.5px]`}
            placeholder="Owner (optional)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
      )}
    </div>
  );
}

function AddOptionRow({ onAdd }) {
  const [name, setName] = useState("");
  const [quote, setQuote] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ vendor_name: trimmed, quote_amount: parseFloat(quote) || null, link: link.trim() || null, notes: notes.trim() || null });
    setName("");
    setQuote("");
    setLink("");
    setNotes("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <input
          className={`${inputClass} flex-1 min-w-0 py-2 text-[13px]`}
          placeholder="Vendor name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className={`${inputClass} w-16 py-2 text-[13px]`}
          placeholder="Quote"
          inputMode="decimal"
          value={quote}
          onChange={(e) => setQuote(e.target.value.replace(/[^0-9.]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <motion.button whileTap={name.trim() ? { scale: 0.9 } : {}} disabled={!name.trim()} onClick={submit} className="w-9 h-9 shrink-0 rounded-lg btn-gradient flex items-center justify-center disabled:opacity-40">
          <Plus size={15} />
        </motion.button>
      </div>
      <div className="flex gap-1.5">
        <input
          className={`${inputClass} flex-1 min-w-0 py-1.5 text-[12px]`}
          placeholder="Link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className={`${inputClass} flex-1 min-w-0 py-1.5 text-[12px]`}
          placeholder="Comments (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
    </div>
  );
}

function AddMiscRow({ onAdd }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const submit = () => {
    const trimmed = description.trim();
    const num = parseFloat(amount);
    if (!trimmed || !num) return;
    onAdd(trimmed, num);
    setDescription("");
    setAmount("");
  };
  return (
    <div className="flex gap-2">
      <input
        className={`${inputClass} flex-1 min-w-0`}
        placeholder="e.g. Marriage license"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <input
        className={`${inputClass} w-16`}
        placeholder="$"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <motion.button
        whileTap={description.trim() && amount ? { scale: 0.9 } : {}}
        disabled={!description.trim() || !amount}
        onClick={submit}
        className="w-[46px] shrink-0 rounded-lg btn-gradient flex items-center justify-center disabled:opacity-40"
      >
        <Plus size={18} />
      </motion.button>
    </div>
  );
}
