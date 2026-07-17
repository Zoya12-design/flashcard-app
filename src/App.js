import { useState, useEffect } from "react";

const STORAGE_KEY = "flashcard-app-data";

const DIFFICULTY_STYLES = {
  easy: { bg: "#E4EEE1", border: "#6B9B7C", text: "#33513B", label: "Easy" },
  medium: { bg: "#F7ECD8", border: "#D9A441", text: "#5C4416", label: "Medium" },
  hard: { bg: "#F3E1DC", border: "#C2604A", text: "#5C2A1E", label: "Hard" },
};

const DEFAULT_SUBJECTS = ["Biology", "Physics", "Computer science"];

const INITIAL_CARDS = [
  {
    id: 1,
    subject: "Biology",
    question: "What is the powerhouse of the cell?",
    answer: "The mitochondria — it generates most of the cell's ATP through cellular respiration.",
    difficulty: "easy",
    status: null,
  },
  {
    id: 2,
    subject: "Physics",
    question: "State Newton's second law of motion.",
    answer: "Force equals mass times acceleration (F = ma).",
    difficulty: "medium",
    status: null,
  },
  {
    id: 3,
    subject: "Computer science",
    question: "What does the Big-O notation O(n log n) describe?",
    answer: "An algorithm whose running time grows proportionally to n multiplied by the logarithm of n — typical of efficient sorting algorithms like mergesort.",
    difficulty: "hard",
    status: null,
  },
];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadSavedData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Legacy format: a plain array of cards with no subjects
    if (Array.isArray(parsed)) {
      const cards = parsed.map((c) => ({ ...c, subject: c.subject || DEFAULT_SUBJECTS[0] }));
      return { cards, subjects: DEFAULT_SUBJECTS, activeSubject: DEFAULT_SUBJECTS[0] };
    }
    if (parsed && Array.isArray(parsed.cards)) {
      const subjects = Array.isArray(parsed.subjects) && parsed.subjects.length ? parsed.subjects : DEFAULT_SUBJECTS;
      return {
        cards: parsed.cards,
        subjects,
        activeSubject: parsed.activeSubject && subjects.includes(parsed.activeSubject) ? parsed.activeSubject : subjects[0],
      };
    }
  } catch (err) {
    console.error("Could not load saved data:", err);
  }
  return null;
}

const PAPER = "#F6F1E3";
const PAPER_BACK = "#EFE8D3";
const INK = "#2B2A28";
const INK_SOFT = "#6B675E";
const BG = "#232823";
const BG_PANEL = "#2C332C";
const CHALK = "#E8B84B";
const RULE = "#D8CDA9";

