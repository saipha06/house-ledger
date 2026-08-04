import { useState } from "react";
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
    <div style={wrap}>
      <div style={card}>
        <div style={eyebrow}>household accounts</div>
        <h1 style={title}>The House Ledger</h1>

        <div style={tabRow}>
          <button
            style={{ ...tab, ...(mode === "signin" ? tabActive : {}) }}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            type="button"
          >
            Sign in
          </button>
          <button
            style={{ ...tab, ...(mode === "signup" ? tabActive : {}) }}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            type="button"
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <label style={label}>Email</label>
          <input
            style={input}
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label style={label}>Password</label>
          <input
            style={input}
            type="password"
            required
            minLength={6}
            placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div style={errorText}>{error}</div>}
          <button style={btn} disabled={loading}>
            {mode === "signin" ? <LogIn size={15} style={iconStyle} /> : <UserPlus size={15} style={iconStyle} />}
            {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "signup" && (
          <p style={hint}>Pick any password you'll remember — there's no email verification step, so you're in as soon as you create the account.</p>
        )}
      </div>
    </div>
  );
}

const wrap = {
  minHeight: "100vh",
  background: "#12201C",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Inter', system-ui, sans-serif",
  padding: 20,
};
const card = {
  width: "100%",
  maxWidth: 360,
  background: "#EDE8DA",
  borderRadius: 14,
  padding: "28px 24px",
  color: "#2C2A22",
  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
};
const eyebrow = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  opacity: 0.55,
  marginBottom: 4,
};
const title = { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: 0 };
const tabRow = { display: "flex", gap: 6, marginTop: 18 };
const tab = {
  flex: 1,
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 20,
  border: "1px solid rgba(44,42,34,0.2)",
  background: "transparent",
  color: "#2C2A22",
  cursor: "pointer",
};
const tabActive = { background: "#2C2A22", borderColor: "#2C2A22", color: "#EDE8DA" };
const label = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  opacity: 0.55,
  marginBottom: 6,
  marginTop: 12,
};
const input = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "'Inter', sans-serif",
  border: "1px solid rgba(44,42,34,0.2)",
  borderRadius: 7,
  background: "#F7F4EA",
  color: "#2C2A22",
};
const btn = {
  width: "100%",
  padding: "12px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  background: "#2C2A22",
  color: "#EDE8DA",
  cursor: "pointer",
  marginTop: 16,
};
const iconStyle = { marginRight: 6, verticalAlign: -3 };
const errorText = { fontSize: 12.5, color: "#9B4A36", marginTop: 8 };
const hint = { fontSize: 11.5, opacity: 0.55, marginTop: 12, lineHeight: 1.4 };
