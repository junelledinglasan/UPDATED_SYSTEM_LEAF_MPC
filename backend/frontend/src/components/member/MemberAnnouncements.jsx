import { useState } from "react";
import "./MemberAnnouncements.css";

const POSTS = [
  {
    id:"P001", type:"Activity", title:"Annual General Assembly 2026",
    caption:"Matagumpay na naidaos ang ating Annual General Assembly ngayong Marso 15, 2026 sa Lucena City Hall. Maraming salamat sa lahat ng dumalo at sa inyong patuloy na suporta sa LEAF MPC! 🎉",
    postedBy:"Admin", postedAt:"2026-03-15 10:00",
    comments:[
      { id:"c1", author:"Maria Santos",   text:"Salamat sa imbitasyon! Maganda ang event.", time:"2026-03-15 11:30" },
      { id:"c2", author:"Juan Dela Cruz", text:"Sana madalas pa mag-organize ng ganito!",   time:"2026-03-15 13:45" },
    ],
  },
  {
    id:"P002", type:"Seminar", title:"Financial Literacy Seminar — April 5",
    caption:"Inaanyayahan ang lahat ng miyembro na dumalo sa aming Financial Literacy Seminar sa Abril 5, 2026, 9:00 AM – 12:00 PM. Libre ang pagpasok. Bring your family! 💼",
    postedBy:"Admin", postedAt:"2026-03-18 09:00",
    comments:[
      { id:"c3", author:"Ana Gonzales", text:"Pupunta po kami ng asawa ko.", time:"2026-03-18 10:00" },
    ],
  },
  {
    id:"P003", type:"Notice", title:"March Collection Schedule",
    caption:"Paalala sa lahat ng miyembro: Ang schedule ng koleksyon para sa buwan ng Marso ay sa mga araw na 3, 7, 10, 14, 17, 20, 24, at 28. Mangyaring magbayad sa tamang oras.",
    postedBy:"Admin", postedAt:"2026-03-01 08:00",
    comments:[],
  },
];

const TYPE_COLOR = {
  Activity:     "tag-activity",
  Seminar:      "tag-seminar",
  Notice:       "tag-notice",
  Announcement: "tag-announce",
  Event:        "tag-event",
};

export default function MemberAnnouncements() {
  const [posts,    setPosts]    = useState(POSTS);
  const [filter,   setFilter]   = useState("All");
  const [commPost, setCommPost] = useState(null);
  const [commText, setCommText] = useState("");

  const types = ["All", ...new Set(POSTS.map(p => p.type))];

  const displayed = posts.filter(p => filter === "All" || p.type === filter);

  const submitComment = (postId) => {
    if (!commText.trim()) return;
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: [...p.comments, { id:`c${Date.now()}`, author:"Maria Santos", text:commText.trim(), time }] }
        : p
    ));
    setCommText("");
  };

  return (
    <div className="ma-wrapper">
      <div className="ma-page-header">
        <div className="ma-page-title">Announcements</div>
        <div className="ma-page-sub">Latest updates, events, and notices from LEAF MPC.</div>
      </div>

      <div className="ma-filter-tabs">
        {types.map(t => (
          <button key={t} className={`ma-filter-tab ${filter===t?"active":""}`} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="ma-feed">
        {displayed.map(post => (
          <div key={post.id} className="ma-post-card">
            <div className="ma-post-header">
              <div className="ma-post-meta">
                <div className="ma-post-avatar">A</div>
                <div>
                  <div className="ma-post-author">{post.postedBy} <span className="ma-admin-tag">Admin</span></div>
                  <div className="ma-post-time">{post.postedAt}</div>
                </div>
              </div>
              <span className={`ma-type-tag ${TYPE_COLOR[post.type] || ""}`}>{post.type}</span>
            </div>

            <div className="ma-post-title">{post.title}</div>
            <div className="ma-post-caption">{post.caption}</div>

            <div className="ma-post-footer">
              <button
                className="ma-comment-toggle"
                onClick={() => setCommPost(commPost===post.id ? null : post.id)}
              >
                💬 {post.comments.length} Comment{post.comments.length !== 1 ? "s" : ""}
              </button>
            </div>

            {commPost === post.id && (
              <div className="ma-comments-section">
                {post.comments.length === 0 ? (
                  <div className="ma-no-comments">No comments yet. Be first!</div>
                ) : post.comments.map(c => (
                  <div key={c.id} className="ma-comment">
                    <div className="ma-comment-avatar">{c.author.charAt(0)}</div>
                    <div className="ma-comment-body">
                      <div className="ma-comment-author">{c.author} <span className="ma-comment-time">{c.time}</span></div>
                      <div className="ma-comment-text">{c.text}</div>
                    </div>
                  </div>
                ))}
                <div className="ma-comment-input-row">
                  <div className="ma-comment-avatar me">M</div>
                  <input
                    className="ma-comment-input"
                    placeholder="Write a comment..."
                    value={commText}
                    onChange={e => setCommText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitComment(post.id)}
                  />
                  <button className="ma-comment-send" onClick={() => submitComment(post.id)} disabled={!commText.trim()}>
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}