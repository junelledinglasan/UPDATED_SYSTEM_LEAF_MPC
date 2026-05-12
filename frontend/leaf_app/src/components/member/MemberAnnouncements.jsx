import { useState, useEffect } from "react";
import { getAnnouncementsAPI, addCommentAPI } from "../../api/announcements";
import { useAuth } from "../../context/AuthContext";
import "./MemberAnnouncements.css";

const TYPE_COLOR = {
  Activity:"tag-activity", Seminar:"tag-seminar", Notice:"tag-notice",
  Announcement:"tag-announce", Event:"tag-event",
};

export default function MemberAnnouncements() {
  const { user } = useAuth();
  const [posts,    setPosts]    = useState([]);
  const [filter,   setFilter]   = useState("All");
  const [commPost, setCommPost] = useState(null);
  const [commText, setCommText] = useState("");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAnnouncementsAPI()
      .then(data => setPosts(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const types = ["All", ...new Set(posts.map(p => p.type).filter(Boolean))];
  const displayed = posts.filter(p => filter === "All" || p.type === filter);

  const submitComment = async (postId) => {
    if (!commText.trim()) return;
    try {
      await addCommentAPI(postId, commText.trim());
      // Refresh posts
      const updated = await getAnnouncementsAPI();
      setPosts(updated);
      setCommText("");
    } catch(e) { console.error(e); }
  };

  return (
    <div className="ma-wrapper">
      <div className="ma-page-header">
        <div className="ma-page-title">Announcements</div>
        <div className="ma-page-sub">Latest updates, events, and notices from LEAF MPC.</div>
      </div>

      <div className="ma-filter-tabs">
        {types.map(t => (
          <button key={t} className={`ma-filter-tab ${filter===t?"active":""}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"40px",color:"#aaa"}}>Loading announcements...</div>
      ) : (
        <div className="ma-feed">
          {displayed.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px",color:"#aaa"}}>No announcements yet.</div>
          ) : displayed.map(post => (
            <div key={post.id} className="ma-post-card">
              <div className="ma-post-header">
                <div className="ma-post-meta">
                  <div className="ma-post-avatar">A</div>
                  <div>
                    <div className="ma-post-author">{post.posted_by_name || "Admin"} <span className="ma-admin-tag">Admin</span></div>
                    <div className="ma-post-time">{post.created_at}</div>
                  </div>
                </div>
                {post.type && <span className={`ma-type-tag ${TYPE_COLOR[post.type]||""}`}>{post.type}</span>}
              </div>

              <div className="ma-post-title">{post.title}</div>
              <div className="ma-post-caption">{post.content}</div>

              <div className="ma-post-footer">
                <button className="ma-comment-toggle" onClick={() => setCommPost(commPost===post.id ? null : post.id)}>
                  💬 {post.comments?.length || 0} Comment{(post.comments?.length||0)!==1?"s":""}
                </button>
              </div>

              {commPost === post.id && (
                <div className="ma-comments-section">
                  {!post.comments?.length ? (
                    <div className="ma-no-comments">No comments yet. Be first!</div>
                  ) : post.comments.map(c => (
                    <div key={c.id} className="ma-comment">
                      <div className="ma-comment-avatar">{(c.author||"M")[0]}</div>
                      <div className="ma-comment-body">
                        <div className="ma-comment-author">{c.author} <span className="ma-comment-time">{c.created_at}</span></div>
                        <div className="ma-comment-text">{c.text}</div>
                      </div>
                    </div>
                  ))}
                  <div className="ma-comment-input-row">
                    <div className="ma-comment-avatar me">{user?.name?.[0]||"M"}</div>
                    <input className="ma-comment-input" placeholder="Write a comment..." value={commText}
                      onChange={e => setCommText(e.target.value)}
                      onKeyDown={e => e.key==="Enter" && submitComment(post.id)}
                    />
                    <button className="ma-comment-send" onClick={() => submitComment(post.id)} disabled={!commText.trim()}>Send</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}