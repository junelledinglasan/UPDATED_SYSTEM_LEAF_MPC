import { useState, useRef } from "react";
import "./Announcement.css";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_POSTS = [
  {
    id: "POST-001",
    type: "Activity",
    title: "Annual General Assembly 2026",
    caption: "Matagumpay na naidaos ang ating Annual General Assembly ngayong Marso 15, 2026 sa Lucena City Hall. Maraming salamat sa lahat ng dumalo at sa inyong patuloy na suporta sa LEAF MPC! 🎉",
    images: [],
    postedBy: "Junelle123",
    postedAt: "2026-03-15 10:00",
    notified: true,
    pinned: true,
    comments: [
      { id: "C001", author: "Maria Santos",   text: "Salamat sa imbitasyon! Maganda ang event.", time: "2026-03-15 11:30" },
      { id: "C002", author: "Juan Dela Cruz", text: "Sana madalas pa mag-organize ng ganito!", time: "2026-03-15 13:45" },
    ],
  },
  {
    id: "POST-002",
    type: "Seminar",
    title: "Financial Literacy Seminar",
    caption: "Inaanyayahan ang lahat ng miyembro na dumalo sa aming Financial Literacy Seminar sa Abril 5, 2026, 9:00 AM – 12:00 PM. Libre ang pagpasok. Bring your family! 💼",
    images: [],
    postedBy: "Junelle123",
    postedAt: "2026-03-18 09:00",
    notified: true,
    pinned: false,
    comments: [
      { id: "C003", author: "Ana Gonzales", text: "Pupunta po kami ng asawa ko.", time: "2026-03-18 10:00" },
    ],
  },
  {
    id: "POST-003",
    type: "Notice",
    title: "March Collection Schedule",
    caption: "Paalala sa lahat ng miyembro: Ang schedule ng koleksyon para sa buwan ng Marso ay sa mga araw na 3, 7, 10, 14, 17, 20, 24, at 28. Mangyaring magbayad sa tamang oras upang maiwasan ang penalties.",
    images: [],
    postedBy: "Junelle123",
    postedAt: "2026-03-01 08:00",
    notified: true,
    pinned: false,
    comments: [],
  },
];

const POST_TYPES = ["Activity", "Seminar", "Notice", "Announcement", "Event"];

const TYPE_COLOR = {
  Activity:     "type-activity",
  Seminar:      "type-seminar",
  Notice:       "type-notice",
  Announcement: "type-announce",
  Event:        "type-event",
};

