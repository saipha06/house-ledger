import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Link2, Unlink } from "lucide-react";
import { supabase, isMock } from "../supabaseClient";
import { buildSplitwiseAuthorizeUrl } from "../lib/splitwiseAuth";
import SectionLabel from "./SectionLabel";
import Avatar from "./Avatar";

export default function House({ members, onSave, busy, me, splitwiseConnection, refresh }) {
  const [local, setLocal] = useState(members);
  useEffect(() => setLocal(members), [members]);
  const update = (id, name) => setLocal((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));

  return (
    <div>
      <SectionLabel n="04" title="Household" />
      <div className="flex flex-col gap-2.5 mb-[18px]">
        {local.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2.5 text-[13px]"
          >
            <Avatar name={m.name} size={30} ring />
            <input
              value={m.name}
              onChange={(e) => update(m.id, e.target.value)}
              className="flex-1 px-1 py-3 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal"
            />
          </motion.div>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={busy}
        onClick={() => onSave(local)}
        className="w-full py-3.5 text-[15px] font-semibold rounded-xl border-none btn-gradient cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 mb-6"
      >
        <Check size={15} />
        Save names
      </motion.button>

      <SplitwiseSection me={me} connection={splitwiseConnection} refresh={refresh} />
    </div>
  );
}

function SplitwiseSection({ me, connection, refresh }) {
  const [banner, setBanner] = useState(null); // { kind: "success" | "error", text }
  const [busy, setBusy] = useState(false);

  // Splitwise redirects back here with ?splitwise_connected=1 or
  // ?splitwise_error=... after the OAuth round trip — surface it once, then
  // clean the URL so a refresh doesn't re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("splitwise_connected");
    const error = params.get("splitwise_error");
    if (connected) setBanner({ kind: "success", text: "Splitwise connected." });
    else if (error) setBanner({ kind: "error", text: `Couldn't connect Splitwise (${error}).` });
    if (connected || error) {
      params.delete("splitwise_connected");
      params.delete("splitwise_error");
      const next = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", next);
    }
  }, []);

  const connect = async () => {
    if (isMock) {
      // No real OAuth round trip in mock mode — simulate an instant
      // successful connection so the rest of the flow (group/friend picker,
      // sending) is testable locally without a real Splitwise app.
      setBusy(true);
      await supabase.from("splitwise_connections").upsert(
        { member_id: me.id, access_token: "mock-token", splitwise_user_id: 999, splitwise_user_name: "Mock Splitwise User" },
        { onConflict: "member_id" }
      );
      await refresh();
      setBusy(false);
      return;
    }
    window.location.href = buildSplitwiseAuthorizeUrl(me.id);
  };

  const disconnect = async () => {
    setBusy(true);
    await supabase.from("splitwise_connections").delete().eq("member_id", me.id);
    await refresh();
    setBusy(false);
  };

  return (
    <div>
      <SectionLabel n="05" title="Splitwise" />
      {banner && (
        <div className={`text-[12.5px] mb-3 ${banner.kind === "success" ? "text-sage" : "text-rust"}`}>{banner.text}</div>
      )}
      <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5">
        {connection ? (
          <>
            <div className="text-[13px] mb-3">
              Connected as <span className="font-semibold">{connection.splitwise_user_name || "your Splitwise account"}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy}
              onClick={disconnect}
              className="w-full py-2.5 text-[13px] font-semibold rounded-lg border border-charcoal/20 bg-transparent cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Unlink size={13} />
              Disconnect
            </motion.button>
          </>
        ) : (
          <>
            <div className="text-[12.5px] opacity-70 mb-3">Connect your own Splitwise account to send individual Casa expenses over — this is just for you, not the whole house.</div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy}
              onClick={connect}
              className="w-full py-2.5 text-[13px] font-semibold rounded-lg btn-gradient cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Link2 size={13} />
              Connect Splitwise
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
