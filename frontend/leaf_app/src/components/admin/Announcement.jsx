import { useState, useEffect } from "react";
import { getAnnouncementsAPI, createAnnouncementAPI, updateAnnouncementAPI, deleteAnnouncementAPI, addCommentAPI, deleteCommentAPI } from "../../api/announcements";
import { useAuth } from "../../context/AuthContext";
import { Search, Pin, Bell, Pencil, Trash2, MessageCircle } from "lucide-react";
import "./Announcement.css";

const POST_TYPES = ["Activity","Seminar","Notice","Announcement","Event"];
const TYPE_COLOR = { Activity:"type-activity", Seminar:"type-seminar", Notice:"type-notice", Announcement:"type-announce", Event:"type-event" };

// ─── Create / Edit Post Modal ──────────────────────────────────────────────────
function PostModal({ editPost, onClose, onSave }) {
  const [type,    setType]    = useState(editPost?.type   ||"Activity");
  const [title,   setTitle]   = useState(editPost?.title  ||"");
  const [caption, setCaption] = useState(editPost?.body||editPost?.caption||"");
  const [pinned,  setPinned]  = useState(editPost?.pinned ||false);
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState(editPost?.image_url||null);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!title.trim())   e.title   = "Title is required.";
    if (!caption.trim()) e.caption = "Caption is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("title", title);
      formData.append("body", caption);
      formData.append("pinned", pinned);
      if (image) formData.append("image", image);
      await onSave(formData);
    } finally { setLoading(false); }
  };

  return (
    <div className="an-overlay" onClick={onClose}>
      <div className="an-modal an-modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="an-modal-header">
          <div className="an-modal-title">{editPost?"Edit Post":"Create New Post"}</div>
          <button className="an-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="an-modal-body">
          {/* Type pills */}
          <div className="an-form-row">
            <div className="an-field flex1">
              <label className="an-label">Post Type <span className="an-req">*</span></label>
              <div className="an-type-pills">
                {POST_TYPES.map(t=>(
                  <button key={t} className={`an-type-pill ${TYPE_COLOR[t]} ${type===t?"selected":""}`} onClick={()=>setType(t)} type="button">{t}</button>
                ))}
              </div>
            </div>
            <div className="an-field">
              <label className="an-label">Options</label>
              <label className="an-checkbox-wrap">
                <input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/>
                <span>📌 Pin this post</span>
              </label>
            </div>
          </div>
          {/* Title */}
          <div className="an-field">
            <label className="an-label">Title <span className="an-req">*</span></label>
            <input className={`an-input ${errors.title?"input-error":""}`} type="text" value={title} onChange={e=>{setTitle(e.target.value);setErrors(p=>({...p,title:""}));}} placeholder="e.g. Annual General Assembly 2026" maxLength={100}/>
            {errors.title && <div className="an-error">{errors.title}</div>}
          </div>
          {/* Caption */}
          <div className="an-field">
            <label className="an-label">Caption / Description <span className="an-req">*</span></label>
            <textarea className={`an-textarea ${errors.caption?"input-error":""}`} value={caption} onChange={e=>{setCaption(e.target.value);setErrors(p=>({...p,caption:""}));}} placeholder="Write the announcement details here..." rows={5}/>
            {errors.caption && <div className="an-error">{errors.caption}</div>}
          </div>
          {/* Image upload */}
          <div className="an-field">
            <label className="an-label">Attach Image <span className="an-label-optional">(optional)</span></label>
            <label className="an-image-upload-label">
              <input type="file" accept="image/*" onChange={handleImageChange} style={{display:"none"}}/>
              <div className="an-image-upload-btn">📎 Choose Image</div>
            </label>
            {preview && (
              <div className="an-image-preview-wrap">
                <img src={preview} alt="preview" className="an-image-preview"/>
                <button className="an-image-remove" onClick={()=>{setImage(null);setPreview(null);}}>✕ Remove</button>
              </div>
            )}
          </div>
        </div>
        <div className="an-modal-footer">
          <button className="an-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="an-btn-save" onClick={handleSubmit} disabled={loading}>{loading?"Saving...":editPost?"Save Changes":"Post Announcement"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── View Post Modal ───────────────────────────────────────────────────────────
function ViewPostModal({ post, onClose, onEdit, onDelete, currentUser }) {
  const [comment,  setComment]  = useState("");
  const [comments, setComments] = useState(post?.comments||[]);
  const [loading,  setLoading]  = useState(false);
  if (!post) return null;

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      const newComment = await addCommentAPI(post.id, comment);
      setComments(prev=>[...prev, newComment]);
      setComment("");
    } catch { alert("Failed to add comment."); }
    finally { setLoading(false); }
  };

  const handleDeleteComment = async (cId) => {
    try {
      await deleteCommentAPI(post.id, cId);
      setComments(prev=>prev.filter(c=>c.id!==cId));
    } catch { alert("Failed to delete comment."); }
  };

  return (
    <div className="an-overlay" onClick={onClose}>
      <div className="an-modal an-modal-view" onClick={e=>e.stopPropagation()}>
        <div className="an-modal-header">
          <div className="an-modal-title">{post.title}</div>
          <button className="an-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="an-modal-body">
          <div className="an-view-meta">
            <span className={`an-type-badge ${TYPE_COLOR[post.type]}`}>{post.type}</span>
            <span className="an-view-author">by {post.posted_by_name||"Admin"}</span>
            <span className="an-view-date">{post.created_at}</span>
          </div>
          {post.image_url && <img src={post.image_url} alt="post" className="an-view-image"/>}
          <div className="an-view-body">{post.body||post.caption}</div>
          <div className="an-comments-section">
            <div className="an-comments-title">💬 Comments ({comments.length})</div>
            <div className="an-comments-list">
              {comments.length===0
                ? <div className="an-no-comments">No comments yet. Be the first to comment!</div>
                : comments.map(c=>(
                  <div key={c.id} className="an-comment">
                    <div className="an-comment-avatar">{(c.posted_by_name||"U")[0]}</div>
                    <div className="an-comment-body">
                      <div className="an-comment-author">{c.posted_by_name}<span className="an-comment-role">{c.posted_by_role}</span></div>
                      <div className="an-comment-text">{c.body}</div>
                      <div className="an-comment-time">{c.created_at}</div>
                    </div>
                    {(currentUser?.role==="admin"||currentUser?.id===c.posted_by) && (
                      <button className="an-comment-del" onClick={()=>handleDeleteComment(c.id)}>✕</button>
                    )}
                  </div>
                ))
              }
            </div>
            <div className="an-comment-input-wrap">
              <input className="an-comment-input" placeholder="Write a comment..." value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)handleAddComment();}}/>
              <button className="an-comment-send" onClick={handleAddComment} disabled={!comment.trim()||loading}>{loading?"...":"Send"}</button>
            </div>
          </div>
        </div>
        <div className="an-modal-footer">
          <button className="an-btn-cancel" onClick={onClose}>Close</button>
          {(currentUser?.role==="admin"||currentUser?.role==="staff") && (
            <>
              <button className="an-btn-edit" onClick={()=>onEdit(post)}>✏ Edit</button>
              <button className="an-btn-delete" onClick={()=>onDelete(post.id)}>🗑 Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Announcement() {
  const { user } = useAuth();
  const [posts,     setPosts]    = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [filter,    setFilter]   = useState("All");
  const [search,    setSearch]   = useState("");
  const [showCreate,setCreate]   = useState(false);
  const [editPost,  setEditPost] = useState(null);
  const [viewPost,  setViewPost] = useState(null);
  const [toast,     setToast]    = useState(null);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetchPosts = async () => {
    setLoading(true);
    try { const data = await getAnnouncementsAPI(); setPosts(data); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleCreate = async (data) => {
    try {
      await createAnnouncementAPI(data);
      setCreate(false);
      showToast("Announcement posted successfully!");
      fetchPosts();
    } catch { showToast("Failed to post announcement.", "danger"); }
  };

  const handleEdit = async (data) => {
    try {
      await updateAnnouncementAPI(editPost.id, data);
      setEditPost(null); setViewPost(null);
      showToast("Announcement updated!");
      fetchPosts();
    } catch { showToast("Failed to update.", "danger"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteAnnouncementAPI(id);
      setViewPost(null);
      showToast("Announcement deleted.", "danger");
      fetchPosts();
    } catch { showToast("Failed to delete.", "danger"); }
  };

  const filtered = posts.filter(p => {
    const matchType = filter==="All" || p.type===filter;
    const q = search.toLowerCase();
    return matchType && (
      (p.title||"").toLowerCase().includes(q) ||
      (p.body||"").toLowerCase().includes(q)
    );
  });

  const pinnedPosts = filtered.filter(p => p.pinned);
  const regularPosts = filtered.filter(p => !p.pinned);
  const sortedPosts = [...pinnedPosts, ...regularPosts];

  const stats = {
    total:    posts.length,
    pinned:   posts.filter(p=>p.pinned).length,
    comments: posts.reduce((sum,p)=>sum+(p.comment_count||0),0),
    notified: posts.filter(p=>p.notified).length,
  };

  return (
    <div className="an-wrapper">
      {toast && <div className={`an-toast an-toast-${toast.type}`}>{toast.msg}</div>}
      {showCreate && <PostModal onClose={()=>setCreate(false)} onSave={handleCreate}/>}
      {editPost   && <PostModal editPost={editPost} onClose={()=>setEditPost(null)} onSave={handleEdit}/>}
      {viewPost   && <ViewPostModal post={viewPost} onClose={()=>setViewPost(null)} onEdit={p=>{setViewPost(null);setEditPost(p);}} onDelete={handleDelete} currentUser={user}/>}

      {/* Header */}
      <div className="an-page-header">
        <div>
          <div className="an-page-title">ANNOUNCEMENT</div>
          <div className="an-page-sub">Post activities, seminars, and notices to members. Posts are sent as notifications and appear in the member newsfeed.</div>
        </div>
        <button className="an-create-btn" onClick={()=>setCreate(true)}>+Create Post</button>
      </div>

      {/* Stats */}
      <div className="an-stats-row">
        <div className="an-stat-chip"><span className="an-stat-num">{stats.total}</span> Total Post</div>
        <div className="an-stat-chip"><span className="an-stat-num">{stats.pinned}</span> Pined</div>
        <div className="an-stat-chip"><span className="an-stat-num">{stats.comments}</span> Comments</div>
        <div className="an-stat-chip notified"><span className="an-stat-num">{stats.notified}</span> Notified</div>
      </div>

      {/* Search + Filter */}
      <div className="an-filter-bar">
        <div className="an-search-wrap">
          <Search size={13} color="#aaa"/>
          <input className="an-search-input" placeholder="Search Post....." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button className="an-clear-btn" onClick={()=>setSearch("")}>✕</button>}
        </div>
        <div className="an-filter-tabs">
          {["All",...POST_TYPES].map(t=>(
            <button key={t} className={`an-filter-tab ${filter===t?"active":""}`} onClick={()=>setFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="an-empty">Loading announcements...</div>
      ) : sortedPosts.length===0 ? (
        <div className="an-empty">No announcements found.</div>
      ) : (
        <div className="an-posts-list">
          {sortedPosts.map(post=>(
            <div key={post.id} className={`an-post-card ${post.pinned?"pinned":""}`} onClick={()=>setViewPost(post)}>
              {post.pinned && <div className="an-pinned-bar">📌 Pinned</div>}
              <div className="an-post-inner">
                <div className="an-post-avatar">{(post.posted_by_name||"A")[0].toUpperCase()}</div>
                <div className="an-post-content">
                  <div className="an-post-top">
                    <div className="an-post-meta">
                      <span className="an-post-author">{post.posted_by_name||"Admin"}</span>
                      <span className={`an-post-role-badge ${post.posted_by_role==="admin"?"role-admin":"role-staff"}`}>{post.posted_by_role||"Admin"}</span>
                      <span className="an-post-date">{post.created_at}</span>
                    </div>
                    <div className="an-post-right" onClick={e=>e.stopPropagation()}>
                      <span className={`an-type-badge ${TYPE_COLOR[post.type]}`}>{post.type}</span>
                      {post.notified && <span className="an-notified-badge">🔔 Notified</span>}
                      {(user?.role==="admin"||user?.role==="staff") && (<>
                        <button className="an-icon-btn pin"    title="Pin"    onClick={e=>{e.stopPropagation();}}>📌</button>
                        <button className="an-icon-btn edit"   title="Edit"   onClick={e=>{e.stopPropagation();setEditPost(post);}}><Pencil size={12}/></button>
                        <button className="an-icon-btn delete" title="Delete" onClick={e=>{e.stopPropagation();handleDelete(post.id);}}><Trash2 size={12}/></button>
                      </>)}
                    </div>
                  </div>
                  <div className="an-post-title">{post.title}</div>
                  <div className="an-post-caption">{(post.body||post.caption||"").slice(0,180)}{(post.body||post.caption||"").length>180&&<span className="an-see-more"> ... See more</span>}</div>
                  {post.image_url && <img src={post.image_url} alt="post" className="an-post-image"/>}
                  <div className="an-post-footer">
                    <span className="an-comment-count"><MessageCircle size={13}/> {post.comment_count||0} Comments</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}