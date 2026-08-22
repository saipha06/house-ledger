import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import BackgroundArt from "./BackgroundArt";

// Shown once per person, right after their first login, so their auth
// account gets linked to a friendly name in the shared `members` table.
export default function Onboarding({ session, onDone }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .insert({ auth_user_id: session.user.id, email: session.user.email, name: name.trim() })
      .select()
      .single();
    setLoading(false);
    if (error) setError(error.message);
    else onDone(data);
  };

  return (
    <div className="relative h-dvh bg-ink flex items-center justify-center p-5 font-sans overflow-hidden">
      <BackgroundArt />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[360px] bg-paper rounded-2xl p-7 text-charcoal shadow-2xl"
      >
        <div className="flex justify-center mb-4">
          <Avatar name={name || "?"} size={64} ring />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-55 mb-1 text-center">one-time setup</div>
        <h1 className="font-display text-gradient text-[22px] font-semibold m-0 text-center">What should we call you?</h1>
        <form onSubmit={submit} className="mt-4">
          <input
            required
            autoFocus
            placeholder="e.g. Phani"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-1 py-2.5 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal placeholder:text-charcoal/40 text-center"
          />
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[12.5px] text-rust mt-2 overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            className="w-full py-3.5 text-[15px] font-semibold rounded-xl border-none btn-gradient cursor-pointer mt-4 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Join the ledger"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
