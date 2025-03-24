import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

function App() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSources, setShowSources] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showFeedbackComment, setShowFeedbackComment] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showFeedbackStats, setShowFeedbackStats] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackStatsLoading, setFeedbackStatsLoading] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [activeTab, setActiveTab] = useState("chat");

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8001";

  const textareaRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const resizeTextarea = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };
    
    resizeTextarea();
    
    // Reset height when question is emptied or submitted
    if (!question) {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [question]);

  const fetchFeedbackStats = async () => {
    if (!showFeedbackStats) return;
    
    setFeedbackStatsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/feedback/stats`);
      if (res.ok) {
        const data = await res.json();
        // Transform the data to match the expected format
        setFeedbackStats({
          total: data.total_feedback || 0,
          helpful: data.helpful || 0,
          percentage: data.helpful_percentage || 0,
          comments: data.comments || []
        });
      } else {
        console.error("Failed to fetch feedback stats");
        setFeedbackStats({
          total: 0,
          helpful: 0,
          percentage: 0,
          comments: []
        });
      }
    } catch (err) {
      console.error("Error fetching feedback stats:", err);
      setFeedbackStats({
        total: 0,
        helpful: 0,
        percentage: 0,
        comments: []
      });
    } finally {
      setFeedbackStatsLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!showDashboard) return;
    
    setConversationsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/conversations`);
      if (res.ok) {
        const data = await res.json();
        // Sort by timestamp, newest first
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setConversations(data);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchFeedbackStats();
  }, [showDashboard, showFeedbackStats]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (question.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setFeedback(null);
    setSelectedConversation(null);
    setShowFeedbackComment(false);

    // Store the current question for display in the UI
    const currentQuestion = question;

    try {
      const res = await fetch(`${apiBaseUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setResponse(data);
      
      // Clear the input field after successfully receiving a response
      setQuestion("");
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to get response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isPositive) => {
    if (!response) return;
    
    setFeedback(isPositive ? "positive" : "negative");
    setFeedbackSubmitting(true);
    
    try {
      const res = await fetch(`${apiBaseUrl}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: response.conversation_id,
          is_helpful: isPositive,
        }),
      });
      
      if (!res.ok) {
        console.error("Failed to submit feedback:", await res.text());
      } else {
        console.log("Feedback submitted successfully:", isPositive ? "positive" : "negative");
        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 3000); // Hide message after 3 seconds
      }
      
      // Show comment form if feedback was negative
      if (!isPositive) {
        setShowFeedbackComment(true);
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackComment.trim() || !response) return;

    setFeedbackSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: response.conversation_id,
          is_helpful: feedback === "positive",
          comments: feedbackComment,
        }),
      });

      if (!res.ok) {
        console.error("Failed to submit comment:", await res.text());
      } else {
        console.log("Feedback comment submitted successfully");
        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 3000); // Hide message after 3 seconds
      }

      setShowFeedbackComment(false);
      setFeedbackComment("");
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const viewConversation = (conversation) => {
    setSelectedConversation(conversation);
    setResponse(null);
    setQuestion("");
    setError(null);
    setFeedback(null);
  };

  const backToDashboard = () => {
    setSelectedConversation(null);
    fetchConversations();
  };

  const renderMainContent = () => {
    if (showDashboard) {
      return (
        <div className="dashboard">
          <h2>Conversation History</h2>
          {conversationsLoading ? (
            <div className="loading">Loading conversations...</div>
          ) : selectedConversation ? (
            <div className="conversation-detail">
              <button className="back-button" onClick={backToDashboard}>
                ← Back to History
              </button>
              <div className="detail-header">
                <h3>Conversation Detail</h3>
                <div className="detail-time">
                  {formatDate(selectedConversation.timestamp)}
                </div>
              </div>
              <div className="detail-content">
                <div className="detail-question">
                  <h4>Question:</h4>
                  <p>{selectedConversation.question}</p>
                </div>
                <div className="detail-answer">
                  <h4>Answer:</h4>
                  <div
                    className="formatted-content"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        marked.parse(selectedConversation.answer)
                      ),
                    }}
                  ></div>
                </div>
                {selectedConversation.feedback !== undefined && (
                  <div className="detail-feedback">
                    <h4>Feedback:</h4>
                    <div
                      className={`feedback-badge ${
                        selectedConversation.feedback ? "positive" : "negative"
                      }`}
                    >
                      {selectedConversation.feedback ? "Helpful" : "Not Helpful"}
                    </div>
                    {selectedConversation.feedback_comment && (
                      <div className="feedback-comments">
                        <p>{selectedConversation.feedback_comment}</p>
                        <div className="feedback-time">
                          {formatDate(selectedConversation.feedback_timestamp)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedConversation.sources && selectedConversation.sources.length > 0 && (
                  <div className="detail-sources">
                    <h4>Sources:</h4>
                    <ul>
                      {selectedConversation.sources.map((source, index) => (
                        <li key={index}>
                          {source.file}
                          {source.quote && (
                            <div className="source-quote">{source.quote}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="no-conversations">No conversations found.</div>
          ) : (
            <div className="conversations-list">
              {conversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  className="conversation-item"
                  onClick={() => viewConversation(conv)}
                >
                  <div className="conversation-summary">
                    <div className="conversation-question">{conv.question}</div>
                    <div className="conversation-time">
                      {formatDate(conv.timestamp)}
                    </div>
                  </div>
                  {conv.feedback !== undefined && (
                    <div
                      className={`feedback-indicator ${
                        conv.feedback ? "positive" : "negative"
                      }`}
                    >
                      {conv.feedback ? 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        : 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                        </svg>
                      }
                    </div>
                  )}
                  <button className="view-button">View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (showFeedbackStats) {
      return (
        <div className="feedback-stats-container">
          <h2>Feedback Statistics</h2>
          {feedbackStatsLoading ? (
            <div className="loading">Loading feedback statistics...</div>
          ) : !feedbackStats ? (
            <div className="error-message">
              <p>Failed to load feedback statistics.</p>
              <button onClick={fetchFeedbackStats}>Try Again</button>
            </div>
          ) : (
            <div className="stats-container">
              <div className="stats-card">
                <h3>Overall Feedback</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{feedbackStats.total}</div>
                    <div className="stat-label">Total Feedback</div>
                  </div>
                  <div className="stat-item positive">
                    <div className="stat-value">{feedbackStats.helpful}</div>
                    <div className="stat-label">Helpful</div>
                  </div>
                  <div className="stat-item negative">
                    <div className="stat-value">
                      {feedbackStats.total - feedbackStats.helpful}
                    </div>
                    <div className="stat-label">Not Helpful</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {feedbackStats.percentage.toFixed(1)}%
                    </div>
                    <div className="stat-label">Helpfulness Rate</div>
                  </div>
                </div>
              </div>

              {feedbackStats.comments && feedbackStats.comments.length > 0 && (
                <div className="stats-card">
                  <h3>Recent Comments</h3>
                  <div className="comments-list">
                    {feedbackStats.comments.map((comment, index) => (
                      <div key={index} className="comment-item">
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-meta">
                          {formatDate(comment.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add an empty state message when there's no feedback */}
              {feedbackStats.total === 0 && (
                <div className="empty-state">
                  <p>No feedback has been submitted yet.</p>
                  <p>Feedback will appear here after users provide it.</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else {
  return (
    <>
          <div className="chat-container">
            <form className="question-form" onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                required
              ></textarea>
              <button
                type="submit"
                className="send-button"
                disabled={loading || !question.trim()}
                title="Send (or press Enter)"
              >
                {loading ? (
                  <div className="generating-dots"></div>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{fill: "white"}}
                  >
                    <path d="M4 2L16 10L4 18V2Z" fill="white" />
                  </svg>
                )}
              </button>
            </form>
            
            {error && <div className="error">{error}</div>}

            {loading && (
              <div className="response-container loading-container">
                <div className="response">
                  <div className="generating">
                    Generating
                  </div>
                </div>
              </div>
            )}

            {response && (
              <div className="response-container">
                <div className="response">
                  <div
                    className="formatted-content"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(marked.parse(response.answer)),
                    }}
                  ></div>

                  {response.sources && response.sources.length > 0 && (
                    <div className="sources-header">
                      <button
                        className="sources-toggle"
                        onClick={() => setShowSources(!showSources)}
                      >
                        <span>Sources</span>
                        <span className="chevron">{showSources ? "▲" : "▼"}</span>
                      </button>

                      {showSources && (
                        <div className="sources">
                          <ul>
                            {response.sources.map((source, index) => (
                              <li key={index}>
                                {source.file}
                                {source.quote && (
                                  <div className="source-quote">{source.quote}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {!feedback ? (
                    <div className="feedback">
                      <p>Was this helpful?</p>
                      <div className="feedback-buttons">
                        <button
                          className={`feedback-button ${feedback === "positive" ? "active" : ""}`}
                          onClick={() => handleFeedback(true)}
                          disabled={feedbackSubmitting}
                        >
                          <span>👍</span>
                        </button>
                        <button
                          className={`feedback-button ${feedback === "negative" ? "active" : ""}`}
                          onClick={() => handleFeedback(false)}
                          disabled={feedbackSubmitting}
                        >
                          <span>👎</span>
                        </button>
                      </div>
                      {feedbackSubmitted && <div className="feedback-thank-you">Thank you for your feedback!</div>}
      </div>
                  ) : showFeedbackComment ? (
                    <form
                      className="feedback-comment-form"
                      onSubmit={handleCommentSubmit}
                    >
                      <p>Tell us why this answer wasn't helpful:</p>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Enter your feedback..."
                        required
                      ></textarea>
                      <div className="feedback-comment-buttons">
                        <button
                          type="button"
                          onClick={() => setShowFeedbackComment(false)}
                        >
                          Cancel
                        </button>
                        <button type="submit" disabled={feedbackSubmitting}>
                          {feedbackSubmitting ? "Submitting..." : "Submit"}
        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="feedback-thank-you">
                      Thank you for your feedback!
                    </div>
                  )}
                </div>
              </div>
            )}
      </div>
        </>
      );
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>RFI Powered by Channel Factory</h1>
        <div className="nav-buttons">
          <button
            className="nav-button"
            onClick={() => {
              setShowDashboard(false);
              setShowFeedbackStats(!showFeedbackStats);
              setSelectedConversation(null);
            }}
          >
            {showFeedbackStats ? "Chat" : "Feedback Stats"}
          </button>
          <button
            className="nav-button"
            onClick={() => {
              setShowDashboard(!showDashboard);
              setShowFeedbackStats(false);
              setSelectedConversation(null);
            }}
          >
            {showDashboard ? "Chat" : "History"}
          </button>
        </div>
      </header>

      {renderMainContent()}
    </div>
  );
}

export default App;
