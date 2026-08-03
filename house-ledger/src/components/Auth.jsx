import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Mail } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={eyebrow}>household accounts</div>
        <h1 style={title}>The House Ledger</h1>
        {sent ? (
          <div style={{ marginTop: 18 }}>
            <p style={body}>
              Check <strong>{email}</strong> for a sign-in link. Tap it on this device to open the ledger.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18 }}>
            <label style={label}>Your email</label>
            <input
              style={input}
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <div style={errorText}>{error}</div>}
            <button style={btn} disabled={loading}>
              <Mail size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
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
const title = {
  fontFamily: "'Fraunces', serif",
  fontSize: 26,
  fontWeight: 600,
  margin: 0,
};
const label = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  opacity: 0.55,
  marginBottom: 6,
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
  marginBottom: 10,
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
  marginTop: 6,
};
const body = { fontSize: 14, lineHeight: 1.5 };
const errorText = { fontSize: 12.5, color: "#9B4A36", marginBottom: 8 };
