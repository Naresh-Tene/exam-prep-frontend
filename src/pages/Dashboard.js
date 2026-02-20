import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import InlineFileUpload from "../components/InlineFileUpload";
import ArticleFileDisplay from "../components/ArticleFileDisplay";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../App.css";

const SUBJECT_OPTIONS_BASE = [{ value: "all", label: "All Subjects" }];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date (newest)" },
  { value: "date_asc", label: "Date (oldest)" },
  { value: "title_asc", label: "Title (A–Z)" },
  { value: "title_desc", label: "Title (Z–A)" },
];

function normalizeSubject(subject) {
  const s = String(subject || "").trim().toLowerCase();
  return s || "other";
}

function subjectLabel(subjectValue) {
  if (subjectValue === "dsa") return "DSA";
  if (subjectValue === "os") return "OS";
  if (subjectValue === "other") return "Other";
  // Title-case-ish label for custom subjects like "english" -> "English"
  return subjectValue.charAt(0).toUpperCase() + subjectValue.slice(1);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stripMarkdown(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/[*_~>#-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not available";
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} | ${time}`;
}

function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [files, setFiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [activeTab, setActiveTab] = useState("articles"); // articles | create
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const navigate = useNavigate();

  // Fetch Articles
  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, subjectFilter, sortBy, pageSize]);

  const fetchArticles = async () => {
    try {
      const { data } = await API.get("/articles");
      setArticles(data);
    } catch (err) {
      console.log(err);
    }
  };

  // Logout
  const logoutHandler = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  // Create or Update Article
  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { data } = await API.put(`/articles/${editingId}`, {
          title,
          content,
          subject,
          files,
        });

        setArticles(
          articles.map((article) =>
            article._id === editingId ? data : article
          )
        );

        setEditingId(null);
      } else {
        const { data } = await API.post("/articles", {
          title,
          content,
          subject,
          files,
        });

        setArticles([data, ...articles]);
      }

      setTitle("");
      setContent("");
      setSubject("");
      setFiles([]);
      setActiveTab("articles");
    } catch (error) {
      console.log(error.response?.data || error);
    }
  };

  // Delete Article
  const deleteArticle = async (id) => {
    try {
      await API.delete(`/articles/${id}`);
      setArticles(articles.filter((a) => a._id !== id));
    } catch (error) {
      console.log(error);
    }
  };

  // Edit Article
  const editArticle = (article) => {
    setTitle(article.title);
    setContent(article.content);
    setSubject(article.subject);
    setFiles(article.files || []);
    setEditingId(article._id);
    setActiveTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFavorite = async (article) => {
    try {
      const { data } = await API.put(`/articles/${article._id}`, {
        favorite: !article.favorite,
      });
      setArticles((prev) => prev.map((a) => (a._id === data._id ? data : a)));
    } catch (err) {
      console.log(err.response?.data || err);
    }
  };

  const togglePinned = async (article) => {
    try {
      const { data } = await API.put(`/articles/${article._id}`, {
        pinned: !article.pinned,
      });
      setArticles((prev) => prev.map((a) => (a._id === data._id ? data : a)));
    } catch (err) {
      console.log(err.response?.data || err);
    }
  };

  const subjects = useMemo(
    () =>
      Array.from(new Set(articles.map((a) => normalizeSubject(a.subject)))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [articles]
  );

  const subjectOptions = useMemo(
    () => [
      ...SUBJECT_OPTIONS_BASE,
      ...subjects.map((s) => ({ value: s, label: subjectLabel(s) })),
    ],
    [subjects]
  );

  const stats = useMemo(
    () =>
      articles.reduce(
        (acc, a) => {
          acc.total += 1;
          if (a.favorite) acc.favorites += 1;
          if (a.pinned) acc.pinned += 1;
          const k = normalizeSubject(a.subject);
          acc.bySubject[k] = (acc.bySubject[k] || 0) + 1;
          return acc;
        },
        { total: 0, favorites: 0, pinned: 0, bySubject: {} }
      ),
    [articles]
  );

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return articles
      .filter((article) => {
        const matchesQuery =
          !q ||
          String(article.title || "").toLowerCase().includes(q) ||
          String(article.subject || "").toLowerCase().includes(q);

        const s = normalizeSubject(article.subject);
        const matchesSubject =
          subjectFilter === "all" ? true : subjectFilter === s;

        return matchesQuery && matchesSubject;
      })
      .sort((a, b) => {
        // Pinned first, then favorites
        const aPin = a.pinned ? 1 : 0;
        const bPin = b.pinned ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;

        const aFav = a.favorite ? 1 : 0;
        const bFav = b.favorite ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;

        if (sortBy === "title_asc") {
          return String(a.title || "").localeCompare(String(b.title || ""));
        }
        if (sortBy === "title_desc") {
          return String(b.title || "").localeCompare(String(a.title || ""));
        }
        if (sortBy === "date_asc") {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        // date_desc default
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [articles, searchTerm, subjectFilter, sortBy]);

  const filteredCount = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedArticles = filteredAndSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const pageStart = filteredCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filteredCount);
  const hasFilters =
    subjectFilter !== "all" || Boolean(searchTerm.trim());

  return (
    <div className="dashboard-page">
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-brand">
            <div className="dash-logo">Exam Prep</div>
          </div>

          <nav className="dash-nav">
            <button
              type="button"
              className={`dash-nav-btn ${activeTab === "articles" ? "is-active" : ""}`}
              onClick={() => setActiveTab("articles")}
            >
              My Articles
            </button>
            <button type="button" className="dash-logout" onClick={logoutHandler}>
              Logout
            </button>
            <button
              type="button"
              className="dash-nav-btn"
              onClick={() => setAboutOpen(true)}
            >
              About
            </button>
          </nav>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-container">
          {activeTab === "create" && (
            <section className="dash-section">
              <h2 className="dash-section-title">
                {editingId ? "Edit Article" : "Create Article"}
              </h2>

              <form onSubmit={submitHandler} className="dash-card dash-form">
                <div className="dash-grid">
                  <div className="dash-field">
                    <label>Title</label>
                    <input
                      type="text"
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="dash-field">
                    <label>Subject</label>
                    <input
                      type="text"
                      placeholder="DSA / OS / Other"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="dash-field">
                  <label>
                    Content <span className="dash-muted">(Optional)</span>
                  </label>
                  <textarea
                    placeholder="Write your notes…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>

                <InlineFileUpload files={files} onFilesChange={setFiles} />

                <div className="dash-form-actions">
                  <button type="submit" className="dash-primary">
                    {editingId ? "Update Article" : "Add Article"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="dash-secondary"
                      onClick={() => {
                        setEditingId(null);
                        setTitle("");
                        setContent("");
                        setSubject("");
                        setFiles([]);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {activeTab === "articles" && (
            <section className="dash-section">
              <div className="dash-section-head">
                <div>
                  <h2 className="dash-section-title">My Articles</h2>
                  <div className="dash-subtitle">
                    Keep your notes organized with search, filters, and quick actions.
                  </div>
                </div>
                <button
                  type="button"
                  className="dash-primary"
                  onClick={() => {
                    setActiveTab("create");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  + New Article
                </button>
              </div>

              <div className="dash-controls dash-card">
                <div className="dash-controls-row">
                  <div className="dash-control">
                    <label>Search</label>
                    <input
                      type="text"
                      placeholder="Search by title or subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="dash-control">
                    <label>Subject</label>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                    >
                      {subjectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dash-control">
                    <label>Sort</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dash-control">
                    <label>Per page</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      {[6, 12, 24].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="dash-controls-meta">
                  <div className="dash-controls-count">
                    {filteredCount === 0
                      ? "No results"
                      : `Showing ${pageStart}–${pageEnd} of ${filteredCount}`}
                    {subjectFilter !== "all" || searchTerm.trim() ? (
                      <span className="dash-muted"> (filtered)</span>
                    ) : null}
                  </div>
                  {(subjectFilter !== "all" || searchTerm.trim()) && (
                    <button
                      type="button"
                      className="dash-secondary"
                      onClick={() => {
                        setSearchTerm("");
                        setSubjectFilter("all");
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              </div>

              <div className="dash-stats-row">
                <div className="dash-stats dash-card">
                  <div className="stat">
                    <div className="stat-label">Total</div>
                    <div className="stat-value">{stats.total}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Filtered</div>
                    <div className="stat-value">{filteredCount}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Favorites</div>
                    <div className="stat-value">{stats.favorites || 0}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Pinned</div>
                    <div className="stat-value">{stats.pinned || 0}</div>
                  </div>
                </div>
              </div>

              {pagedArticles.length === 0 ? (
                <div className="dash-empty-main dash-card">
                  {articles.length === 0 && !hasFilters ? (
                    <>
                      <h3 className="dash-empty-title">Start your first study article</h3>
                      <p className="dash-empty-body">
                        Capture key concepts, formulas, and past questions here so you can
                        revise faster before exams.
                      </p>
                      <button
                        type="button"
                        className="dash-primary"
                        onClick={() => {
                          setActiveTab("create");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        + Create your first article
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="dash-empty-title">No articles match these filters</h3>
                      <p className="dash-empty-body">
                        Try adjusting search or subject filters, or clear them to see all
                        notes.
                      </p>
                      {hasFilters && (
                        <button
                          type="button"
                          className="dash-secondary"
                          onClick={() => {
                            setSearchTerm("");
                            setSubjectFilter("all");
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="dash-cards">
                  {pagedArticles.map((article) => (
                    <div key={article._id} className="article-card">
                      <div className="article-card-head">
                        <div>
                          <div className="article-title">{article.title}</div>
                          <div className="article-subject">
                            Subject: <span>{article.subject}</span>
                          </div>
                        </div>
                        <div className="article-meta">
                          Created: {formatDateTime(article.createdAt)}
                        </div>
                      </div>

                      <div className="article-snippet">
                        {stripMarkdown(article.content) || "No content"}
                      </div>

                      <div className="article-actions">
                        <button
                          type="button"
                          className="dash-secondary"
                          onClick={() => setSelectedArticle(article)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="dash-secondary"
                          onClick={() => editArticle(article)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="dash-danger-ghost"
                          onClick={() => deleteArticle(article._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="dash-pagination">
                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={safePage === 1}
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - safePage) <= 1;
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const needsGap = prev && p - prev > 1;
                      return (
                        <span key={p} className="page-slot">
                          {needsGap ? <span className="page-ellipsis">…</span> : null}
                          <button
                            type="button"
                            className={`page-btn ${p === safePage ? "is-active" : ""}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}

                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safePage === totalPages}
                  >
                    Next
                  </button>

                  <div className="page-hint">
                    Page {safePage} of {totalPages}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="dash-footer">
        <span>Exam Prep Web App</span>
        <span className="dash-footer-sep">|</span>
        <span>
          Built by{" "}
          <a
            className="dash-footer-link"
            href="https://github.com/nareshpy-dev"
            target="_blank"
            rel="noreferrer"
          >
            Naresh Tene
          </a>
        </span>
      </footer>

      {selectedArticle && (
        <div
          className="dash-modal-backdrop"
          onClick={() => setSelectedArticle(null)}
          role="presentation"
        >
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="dash-modal-head">
              <div>
                <div className="dash-modal-title">{selectedArticle.title}</div>
                <div className="dash-modal-subtitle">
                  Subject: {selectedArticle.subject}
                </div>
              </div>
              <button
                type="button"
                className="dash-modal-close"
                onClick={() => setSelectedArticle(null)}
              >
                ✕
              </button>
            </div>

            <div className="dash-modal-body">
              <div className="dash-markdown">
                {String(selectedArticle.content || "").trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedArticle.content}
                  </ReactMarkdown>
                ) : (
                  <p className="dash-modal-content">No content</p>
                )}
              </div>
              <ArticleFileDisplay files={selectedArticle.files} />
            </div>

            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-secondary"
                onClick={() => {
                  setSelectedArticle(null);
                  editArticle(selectedArticle);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="dash-danger"
                onClick={() => {
                  const id = selectedArticle._id;
                  setSelectedArticle(null);
                  deleteArticle(id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div
          className="dash-modal-backdrop"
          onClick={() => setAboutOpen(false)}
          role="presentation"
        >
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="dash-modal-head">
              <div>
                <div className="dash-modal-title">About Exam Prep</div>
                <div className="dash-modal-subtitle">
                  A simple study notes web app for exam revision.
                </div>
              </div>
              <button
                type="button"
                className="dash-modal-close"
                onClick={() => setAboutOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="dash-modal-body">
              <div className="dash-about">
                <h4>About Exam Prep</h4>
                <p className="dash-about-text">
                  Exam Prep is a simple and efficient study notes web application designed
                  to help students organize and revise their subjects easily.
                </p>

                <h4>What You Can Do</h4>
                <ul>
                  <li>Create, edit, and delete articles by subject</li>
                  <li>Search, filter, and sort notes</li>
                  <li>Pin and mark important notes as favorites</li>
                  <li>Write notes using Markdown (code blocks supported)</li>
                  <li>Upload and preview PDFs and images</li>
                </ul>

                <h4>Tech Stack</h4>
                <ul>
                  <li>React, Node.js, Express</li>
                  <li>MongoDB Atlas, Mongoose</li>
                  <li>JWT for authentication</li>
                  <li>Git &amp; GitHub for version control</li>
                </ul>
              </div>
            </div>

            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-primary"
                onClick={() => setAboutOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;