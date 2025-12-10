import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X, StickyNote, ArrowLeft } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesProps {
  currentUser: string | null;
  theme?: "light" | "dark";
  onBack: () => void;
}

export function Notes({ currentUser, theme = "dark", onBack }: NotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("nicssim-notes");
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("nicssim-notes", JSON.stringify(notes));
  }, [notes]);

  const handleCreateNote = () => {
    if (!newTitle.trim() && !newContent.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title: newTitle.trim() || "Untitled Note",
      content: newContent.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes([newNote, ...notes]);
    setNewTitle("");
    setNewContent("");
    setIsCreating(false);
  };

  const handleUpdateNote = (id: string) => {
    setNotes(notes.map(note => 
      note.id === id 
        ? { ...note, title: newTitle, content: newContent, updatedAt: new Date().toISOString() }
        : note
    ));
    setEditingId(null);
    setNewTitle("");
    setNewContent("");
  };

  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      setNotes(notes.filter(note => note.id !== id));
    }
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setNewTitle(note.title);
    setNewContent(note.content);
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    setNewTitle("");
    setNewContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "bg-card-dark hover:bg-gray-700 text-gray-300"
                  : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex-1">
              <h1 className={`text-2xl ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Personal Notes
              </h1>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Keep track of important information and observations
              </p>
            </div>
            {!isCreating && !editingId && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF8200] to-[#FF6B00] text-white rounded-lg hover:from-[#FF6B00] hover:to-[#E67300] transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            )}
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className={`rounded-lg p-6 mb-6 border ${
            theme === "dark"
              ? "bg-card-dark border-gray-700"
              : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter note title..."
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    theme === "dark"
                      ? "bg-[#1a2332] border-gray-600 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                  autoFocus
                />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Content
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter your notes here..."
                  rows={8}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${
                    theme === "dark"
                      ? "bg-[#1a2332] border-gray-600 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEditing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={() => editingId ? handleUpdateNote(editingId) : handleCreateNote()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF8200] to-[#FF6B00] text-white rounded-lg hover:from-[#FF6B00] hover:to-[#E67300] transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Update Note" : "Save Note"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !isCreating && !editingId ? (
          <div className={`text-center py-16 rounded-lg border-2 border-dashed ${
            theme === "dark"
              ? "border-gray-700 bg-card-dark/50"
              : "border-gray-300 bg-gray-50"
          }`}>
            <StickyNote className={`w-16 h-16 mx-auto mb-4 ${
              theme === "dark" ? "text-gray-600" : "text-gray-400"
            }`} />
            <h3 className={`text-lg mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              No notes yet
            </h3>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
              Create your first note to get started
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF8200] to-[#FF6B00] text-white rounded-lg hover:from-[#FF6B00] hover:to-[#E67300] transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Note
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`rounded-lg p-5 border transition-all ${
                  theme === "dark"
                    ? "bg-card-dark border-gray-700 hover:border-gray-600"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {note.title}
                    </h3>
                    <p className={`text-sm whitespace-pre-wrap mb-3 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {note.content}
                    </p>
                    <div className={`flex items-center gap-4 text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-gray-500"
                    }`}>
                      <span>Created: {formatDate(note.createdAt)}</span>
                      {note.updatedAt !== note.createdAt && (
                        <span>Updated: {formatDate(note.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(note)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === "dark"
                          ? "hover:bg-gray-700 text-gray-400 hover:text-gray-300"
                          : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
                      }`}
                      title="Edit note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === "dark"
                          ? "hover:bg-red-900/20 text-gray-400 hover:text-red-400"
                          : "hover:bg-red-50 text-gray-600 hover:text-red-600"
                      }`}
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
