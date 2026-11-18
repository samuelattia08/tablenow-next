"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useStoredAccount } from "@/lib/use-stored-account";

export default function PartnerFloorPlanPage() {
  const partnerId = useStoredAccount<"partners">("tablenow_partner_id", "/partner/login");
  const [selectedId, setSelectedId] = useState<Id<"tables"> | null>(null);
  const [zone, setZone] = useState("standard");
  const [capacity, setCapacity] = useState(4);
  const [priceEur, setPriceEur] = useState(180);
  const [saved, setSaved] = useState(false);


  const tables = useQuery(
    api.tables.listByPartner,
    partnerId ? { partnerId } : "skip"
  );
  const updateTable = useMutation(api.tables.updateTable);

  const grid = useMemo(() => {
    if (!tables) return null;
    const rows = Math.max(...tables.map((t) => t.row), 0) + 1;
    const cols = Math.max(...tables.map((t) => t.col), 0) + 1;
    const map: (typeof tables[number] | null)[][] = Array.from(
      { length: rows },
      () => Array(cols).fill(null)
    );
    for (const t of tables) map[t.row][t.col] = t;
    return map;
  }, [tables]);

  const selectedTable = tables?.find((t) => t._id === selectedId);

  function selectTable(t: NonNullable<typeof tables>[number]) {
    setSelectedId(t._id);
    setZone(t.zone);
    setCapacity(t.capacity);
    setPriceEur(t.priceEur);
  }

  async function handleSave() {
    if (!selectedId) return;
    await updateTable({ tableId: selectedId, zone, capacity, priceEur });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-xl sm:text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <Link
            href="/partner/dashboard"
            className="text-sm text-muted hover:text-text"
          >
            Tableau de bord
          </Link>
        </div>

        <h1 className="mt-6 text-lg sm:text-xl font-semibold">
          Plan de salle
        </h1>
        <p className="mt-1 text-sm text-muted">
          Clique sur une table pour modifier sa zone, sa capacité et son prix.
        </p>

        <div className="mt-6 overflow-x-auto">
          {!grid && (
            <p className="text-sm text-muted py-8 text-center">
              Chargement du plan de salle...
            </p>
          )}
          {grid && (
            <div
              className="grid gap-1.5 sm:gap-2 min-w-[520px]"
              style={{
                gridTemplateColumns: `repeat(${grid[0]?.length ?? 10}, minmax(0, 1fr))`,
              }}
            >
              {grid.flatMap((row, ri) =>
                row.map((t, ci) => {
                  if (!t) return <div key={`${ri}-${ci}`} />;
                  const isSelected = selectedId === t._id;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => selectTable(t)}
                      className={[
                        "aspect-square rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center transition-all",
                        t.zone === "vip"
                          ? "gradient-bg text-white hover:brightness-110"
                          : "bg-surface-alt border border-border hover:border-blue/50",
                        isSelected
                          ? "ring-2 ring-offset-2 ring-offset-bg ring-text scale-105"
                          : "",
                      ].join(" ")}
                    >
                      {t.number}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {selectedTable && (
          <div className="card mt-6 p-5">
            <p className="font-semibold">Table {selectedTable.number}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted">Zone</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="input-field mt-1 w-full px-3 py-2 text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">
                  Capacité (personnes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="input-field mt-1 w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted">
                  Prix (€)
                </label>
                <input
                  type="number"
                  min={0}
                  value={priceEur}
                  onChange={(e) => setPriceEur(Number(e.target.value))}
                  className="input-field mt-1 w-full px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                className="btn-primary px-4 py-2 text-sm"
              >
                Enregistrer
              </button>
              {saved && <span className="text-sm text-blue">✅ Enregistré</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
