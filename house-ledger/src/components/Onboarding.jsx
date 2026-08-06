import { useState } from "react";
import { supabase } from "../supabaseClient";

// Shown once per person, right after their first magic-link login, so their
// auth account gets linked to a friendly name in the shared `members` table.
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
      .insert({
        auth_user_id: session.user.id,
        email: session.user.email,
        name: name.trim(),
      })
      .select()
      .single();
    setLoading(false);
    if (error) setError(error.message);
    else onDone(data);
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={eyebrow}>one-time setup</div>
        <h1 style={title}>What should we call you?</h1>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <input
            style={input}
            required
            placeholder="e.g. Phani"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <div style={errorText}>{error}</div>}
          <button className="tap-btn" style={btn} disabled={loading}>
            {loading ? "Saving…" : "Join the ledger"}
          </button>
        </form>
      </div>
    </div>
  );
}

const wrap = {
  height: "100dvh",
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
const title = { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 };
const input = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 16,
  border: "1px solid rgba(44,42,34,0.2)",
  borderRadius: 7,
  background: "#F7F4EA",
  color: "#2C2A22",
  marginBottom: 10,
};
const btn = {
  width: "100%",
  padding: "12px",
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  background: "#2C2A22",
  color: "#EDE8DA",
  cursor: "pointer",
};
const errorText = { fontSize: 12.5, color: "#9B4A36", marginBottom: 8 };
