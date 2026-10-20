import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import storageService from "../services/StorageService";
import type { Note } from "../types/Activity";

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    storageService.initialize().then((data) => {
      if (active) setNotes(sortNotes(data.notes ?? []));
    }).catch((error) => {
      console.error("Notizen konnten nicht geladen werden:", error);
      if (active) setMessage("Notizen konnten nicht geladen werden.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function addNote() {
    const text = newNote.trim();
    if (!text || saving) return;
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: text,
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    setSaving(true);
    setMessage("");
    try {
      await storageService.update((data) => ({ ...data, notes: [note, ...(data.notes ?? [])] }));
      setNotes((current) => sortNotes([note, ...current]));
      setNewNote("");
    } catch (error) {
      console.error("Notiz konnte nicht gespeichert werden:", error);
      setMessage("Notiz konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleNote(note: Note) {
    if (saving) return;
    const updated = { ...note, completed: !note.completed, updatedAt: new Date().toISOString() };
    setSaving(true);
    setMessage("");
    try {
      await storageService.update((data) => ({
        ...data,
        notes: (data.notes ?? []).map((item) => item.id === note.id ? updated : item),
      }));
      setNotes((current) => sortNotes(current.map((item) => item.id === note.id ? updated : item)));
    } catch (error) {
      console.error("Notizstatus konnte nicht gespeichert werden:", error);
      setMessage("Änderung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(note: Note) {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await storageService.update((data) => ({
        ...data,
        notes: (data.notes ?? []).filter((item) => item.id !== note.id),
      }));
      setNotes((current) => current.filter((item) => item.id !== note.id));
    } catch (error) {
      console.error("Notiz konnte nicht gelöscht werden:", error);
      setMessage("Notiz konnte nicht gelöscht werden.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-2xl p-6">Notizen werden geladen …</main>;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 text-gray-900">
      <header>
        <h1 className="text-2xl font-semibold">Notizen</h1>
        <p className="mt-1 text-sm text-gray-500">Deine Notizen und Aufgaben werden lokal gespeichert.</p>
      </header>

      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void addNote(); }}>
        <label className="sr-only" htmlFor="new-note">Neue Notiz</label>
        <input
          id="new-note"
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-500"
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          placeholder="Notiz eingeben …"
        />
        <button type="submit" disabled={saving || !newNote.trim()} aria-label="Notiz hinzufügen" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={18} /> <span className="hidden sm:inline">Hinzufügen</span>
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white" aria-label="Notizenliste">
        {notes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Noch keine Notizen. Füge oben deine erste hinzu.</p>
        ) : notes.map((note) => (
          <article key={note.id} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
            <button
              type="button"
              onClick={() => void toggleNote(note)}
              disabled={saving}
              aria-label={note.completed ? "Als offen markieren" : "Als erledigt markieren"}
              aria-pressed={Boolean(note.completed)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${note.completed ? "border-green-600 bg-green-600 text-white" : "border-gray-300 text-transparent hover:border-green-600 hover:text-green-600"}`}
            >
              <Check size={17} strokeWidth={2.5} />
            </button>
            <span className={`min-w-0 flex-1 break-words text-sm ${note.completed ? "text-gray-400 line-through" : "text-gray-800"}`}>{note.title}{note.content ? ` — ${note.content}` : ""}</span>
            <button
              type="button"
              onClick={() => void deleteNote(note)}
              disabled={saving}
              aria-label={`Notiz löschen: ${note.title}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={17} />
            </button>
          </article>
        ))}
      </section>
      <p role="status" className="text-center text-sm text-red-600">{message}</p>
    </main>
  );
}
