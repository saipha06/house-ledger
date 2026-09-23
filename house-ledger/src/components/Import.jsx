import { motion } from "framer-motion";
import { Upload, Check, X, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { readFileBase64 } from "../lib/readFileBase64";
import { mainQueue, hiddenTiers } from "../lib/statementReview";
import { fmt } from "../lib/balances";
import SectionLabel from "./SectionLabel";

const TIER_LABEL = {
  shared_high: "Likely shared",
  shared_maybe: "Maybe shared",
  personal_uncertain: "Probably personal",
  personal_confident: "Personal",
};

let nextLocalId = 0;

// Surfaces enough to actually debug a failure on a device we can't attach
// devtools to: which stage it happened in, the real error name/message
// (not just "something went wrong"), and the first stack frame if present.
function describeError(stage, err) {
  const name = err?.name || "Error";
  const message = err?.message || String(err);
  const firstFrame = typeof err?.stack === "string" ? err.stack.split("\n")[1]?.trim() : null;
  return `${stage} failed: ${name}: ${message}${firstFrame ? ` (${firstFrame})` : ""}`;
}

// Upload a bank statement PDF, send it to the extract-statement Edge
// Function (which extracts + redacts + classifies server-side — see that
// function for why PDF parsing isn't done client-side), then review one
// card at a time. Nothing touches the real expenses table until a card is
// explicitly approved — approving hands the transaction off to Money's
// existing "Add" flow (prefilled), which is where the actual insert
// happens.
//
// Controlled by the parent (Money): the review queue's state lives there,
// not here, because this component unmounts whenever the user navigates to
// "add" to fill in an approved card — without lifting the state up, that
// navigation would wipe the whole in-progress queue with no way back to
// the rest of the transactions.
export default function Import({ state, onChange, onApprove }) {
  const { status, error, transactions, reviewedIds, showHidden } = state;

  const handleFile = async (file) => {
    if (!file) return;
    onChange({ status: "extracting", error: "" });

    // Wrapped per-stage (not one big try/catch) so a failure names exactly
    // which step it happened in, since "something went wrong" alone isn't
    // enough to debug a device we can't attach devtools to.
    let pdfBase64;
    try {
      pdfBase64 = await readFileBase64(file);
    } catch (err) {
      onChange({ status: "error", error: describeError("Reading the file", err) });
      return;
    }

    let data, fnError;
    try {
      ({ data, error: fnError } = await supabase.functions.invoke("extract-statement", { body: { pdfBase64 } }));
    } catch (err) {
      onChange({ status: "error", error: describeError("Contacting the server", err) });
      return;
    }
    if (fnError) {
      onChange({ status: "error", error: describeError("Contacting the server", fnError) });
      return;
    }
    if (data?.error) {
      onChange({ status: "error", error: describeError("Classifying transactions", new Error(data.error)) });
      return;
    }

    try {
      const withIds = (data?.transactions || []).map((t) => ({ ...t, id: `local-${nextLocalId++}` }));
      onChange({ transactions: withIds, reviewedIds: new Set(), showHidden: false, status: withIds.length ? "reviewing" : "empty" });
    } catch (err) {
      onChange({ status: "error", error: describeError("Reading the results", err) });
    }
  };

  const queue = mainQueue(transactions).filter((t) => !reviewedIds.has(t.id));
  const hiddenUnreviewed = hiddenTiers(transactions).filter((t) => !reviewedIds.has(t.id));

  const skip = (id) => onChange({ reviewedIds: new Set(reviewedIds).add(id) });
  const approve = (txn) => {
    onChange({ reviewedIds: new Set(reviewedIds).add(txn.id) });
    onApprove(txn);
  };

  if (status === "idle" || status === "error" || status === "empty") {
    return (
      <div>
        <SectionLabel n="01" title="Upload a statement" />
        <div className="text-[13px] opacity-70 mb-4 leading-relaxed">
          Download a PDF statement from your bank, upload it here, and likely-shared transactions get pulled out for you to approve one at a time — nothing touches the ledger until you say so.
        </div>
        {status === "error" && <div className="text-[13px] text-rust mb-3">{error}</div>}
        {status === "empty" && <div className="text-[13px] opacity-55 italic mb-3">No transactions found in that PDF.</div>}
        <label className="w-full py-3.5 text-[15px] font-semibold rounded-xl btn-gradient cursor-pointer flex items-center justify-center gap-1.5">
          <Upload size={15} />
          Choose PDF statement
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>
    );
  }

  if (status === "extracting") {
    return (
      <div>
        <SectionLabel n="01" title="Reading statement…" />
        <div className="flex flex-col items-center gap-3 py-10">
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} className="text-brass">
            <Loader2 size={30} strokeWidth={2.2} />
          </motion.span>
          <div className="text-[13px] opacity-65 text-center">Extracting and classifying transactions — this can take up to 10-15 seconds.</div>
        </div>
      </div>
    );
  }

  const current = queue[0];

  return (
    <div>
      <SectionLabel n="02" title={`Review (${queue.length} left)`} />
      {current ? (
        <TransactionCard txn={current} onSkip={() => skip(current.id)} onApprove={() => approve(current)} />
      ) : (
        <div className="text-[13px] opacity-55 italic py-4 mb-3">All caught up — nothing left in the main queue.</div>
      )}

      {hiddenUnreviewed.length > 0 && (
        <div className="mt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange({ showHidden: !showHidden })}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-paper-2 border border-charcoal/10 rounded-lg text-[13px] font-medium cursor-pointer"
          >
            <span>{hiddenUnreviewed.length} skipped as personal — review them</span>
            <motion.span animate={{ rotate: showHidden ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown size={15} />
            </motion.span>
          </motion.button>
          {showHidden && (
            <div className="flex flex-col gap-2 mt-2">
              {hiddenUnreviewed.map((t) => (
                <HiddenRow key={t.id} txn={t} dimmed={t.tier === "personal_confident"} onSkip={() => skip(t.id)} onApprove={() => approve(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onChange({ status: "idle" })}
        className="mt-4 text-[11px] uppercase tracking-wide underline opacity-55 bg-transparent border-none cursor-pointer p-0"
      >
        Upload a different statement
      </button>
    </div>
  );
}

function TransactionCard({ txn, onSkip, onApprove }) {
  return (
    <motion.div
      key={txn.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="bg-paper-2 border border-charcoal/10 rounded-xl p-4 mb-3"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wide opacity-55">{txn.date}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${txn.tier === "shared_high" ? "bg-sage/15 text-sage" : "bg-brass/15 text-brass"}`}>
          {TIER_LABEL[txn.tier]}
        </span>
      </div>
      <div className="text-[15px] font-medium mb-1.5">{txn.summary}</div>
      <div className="font-mono text-2xl font-semibold mb-4">{fmt(Number(txn.amount) || 0)}</div>
      <div className="flex gap-2">
        <motion.button whileTap={{ scale: 0.96 }} onClick={onSkip} className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg border border-charcoal/20 bg-transparent cursor-pointer">
          Skip
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onApprove} className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg btn-gradient cursor-pointer">
          Add as expense
        </motion.button>
      </div>
    </motion.div>
  );
}

function HiddenRow({ txn, dimmed, onSkip, onApprove }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 bg-paper-2 rounded-lg ${dimmed ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium truncate">{txn.summary}</div>
        <div className="text-[10.5px] opacity-55">{txn.date}</div>
      </div>
      <span className="font-mono text-[13px] font-semibold shrink-0">{fmt(Number(txn.amount) || 0)}</span>
      <motion.button whileTap={{ scale: 0.85 }} onClick={onApprove} title="Add as expense" className="p-1.5 text-sage bg-transparent border-none cursor-pointer shrink-0">
        <Check size={15} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={onSkip} title="Dismiss" className="p-1.5 text-rust/60 bg-transparent border-none cursor-pointer shrink-0">
        <X size={15} />
      </motion.button>
    </div>
  );
}