export default function FlashcardApp() {
  const saved = loadSavedData();
  const [cards, setCards] = useState(() => (saved ? saved.cards : INITIAL_CARDS));
  const [subjects, setSubjects] = useState(() => (saved ? saved.subjects : DEFAULT_SUBJECTS));
  const [activeSubject, setActiveSubject] = useState(() => (saved ? saved.activeSubject : DEFAULT_SUBJECTS[0]));

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", difficulty: "easy" });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // Persist everything whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards, subjects, activeSubject }));
    } catch (err) {
      console.error("Could not save data:", err);
    }
  }, [cards, subjects, activeSubject]);

  const filteredCards = cards.filter((c) => c.subject === activeSubject);

  // Keyboard shortcuts: space = flip, arrows = navigate
  useEffect(() => {
    function handleKeyDown(e) {
      if (pendingDelete !== null || showSubjectForm) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, filteredCards.length, pendingDelete, showSubjectForm]);

  function handleSelectSubject(subject) {
    setActiveSubject(subject);
    setIndex(0);
    setFlipped(false);
    setShowForm(false);
  }

  function handleAddSubject(e) {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    const exists = subjects.some((s) => s.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setSubjects((prev) => [...prev, name]);
    }
    setNewSubjectName("");
    setShowSubjectForm(false);
    handleSelectSubject(exists ? subjects.find((s) => s.toLowerCase() === name.toLowerCase()) : name);
  }

  function goTo(newIndex) {
    setFlipped(false);
    setIndex(newIndex);
  }

  function handlePrev() {
    if (filteredCards.length === 0) return;
    setIndex((i) => (i - 1 + filteredCards.length) % filteredCards.length);
    setFlipped(false);
  }

  function handleNext() {
    if (filteredCards.length === 0) return;
    setIndex((i) => (i + 1) % filteredCards.length);
    setFlipped(false);
  }

  function handleShuffle() {
    setCards((prev) => {
      const mine = shuffleArray(prev.filter((c) => c.subject === activeSubject));
      const others = prev.filter((c) => c.subject !== activeSubject);
      return [...others, ...mine];
    });
    goTo(0);
  }

  function handleMarkStatus(cardId, status) {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: c.status === status ? null : status } : c))
    );
  }

  function handleAddCard(e) {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return;
    const newCard = {
      id: Date.now(),
      subject: activeSubject,
      question: form.question.trim(),
      answer: form.answer.trim(),
      difficulty: form.difficulty,
      status: null,
    };
    setCards((prev) => [...prev, newCard]);
    setForm({ question: "", answer: "", difficulty: "easy" });
    setShowForm(false);
    goTo(filteredCards.length);
  }

  function requestDelete(cardId) {
    setPendingDelete(cardId);
  }

  function confirmDelete() {
    setCards((prev) => prev.filter((c) => c.id !== pendingDelete));
    setPendingDelete(null);
    goTo(0);
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  const knownCount = filteredCards.filter((c) => c.status === "known").length;
  const progressPct = filteredCards.length ? Math.round((knownCount / filteredCards.length) * 100) : 0;
  const card = filteredCards.length ? filteredCards[Math.min(index, filteredCards.length - 1)] : null;
  const diff = card ? DIFFICULTY_STYLES[card.difficulty] : null;

  return (
    <div
      style={{ background: BG, fontFamily: "system-ui, sans-serif", minHeight: "100%" }}
      className="w-full flex flex-col items-center px-4 py-8 sm:py-12"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span style={{ color: "#B9C4B4", fontFamily: "Georgia, serif", fontSize: "20px" }}>
            Study cards
          </span>
          {card && (
            <span
              style={{
                color: "#B9C4B4",
                fontFamily: "'Courier New', monospace",
                fontSize: "13px",
                letterSpacing: "0.05em",
              }}
            >
              {index + 1} / {filteredCards.length}
            </span>
          )}
        </div>

        {/* Subject selector */}
        <div className="flex flex-wrap gap-2 mb-5">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSubject(s)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: `1px solid ${s === activeSubject ? CHALK : "#4A544A"}`,
                background: s === activeSubject ? "#3A331E" : "transparent",
                color: s === activeSubject ? CHALK : "#B9C4B4",
                fontSize: "13px",
                fontFamily: "system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setShowSubjectForm(!showSubjectForm)}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              border: "1px dashed #4A544A",
              background: "transparent",
              color: "#8A968A",
              fontSize: "13px",
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            + Subject
          </button>
        </div>

        {showSubjectForm && (
          <form onSubmit={handleAddSubject} className="flex gap-2 mb-5">
            <input
              type="text"
              autoFocus
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="e.g. Chemistry"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="submit"
              style={{
                padding: "0 16px",
                borderRadius: "8px",
                border: "none",
                background: CHALK,
                color: "#3A2C0E",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </form>
        )}

        {!card ? (
          <div className="text-center mt-6">
            <p style={{ color: "#B9C4B4", fontFamily: "Georgia, serif", fontSize: "16px", marginBottom: "16px" }}>
              No cards in {activeSubject} yet. Add one to start studying.
            </p>
            <AddCardToggleAndForm
              showForm={showForm}
              setShowForm={setShowForm}
              form={form}
              setForm={setForm}
              onSubmit={handleAddCard}
            />
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ color: "#B9C4B4", fontSize: "12px", fontFamily: "system-ui, sans-serif" }}>
                  {knownCount} of {filteredCards.length} known in {activeSubject}
                </span>
                <span style={{ color: "#B9C4B4", fontSize: "12px", fontFamily: "system-ui, sans-serif" }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "#3A423A", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: DIFFICULTY_STYLES.easy.border,
                    borderRadius: "999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={handleShuffle} style={toolButtonStyle}>
                ⤮ Shuffle
              </button>
              <button onClick={() => requestDelete(card.id)} style={{ ...toolButtonStyle, color: "#E4A196" }}>
                Delete card
              </button>
            </div>

            {/* Card */}
            <div
              onClick={() => setFlipped(!flipped)}
              style={{ perspective: "1200px" }}
              className="cursor-pointer select-none"
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: "280px",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    background: PAPER,
                    borderRadius: "12px",
                    padding: "28px 24px 24px 40px",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.15)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardChrome diff={diff} />
                  <div className="flex-1 flex items-center justify-center text-center px-2">
                    <p style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: INK, lineHeight: 1.5 }}>
                      {card.question}
                    </p>
                  </div>
                  <p style={{ color: INK_SOFT, fontSize: "12px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
                    Tap to reveal answer
                  </p>
                </div>

                {/* Back */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: PAPER_BACK,
                    borderRadius: "12px",
                    padding: "28px 24px 24px 40px",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.15)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardChrome diff={diff} />
                  <div className="flex-1 flex items-center justify-center text-center px-2">
                    <p style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: INK, lineHeight: 1.6 }}>
                      {card.answer}
                    </p>
                  </div>
                  <p style={{ color: INK_SOFT, fontSize: "12px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
                    Tap to flip back
                  </p>
                </div>
              </div>
            </div>

            {/* Mark status */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => handleMarkStatus(card.id, "learning")}
                style={{
                  ...statusButtonStyle,
                  borderColor: card.status === "learning" ? DIFFICULTY_STYLES.medium.border : "#4A544A",
                  background: card.status === "learning" ? DIFFICULTY_STYLES.medium.bg : "transparent",
                  color: card.status === "learning" ? DIFFICULTY_STYLES.medium.text : "#B9C4B4",
                }}
              >
                Still learning
              </button>
              <button
                onClick={() => handleMarkStatus(card.id, "known")}
                style={{
                  ...statusButtonStyle,
                  borderColor: card.status === "known" ? DIFFICULTY_STYLES.easy.border : "#4A544A",
                  background: card.status === "known" ? DIFFICULTY_STYLES.easy.bg : "transparent",
                  color: card.status === "known" ? DIFFICULTY_STYLES.easy.text : "#B9C4B4",
                }}
              >
                Known
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 gap-3">
              <button onClick={handlePrev} style={navButtonStyle} className="flex-1">
                ← Previous
              </button>
              <button onClick={handleNext} style={navButtonStyle} className="flex-1">
                Next →
              </button>
            </div>
            <p style={{ color: "#6B7A6B", fontSize: "11px", textAlign: "center", marginTop: "8px", fontFamily: "system-ui, sans-serif" }}>
              Space to flip · ← → to move between cards
            </p>

            <AddCardToggleAndForm
              showForm={showForm}
              setShowForm={setShowForm}
              form={form}
              setForm={setForm}
              onSubmit={handleAddCard}
              marginTop="20px"
            />
          </>
        )}
      </div>

      {/* Delete confirmation overlay */}
      {pendingDelete !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 50,
          }}
        >
          <div style={{ background: PAPER, borderRadius: "12px", padding: "22px", maxWidth: "320px", width: "100%" }}>
            <p style={{ color: INK, fontFamily: "Georgia, serif", fontSize: "16px", marginBottom: "8px" }}>
              Delete this card?
            </p>
            <p style={{ color: INK_SOFT, fontSize: "13px", fontFamily: "system-ui, sans-serif", marginBottom: "18px" }}>
              This can't be undone. The card will be removed for good.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: "8px",
                  border: "1px solid #C7BC97",
                  background: "transparent",
                  color: INK,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: "8px",
                  border: "none",
                  background: DIFFICULTY_STYLES.hard.border,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardChrome({ diff }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#00000018" }}
          />
        ))}
      </div>
      <span
        style={{
          background: diff.bg,
          color: diff.text,
          border: `1px solid ${diff.border}`,
          fontSize: "11px",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.06em",
          padding: "3px 10px",
          borderRadius: "999px",
          textTransform: "uppercase",
        }}
      >
        {diff.label}
      </span>
    </div>
  );
}

