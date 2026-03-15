"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Users, Plus, Trash2, AlertTriangle, X, Search, ExternalLink } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

interface Group {
  id: string;
  name: string;
  description: string | null;
  session_count: number;
  created_at: string;
}

export default function GroupsPage() {
  const { t } = useLang();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) loadGroups().finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadGroups = async () => {
    const data = await apiClient.get("/groups");
    setGroups(Array.isArray(data) ? data : []);
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post("/groups", {
        name: form.name,
        description: form.description || null,
      });
      setShowCreate(false);
      setForm({ name: "", description: "" });
      await loadGroups();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/groups/${deletingId}`);
      setGroups((prev) => prev.filter((g) => g.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8">{t("common.loading")}</div>;

  const filtered = groups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0" />
              <h2 className="text-lg font-bold text-gray-800">{t("groups.deleteTitle")}</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {t("groups.deleteConfirm")}
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleteLoading ? t("common.deleting") : t("common.yesDelete")}
              </button>
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={22} className="text-blue-500" /> {t("groups.title")}
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus size={18} /> <span className="hidden sm:inline">{t("groups.newGroup")}</span>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createGroup} className="bg-white border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t("groups.newGroup")}</h2>
            <button type="button" onClick={() => setShowCreate(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("groups.name")} <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder={t("groups.namePlaceholder")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("groups.description")} <span className="text-gray-400 font-normal">{t("common.optional")}</span></label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("groups.descriptionPlaceholder")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {creating ? t("common.creating") : t("groups.createGroup")}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      {/* Search */}
      {groups.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("groups.searchPlaceholder")}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {filtered.length === 0 && groups.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border rounded-lg bg-gray-50">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold">{t("groups.noGroups")}</p>
          <p className="text-sm mt-1">{t("groups.noGroupsDesc")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-8">{t("groups.noMatch", { search })}</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((g) => (
            <div key={g.id} className="border p-4 rounded-lg bg-white shadow-sm flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-400 shrink-0" />
                  <h3 className="text-lg font-semibold">{g.name}</h3>
                </div>
                {g.description && <p className="text-sm text-gray-500 mt-0.5">{g.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {t("groups.sessionCount", { n: g.session_count })}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center gap-1 text-sm text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded hover:bg-blue-100"
                  title={t("common.open")}
                >
                  <ExternalLink size={13} /> <span className="hidden sm:inline">{t("common.open")}</span>
                </Link>
                <button
                  onClick={() => setDeletingId(g.id)}
                  className="text-sm text-red-500 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded hover:bg-red-100"
                  title="Delete group"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
