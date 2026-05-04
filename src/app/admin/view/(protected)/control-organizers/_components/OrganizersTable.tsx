"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, PowerOff } from "lucide-react";

type Organizer = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  plan_tier: "essencial" | "profissional" | "enterprise" | string;
  access_disabled: boolean;
  created_at: string;
  plan_updated_at: string | null;
};

const PLANS: Array<Organizer["plan_tier"]> = ["essencial", "profissional", "enterprise"];

export function OrganizersTable({ initial }: { initial: Organizer[] }) {
  const [rows, setRows] = useState<Organizer[]>(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function patch(id: string, body: Partial<Pick<Organizer, "access_disabled" | "plan_tier">>) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/organizers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Falha ao atualizar");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...(typeof body.access_disabled === "boolean" ? { access_disabled: body.access_disabled } : {}),
                ...(body.plan_tier ? { plan_tier: body.plan_tier, plan_updated_at: new Date().toISOString() } : {}),
              }
            : r,
        ),
      );
      startTransition(() => router.refresh());
    } catch {
      setError("Erro de rede");
    } finally {
      setPendingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
        Nenhum organizador cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-950/60 border border-red-900 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3 text-left font-black">Organizador</th>
                <th className="px-4 py-3 text-left font-black">Contato</th>
                <th className="px-4 py-3 text-left font-black">Plano</th>
                <th className="px-4 py-3 text-left font-black">Cadastro</th>
                <th className="px-4 py-3 text-right font-black">Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {rows.map((r) => {
                const pending = pendingId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{r.full_name ?? "—"}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                        {r.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div>{r.email ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{r.phone_number ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={pending}
                        value={r.plan_tier}
                        onChange={(e) =>
                          patch(r.id, { plan_tier: e.target.value as Organizer["plan_tier"] })
                        }
                        className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 uppercase font-black tracking-widest focus:border-ruby focus:outline-none disabled:opacity-50"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      {r.plan_updated_at && (
                        <div className="text-[10px] text-zinc-600 mt-1">
                          atualizado em{" "}
                          {new Date(r.plan_updated_at).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={pending}
                        onClick={() => patch(r.id, { access_disabled: !r.access_disabled })}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black border transition-colors disabled:opacity-50 ${
                          r.access_disabled
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        {pending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : r.access_disabled ? (
                          <PowerOff className="w-3 h-3" />
                        ) : (
                          <Power className="w-3 h-3" />
                        )}
                        {r.access_disabled ? "Bloqueado" : "Ativo"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
