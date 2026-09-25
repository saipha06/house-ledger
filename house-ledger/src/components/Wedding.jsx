import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Wallet, CalendarDays, Users } from "lucide-react";
import WeddingDashboard from "./WeddingDashboard";
import WeddingBudget from "./WeddingBudget";
import WeddingEvents from "./WeddingEvents";
import WeddingGuests from "./WeddingGuests";

const SUBTABS = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["budget", "Budget", Wallet],
  ["events", "Events", CalendarDays],
  ["guests", "Guests", Users],
];

export default function Wedding({ tasks, subtasks, vendorOptions, miscItems, settings, events, guests, refresh }) {
  const [view, setView] = useState("dashboard");

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto -mx-1 px-1 [-webkit-overflow-scrolling:touch]">
        {SUBTABS.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold rounded-full border cursor-pointer whitespace-nowrap ${
              view === key ? "btn-gradient border-transparent" : "bg-paper-2 border-charcoal/20 text-charcoal"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {view === "dashboard" && (
            <WeddingDashboard tasks={tasks} subtasks={subtasks} vendorOptions={vendorOptions} miscItems={miscItems} guests={guests} settings={settings} refresh={refresh} />
          )}
          {view === "budget" && (
            <WeddingBudget tasks={tasks} subtasks={subtasks} vendorOptions={vendorOptions} miscItems={miscItems} settings={settings} refresh={refresh} />
          )}
          {view === "events" && <WeddingEvents events={events} refresh={refresh} />}
          {view === "guests" && <WeddingGuests guests={guests} refresh={refresh} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
