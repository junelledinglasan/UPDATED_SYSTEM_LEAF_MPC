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
  const [sending,  setSending]  = useState(false);

  useEffect(() => {
    getAnnouncementsAPI()
      .then(data => setPosts(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const types     = ["All", ...new Set(posts.map(p => p.type).filter(Boolean))];
  const displayed = posts.filter(p => filter === "All" || p.type === filter);

  const submitComment = async (postId) => {
    if (!commText.trim() || sending) return;
    setSending(true);
    try {
      await addCommentAPI(postId, commText.trim());
      const updated = await getAnnouncementsAPI();
      setPosts(updated);
      setCommText("");
    } catch(e) { console.error(e); }
    finally { setSending(false); }
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
          ) : displayed.map(post => {
            const bodyText     = post.body || post.caption || post.content || "";
            const authorName   = post.posted_by_name || "Admin";
            const authorRole   = post.posted_by_role || "admin";
            const commentCount = post.comments?.length || post.comment_count || 0;

            return (
              <div key={post.id} className="ma-post-card">
                {/* Header */}
                <div className="ma-post-header">
                  <div className="ma-post-meta">
                    {/* ── Fixed avatar — first letter of author name ── */}
                    <div className="ma-post-avatar">{authorName[0].toUpperCase()}</div>
                    <div>
                      <div className="ma-post-author">
                        {authorName}
                        <span className="ma-admin-tag">{authorRole}</span>
                      </div>
                      <div className="ma-post-time">{post.created_at}</div>
                    </div>
                  </div>
                  {post.type && (
                    <span className={`ma-type-tag ${TYPE_COLOR[post.type]||""}`}>{post.type}</span>
                  )}
                </div>

                {/* Title */}
                <div className="ma-post-title">{post.title}</div>

                {/* ── Fixed: use post.body not post.content ── */}
                {bodyText && (
                  <div className="ma-post-caption" style={{whiteSpace:"pre-wrap",lineHeight:1.6}}>
                    {bodyText}
                  </div>
                )}

                {/* ── Fixed: show image if available ── */}
                {post.image_url && (
                  <div style={{marginTop:10,borderRadius:10,overflow:"hidden"}}>
                    <img
                      src={post.image_url}
                      alt="announcement"
                      style={{width:"100%",maxHeight:320,objectFit:"cover",borderRadius:10,display:"block"}}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="ma-post-footer">
                  <button className="ma-comment-toggle" onClick={() => setCommPost(commPost===post.id ? null : post.id)}>
                    💬 {commentCount} Comment{commentCount!==1?"s":""}
                  </button>
                </div>

                {/* Comments section */}
                {commPost === post.id && (
                  <div className="ma-comments-section">
                    {!post.comments?.length ? (
                      <div className="ma-no-comments">No comments yet. Be first!</div>
                    ) : post.comments.map(c => (
                      <div key={c.id} className="ma-comment">
                        {/* ── Fixed avatar ── */}
                        <div className="ma-comment-avatar">
                          {(c.posted_by_name || c.author || "U")[0].toUpperCase()}
                        </div>
                        <div className="ma-comment-body">
                          <div className="ma-comment-author">
                            {/* ── Fixed: use posted_by_name not c.author ── */}
                            {c.posted_by_name || c.author}
                            {c.posted_by_role && (
                              <span className="ma-comment-time" style={{marginLeft:6,color:"#aaa",fontSize:10}}>
                                {c.posted_by_role}
                              </span>
                            )}
                            <span className="ma-comment-time">{c.created_at}</span>
                          </div>
                          {/* ── Fixed: use body not c.text ── */}
                          <div className="ma-comment-text">{c.body || c.text}</div>
                        </div>
                      </div>
                    ))}
                    <div className="ma-comment-input-row">
                      <div className="ma-comment-avatar me">{user?.name?.[0]?.toUpperCase()||"M"}</div>
                      <input
                        className="ma-comment-input"
                        placeholder="Write a comment..."
                        value={commText}
                        onChange={e => setCommText(e.target.value)}
                        onKeyDown={e => e.key==="Enter" && submitComment(post.id)}
                      />
                      <button
                        className="ma-comment-send"
                        onClick={() => submitComment(post.id)}
                        disabled={!commText.trim() || sending}
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}