// ─── Create / Edit Post Modal ─────────────────────────────────────────────────
function PostModal({ editPost, onClose, onSave }) {
  const [type,    setType]    = useState(editPost?.type    || "Activity");
  const [title,   setTitle]   = useState(editPost?.title   || "");
  const [caption, setCaption] = useState(editPost?.caption || "");
  const [images,  setImages]  = useState(editPost?.images  || []);
  const [pinned,  setPinned]  = useState(editPost?.pinned  || false);
  const [errors,  setErrors]  = useState({});
  const fileRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, { id: Date.now() + Math.random(), src: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));

  const validate = () => {
    const e = {};
    if (!title.trim())   e.title   = "Title is required.";
    if (!caption.trim()) e.caption = "Caption is required.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ type, title, caption, images, pinned });
  };

  const isEdit = !!editPost;

  return (
    <div className="an-overlay" onClick={onClose}>
      <div className="an-modal an-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="an-modal-header">
          <div className="an-modal-title">{isEdit ? "Edit Post" : "Create New Post"}</div>
          <button className="an-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="an-modal-body">
          {/* Type + Pin row */}
          <div className="an-form-row">
            <div className="an-field flex1">
              <label className="an-label">Post Type <span className="an-req">*</span></label>
              <div className="an-type-pills">
                {POST_TYPES.map(t => (
                  <button
                    key={t}
                    className={`an-type-pill ${TYPE_COLOR[t]} ${type === t ? "selected" : ""}`}
                    onClick={() => setType(t)}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="an-field">
              <label className="an-label">Options</label>
              <label className="an-checkbox-wrap">
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
                <span>📌 Pin this post</span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="an-field">
            <label className="an-label">Title <span className="an-req">*</span></label>
            <input
              className={`an-input ${errors.title ? "input-error" : ""}`}
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({...p, title: ""})); }}
              placeholder="e.g. Annual General Assembly 2026"
              maxLength={100}
            />
            {errors.title && <div className="an-error">{errors.title}</div>}
            <div className="an-char-count">{title.length}/100</div>
          </div>

          {/* Caption */}
          <div className="an-field">
            <label className="an-label">Caption / Description <span className="an-req">*</span></label>
            <textarea
              className={`an-textarea ${errors.caption ? "input-error" : ""}`}
              value={caption}
              onChange={e => { setCaption(e.target.value); setErrors(p => ({...p, caption: ""})); }}
              placeholder="Write your post content here... (supports emojis 🎉)"
              rows={4}
              maxLength={500}
            />
            {errors.caption && <div className="an-error">{errors.caption}</div>}
            <div className="an-char-count">{caption.length}/500</div>
          </div>

          {/* Image upload */}
          <div className="an-field">
            <label className="an-label">Photos (optional)</label>
            <div
              className="an-upload-zone"
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={e => e.currentTarget.classList.remove("drag-over")}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove("drag-over");
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                files.forEach(file => {
                  const reader = new FileReader();
                  reader.onload = ev => setImages(prev => [...prev, { id: Date.now() + Math.random(), src: ev.target.result, name: file.name }]);
                  reader.readAsDataURL(file);
                });
              }}
            >
              <div className="an-upload-icon">📷</div>
              <div className="an-upload-text">Click or drag photos here</div>
              <div className="an-upload-sub">PNG, JPG, GIF supported</div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
            </div>

            {images.length > 0 && (
              <div className="an-image-preview-grid">
                {images.map(img => (
                  <div key={img.id} className="an-img-thumb">
                    <img src={img.src} alt={img.name} />
                    <button className="an-img-remove" onClick={() => removeImage(img.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification notice */}
          <div className="an-notif-notice">
            📣 This post will be sent as a notification to all members and will appear in their newsfeed.
          </div>
        </div>

        <div className="an-modal-footer">
          <button className="an-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="an-btn-post" onClick={handleSubmit}>
            {isEdit ? "Save Changes" : "📢 Post & Notify Members"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({ post, onClose, onAddComment, onDeleteComment }) {
  const [text, setText] = useState("");
  if (!post) return null;

  const submit = () => {
    if (!text.trim()) return;
    onAddComment(post.id, text.trim());
    setText("");
  };

  return (
    <div className="an-overlay" onClick={onClose}>
      <div className="an-modal" onClick={e => e.stopPropagation()}>
        <div className="an-modal-header">
          <div>
            <div className="an-modal-title">Comments</div>
            <div className="an-modal-sub">{post.title}</div>
          </div>
          <button className="an-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="an-modal-body">
          {post.comments.length === 0 ? (
            <div className="an-no-comments">No comments yet. Be the first!</div>
          ) : (
            <div className="an-comments-list">
              {post.comments.map(c => (
                <div key={c.id} className="an-comment">
                  <div className="an-comment-avatar">{c.author.charAt(0)}</div>
                  <div className="an-comment-body">
                    <div className="an-comment-header">
                      <span className="an-comment-author">{c.author}</span>
                      <span className="an-comment-time">{c.time}</span>
                    </div>
                    <div className="an-comment-text">{c.text}</div>
                  </div>
                  <button className="an-comment-del" title="Delete comment" onClick={() => onDeleteComment(post.id, c.id)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="an-comment-input-row">
          <div className="an-comment-avatar admin-av">A</div>
          <input
            className="an-comment-input"
            placeholder="Write a comment as admin..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            maxLength={200}
          />
          <button className="an-comment-send" onClick={submit} disabled={!text.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ post, onClose, onConfirm }) {
  if (!post) return null;
  return (
    <div className="an-overlay" onClick={onClose}>
      <div className="an-modal an-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="an-modal-header">
          <div className="an-modal-title an-danger-title">Delete Post</div>
          <button className="an-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="an-modal-body">
          <div className="an-delete-icon">🗑️</div>
          <p className="an-delete-text">Are you sure you want to delete <strong>"{post.title}"</strong>?</p>
          <p className="an-delete-sub">This will also remove all comments and cannot be undone.</p>
        </div>
        <div className="an-modal-footer">
          <button className="an-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="an-btn-delete" onClick={() => onConfirm(post.id)}>Delete Post</button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, onEdit, onDelete, onComments, onTogglePin }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.caption.length > 160;
  const displayCaption = isLong && !expanded ? post.caption.slice(0, 160) + "..." : post.caption;

  return (
    <div className={`an-post-card ${post.pinned ? "pinned" : ""}`}>
      {/* Pin badge */}
      {post.pinned && <div className="an-pin-badge">📌 Pinned</div>}

      {/* Post header */}
      <div className="an-post-header">
        <div className="an-post-meta">
          <div className="an-post-avatar">A</div>
          <div>
            <div className="an-post-author">{post.postedBy} <span className="an-admin-tag">Admin</span></div>
            <div className="an-post-time">{post.postedAt}</div>
          </div>
        </div>
        <div className="an-post-actions">
          <span className={`an-type-tag ${TYPE_COLOR[post.type]}`}>{post.type}</span>
          {post.notified && <span className="an-notified-badge">📣 Notified</span>}
          <button className="an-icon-btn" title="Pin/Unpin" onClick={() => onTogglePin(post.id)}>
            {post.pinned ? "📌" : "📍"}
          </button>
          <button className="an-icon-btn edit" title="Edit post" onClick={() => onEdit(post)}>✏️</button>
          <button className="an-icon-btn delete" title="Delete post" onClick={() => onDelete(post)}>🗑</button>
        </div>
      </div>

      {/* Title */}
      <div className="an-post-title">{post.title}</div>

      {/* Caption */}
      <div className="an-post-caption">
        {displayCaption}
        {isLong && (
          <button className="an-read-more" onClick={() => setExpanded(e => !e)}>
            {expanded ? " See less" : " See more"}
          </button>
        )}
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div className={`an-post-images count-${Math.min(post.images.length, 4)}`}>
          {post.images.slice(0, 4).map((img, i) => (
            <div key={img.id} className={`an-post-img-wrap ${i === 3 && post.images.length > 4 ? "has-more" : ""}`}>
              <img src={img.src} alt={img.name} className="an-post-img" />
              {i === 3 && post.images.length > 4 && (
                <div className="an-more-overlay">+{post.images.length - 4}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="an-post-footer">
        <button className="an-comment-btn" onClick={() => onComments(post)}>
          💬 {post.comments.length} Comment{post.comments.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Announcement() {
  const [posts, setPosts]         = useState(INITIAL_POSTS);
  const [showCreate, setCreate]   = useState(false);
  const [editPost, setEditPost]   = useState(null);
  const [commPost, setCommPost]   = useState(null);
  const [deletePost, setDelPost]  = useState(null);
  const [filterType, setFilter]   = useState("All");
  const [search, setSearch]       = useState("");
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleCreate = ({ type, title, caption, images, pinned }) => {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const newPost = {
      id:       `POST-${Date.now()}`,
      type, title, caption, images, pinned,
      postedBy: "Junelle123",
      postedAt: dateStr,
      notified: true,
      comments: [],
    };
    setPosts(prev => [newPost, ...prev]);
    setCreate(false);
    showToast("Post published! All members have been notified.");
  };

  const handleEdit = (updated) => {
    setPosts(prev => prev.map(p => p.id === editPost.id ? { ...p, ...updated } : p));
    setEditPost(null);
    showToast("Post updated successfully.");
  };

  const handleDelete = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setDelPost(null);
    showToast("Post deleted.", "danger");
  };

  const handleTogglePin = (id) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  };

  const handleAddComment = (postId, text) => {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const time = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments: [...p.comments, { id: `C${Date.now()}`, author: "Admin (Junelle123)", text, time }] }
      : p
    ));
    // Sync commPost
    setCommPost(prev => prev ? { ...prev, comments: [...prev.comments, { id: `C${Date.now()}`, author: "Admin (Junelle123)", text, time }] } : prev);
  };

  const handleDeleteComment = (postId, commentId) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
      : p
    ));
    setCommPost(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.id !== commentId) } : prev);
  };

  // Filter + search
  const displayed = posts
    .filter(p => filterType === "All" || p.type === filterType)
    .filter(p => {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  // Sync commPost with latest state
  const currentCommPost = commPost ? posts.find(p => p.id === commPost.id) : null;

  return (
    <div className="an-wrapper">

      {toast && <div className={`an-toast an-toast-${toast.type}`}>{toast.msg}</div>}

      {showCreate && <PostModal onClose={() => setCreate(false)} onSave={handleCreate} />}
      {editPost   && <PostModal editPost={editPost} onClose={() => setEditPost(null)} onSave={handleEdit} />}
      {currentCommPost && (
        <CommentsModal
          post={currentCommPost}
          onClose={() => setCommPost(null)}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      )}
      {deletePost && <DeleteModal post={deletePost} onClose={() => setDelPost(null)} onConfirm={handleDelete} />}

      {/* Header */}
      <div className="an-page-header">
        <div>
          <div className="an-page-title">Announcements</div>
          <div className="an-page-sub">Post activities, seminars, and notices to members. Posts are sent as notifications and appear in the member newsfeed.</div>
        </div>
        <button className="an-create-btn" onClick={() => setCreate(true)}>
          + Create Post
        </button>
      </div>

      {/* Stats row */}
      <div className="an-stats-row">
        <div className="an-stat-chip"><span className="an-stat-num">{posts.length}</span><span>Total Posts</span></div>
        <div className="an-stat-chip"><span className="an-stat-num">{posts.filter(p => p.pinned).length}</span><span>Pinned</span></div>
        <div className="an-stat-chip"><span className="an-stat-num">{posts.reduce((s, p) => s + p.comments.length, 0)}</span><span>Comments</span></div>
        <div className="an-stat-chip notified"><span className="an-stat-num">{posts.filter(p => p.notified).length}</span><span>Notified</span></div>
      </div>

      {/* Filter bar */}
      <div className="an-filter-bar">
        <div className="an-search-wrap">
          <span className="an-search-icon">🔍</span>
          <input
            className="an-search-input"
            placeholder="Search posts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="an-clear-btn" onClick={() => setSearch("")}>✕</button>}
        </div>
        <div className="an-type-filter-tabs">
          {["All", ...POST_TYPES].map(t => (
            <button
              key={t}
              className={`an-filter-tab ${filterType === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Posts feed */}
      {displayed.length === 0 ? (
        <div className="an-empty-feed">
          <div className="an-empty-icon">📭</div>
          <div className="an-empty-text">No posts found.</div>
          <div className="an-empty-sub">Try adjusting your filters or create a new post.</div>
        </div>
      ) : (
        <div className="an-feed">
          {displayed.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={setEditPost}
              onDelete={setDelPost}
              onComments={setCommPost}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}