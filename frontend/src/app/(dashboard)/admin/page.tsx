"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import {
  ShieldCheck, Users, Ticket, Trash2, Plus, ChevronDown, ChevronUp,
  RefreshCw, Eye, EyeOff, AlertTriangle, X, Check,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  has_password: boolean;
  created_at: string;
  avatar_url: string | null;
}

interface InvitationCode {
  id: string;
  code: string;
  email: string | null;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

interface LoginLog {
  id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    login: "Přihlášení",
    register: "Registrace",
    password_change: "Změna hesla",
    google_login: "Google přihlášení",
  };
  return map[action] ?? action;
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [tab, setTab] = useState<"users" | "codes">("users");
  const [fetching, setFetching] = useState(true);

  // User edit modal
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ display_name: "", role: "teacher", is_active: true, new_password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  // Delete user
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Logs
  const [logsUserId, setLogsUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Codes
  const [newCodeEmail, setNewCodeEmail] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.replace("/quizzes");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadData().finally(() => setFetching(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    const [u, c] = await Promise.all([
      apiClient.get("/admin/users"),
      apiClient.get("/admin/codes"),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setCodes(Array.isArray(c) ? c : []);
  };

  const openEditModal = (u: AdminUser) => {
    setEditUser(u);
    setEditForm({ display_name: u.display_name ?? "", role: u.role, is_active: u.is_active, new_password: "" });
    setEditMsg(null);
    setShowPwd(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const body: Record<string, unknown> = {
        display_name: editForm.display_name || null,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.new_password) body.new_password = editForm.new_password;
      const updated = await apiClient.patch(`/admin/users/${editUser.id}`, body);
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
      setEditMsg({ ok: true, text: "Uloženo" });
      setEditForm((f) => ({ ...f, new_password: "" }));
    } catch (err) {
      setEditMsg({ ok: false, text: err instanceof Error ? err.message : "Chyba" });
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUserId) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/admin/users/${deletingUserId}`);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUserId));
      setDeletingUserId(null);
      if (editUser?.id === deletingUserId) setEditUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba při mazání");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openLogs = async (userId: string) => {
    setLogsUserId(userId);
    setLogsLoading(true);
    try {
      const data = await apiClient.get(`/admin/users/${userId}/logs`);
      setLogs(Array.isArray(data) ? data : []);
    } finally {
      setLogsLoading(false);
    }
  };

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCode(true);
    try {
      const c = await apiClient.post("/admin/codes", { email: newCodeEmail || null });
      setCodes((prev) => [c, ...prev]);
      setNewCodeEmail("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setCreatingCode(false);
    }
  };

  const deleteCode = async (id: string) => {
    setDeletingCodeId(id);
    try {
      await apiClient.delete(`/admin/codes/${id}`);
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setDeletingCodeId(null);
    }
  };

  if (isLoading || !user) return <div className="p-8">Načítání...</div>;
  if (user.role !== "admin") return null;
  if (fetching) return <div className="p-8">Načítání...</div>;

  const logsUser = users.find((u) => u.id === logsUserId);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck size={26} className="text-violet-600" />
        <h1 className="text-2xl font-black text-gray-800">Admin</h1>
        <button onClick={() => loadData()} className="ml-auto text-gray-400 hover:text-gray-700" title="Obnovit">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === "users" ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Users size={15} /> Uživatelé ({users.length})
        </button>
        <button
          onClick={() => setTab("codes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === "codes" ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Ticket size={15} /> Zvací kódy ({codes.filter((c) => !c.used).length} volných)
        </button>
      </div>

      {/* ── Users tab ─────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className={`border rounded-xl p-4 bg-white shadow-sm ${!u.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 truncate">{u.display_name || "(bez jména)"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                      u.role === "admin" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>{u.role === "admin" ? "Admin" : "Uživatel"}</span>
                    {!u.is_active && <span className="text-xs px-2 py-0.5 rounded-full font-bold border bg-red-50 text-red-600 border-red-200">deaktivován</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Registrace: {formatDate(u.created_at)} · {u.has_password ? "heslo" : "bez hesla"} · {u.avatar_url ? "avatar" : ""}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openLogs(u.id)}
                    className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded hover:bg-gray-100"
                    title="Zobrazit logy"
                  >
                    Logy
                  </button>
                  <button
                    onClick={() => openEditModal(u)}
                    className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded hover:bg-blue-100"
                  >
                    Upravit
                  </button>
                  {u.id !== user.id && (
                    <button
                      onClick={() => setDeletingUserId(u.id)}
                      className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1.5 rounded hover:bg-red-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Codes tab ─────────────────────────────────────────────────────── */}
      {tab === "codes" && (
        <div>
          <form onSubmit={createCode} className="flex gap-2 mb-5">
            <input
              type="email"
              value={newCodeEmail}
              onChange={(e) => setNewCodeEmail(e.target.value)}
              placeholder="E-mail (volitelný — pro konkrétního uživatele)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              type="submit"
              disabled={creatingCode}
              className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap"
            >
              <Plus size={15} /> {creatingCode ? "Generuji..." : "Nový kód"}
            </button>
          </form>

          <div className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className={`border rounded-xl p-4 bg-white shadow-sm flex items-center gap-4 ${c.used ? "opacity-60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-gray-800 tracking-widest">{c.code}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.email ? `Pro: ${c.email} · ` : ""}
                    {c.used ? `Použit: ${formatDate(c.used_at!)}` : "Volný"}
                    {" · "}Vytvořen: {formatDate(c.created_at)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${c.used ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                  {c.used ? "Použit" : "Volný"}
                </span>
                {!c.used && (
                  <button
                    onClick={() => deleteCode(c.id)}
                    disabled={deletingCodeId === c.id}
                    className="text-red-500 hover:text-red-700 disabled:opacity-40"
                    title="Smazat kód"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {codes.length === 0 && (
              <p className="text-gray-400 text-center py-8">Žádné kódy. Vygeneruj první!</p>
            )}
          </div>
        </div>
      )}

      {/* ── Edit user modal ───────────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Upravit uživatele</h2>
              <button onClick={() => setEditUser(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <p className="text-sm text-gray-500">{editUser.email}</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Zobrazované jméno</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option value="teacher">Uživatel</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-gray-700">Aktivní účet</label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nové heslo (volitelné)</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={editForm.new_password}
                    onChange={(e) => setEditForm((f) => ({ ...f, new_password: e.target.value }))}
                    minLength={8}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400 pr-9"
                    placeholder="Min 8 znaků"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {editMsg && (
                <p className={`text-sm flex items-center gap-1 ${editMsg.ok ? "text-green-600" : "text-red-600"}`}>
                  {editMsg.ok ? <Check size={14} /> : <AlertTriangle size={14} />} {editMsg.text}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={editSaving} className="flex-1 bg-violet-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 text-sm">
                  {editSaving ? "Ukládám..." : "Uložit"}
                </button>
                {editUser.id !== user.id && (
                  <button
                    type="button"
                    onClick={() => { setEditUser(null); setDeletingUserId(editUser.id); }}
                    className="px-3 py-2 text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-sm"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
                  Zavřít
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete user modal ─────────────────────────────────────────────── */}
      {deletingUserId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0" />
              <h2 className="text-lg font-bold text-gray-800">Smazat uživatele?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Tato akce je nevratná. Všechna data uživatele budou smazána.
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteUser} disabled={deleteLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleteLoading ? "Mažu..." : "Ano, smazat"}
              </button>
              <button onClick={() => setDeletingUserId(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logs modal ────────────────────────────────────────────────────── */}
      {logsUserId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-800">
                Aktivita — {logsUser?.email}
              </h2>
              <button onClick={() => setLogsUserId(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              {logsLoading ? (
                <p className="text-gray-400 text-center py-8">Načítám...</p>
              ) : logs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Žádné záznamy.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-700">{actionLabel(l.action)}</span>
                        <span className="text-xs text-gray-400">{formatDate(l.created_at)}</span>
                      </div>
                      {l.ip_address && <p className="text-xs text-gray-500">IP: {l.ip_address}</p>}
                      {l.user_agent && <p className="text-xs text-gray-400 truncate">{l.user_agent}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