function AddCardToggleAndForm({ showForm, setShowForm, form, setForm, onSubmit, marginTop }) {
  return (
    <div style={{ marginTop: marginTop || 0 }}>
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          width: "100%",
          padding: "10px",
          background: "transparent",
          border: `1px dashed ${RULE}55`,
          borderRadius: "10px",
          color: CHALK,
          fontSize: "14px",
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
        }}
      >
        {showForm ? "Close" : "+ Add a new card"}
      </button>

      {showForm && (
        <form
          onSubmit={onSubmit}
          style={{
            marginTop: "14px",
            background: BG_PANEL,
            borderRadius: "12px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div>
            <label style={labelStyle}>Question</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="What do you want to be quizzed on?"
              rows={2}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Answer</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Write the answer here"
              rows={2}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Difficulty</label>
            <div className="flex gap-2 mt-1">
              {Object.entries(DIFFICULTY_STYLES).map(([key, val]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setForm({ ...form, difficulty: key })}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: "8px",
                    border: `1px solid ${form.difficulty === key ? val.border : "#4A544A"}`,
                    background: form.difficulty === key ? val.bg : "transparent",
                    color: form.difficulty === key ? val.text : "#B9C4B4",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            style={{
              marginTop: "4px",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: CHALK,
              color: "#3A2C0E",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Save card
          </button>
        </form>
      )}
    </div>
  );
}

const toolButtonStyle = {
  padding: "6px 12px",
  borderRadius: "8px",
  border: "1px solid #4A544A",
  background: "transparent",
  color: "#B9C4B4",
  fontSize: "13px",
  fontFamily: "system-ui, sans-serif",
  cursor: "pointer",
};

const statusButtonStyle = {
  flex: 1,
  padding: "9px 0",
  borderRadius: "10px",
  border: "1px solid #4A544A",
  fontSize: "13px",
  fontFamily: "system-ui, sans-serif",
  cursor: "pointer",
};

const navButtonStyle = {
  padding: "12px 0",
  borderRadius: "10px",
  border: "1px solid #4A544A",
  background: "transparent",
  color: "#E8E4D6",
  fontSize: "14px",
  fontFamily: "system-ui, sans-serif",
  cursor: "pointer",
};

const labelStyle = {
  color: "#B9C4B4",
  fontSize: "12px",
  fontFamily: "system-ui, sans-serif",
  display: "block",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  background: "#232823",
  border: "1px solid #4A544A",
  borderRadius: "8px",
  padding: "8px 10px",
  color: "#F6F1E3",
  fontSize: "14px",
  fontFamily: "system-ui, sans-serif",
  resize: "vertical",
};
