import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { LogIn, UserPlus } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(error.message);
    // On success, App.jsx's onAuthStateChange listener picks up the new session automatically.
  };

  return (
    <div className="h-dvh bg-ink flex items-center justify-center p-5 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px] bg-paper rounded-2xl p-7 text-charcoal shadow-2xl"
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-55 mb-1">household accounts</div>
        <h1 className="font-display text-[26px] font-semibold m-0">Casa</h1>

        <div className="flex gap-1.5 mt-4">
          {[
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ].map(([key, label]) => (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setMode(key);
                setError("");
              }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-full border transition-colors ${
                mode === key ? "bg-charcoal border-charcoal text-paper" : "bg-transparent border-charcoal/20 text-charcoal"
              }`}
            >
              {label}
            </motion.button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4">
          <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5 mt-3">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal"
          />
          <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5 mt-3">Password</label>
          <input
            type="password"
            required
            minLength={6}
            placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal"
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
            className="w-full py-3.5 text-[15px] font-semibold rounded-xl border-none bg-charcoal text-paper cursor-pointer mt-5 flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {mode === "signin" ? <LogIn size={15} /> : <UserPlus size={15} />}
            {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </motion.button>
        </form>

        {mode === "signup" && (
          <p className="text-[11.5px] opacity-55 mt-3 leading-relaxed">
            Pick any password you'll remember — there's no email verification step, so you're in as soon as you create the account.
          </p>
        )}
      </motion.div>
    </div>
  );
}
