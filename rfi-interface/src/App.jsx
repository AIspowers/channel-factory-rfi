import { useState, useEffect, useRef, useLayoutEffect } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { API_BASE_URL, ENDPOINTS } from "./config.js";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [statsCounters, setStatsCounters] = useState({
    total: 0,
    helpful: 0,
    notHelpful: 0,
    percentage: 0
  });
  const [countingDone, setCountingDone] = useState(false);

  const [activeTab, setActiveTab] = useState("chat");

  const apiBaseUrl = API_BASE_URL;

  const textareaRef = useRef(null);
  const appContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Handle mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fix iOS viewport issues
  useLayoutEffect(() => {
    // Fix viewport height for mobile browsers
    const setViewportProperty = () => {
      // First we get the viewport height and multiply it by 1% to get a value for a vh unit
      let vh = window.innerHeight * 0.01;
      // Then we set the value in the --vh custom property to the root of the document
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      if (appContainerRef.current) {
        appContainerRef.current.style.height = `calc(100 * var(--vh, 1vh))`;
      }
    };

    setViewportProperty();
    window.addEventListener('resize', setViewportProperty);
    return () => window.removeEventListener('resize', setViewportProperty);
  }, []);

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

  // Filter conversations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(conv => 
      conv.question.toLowerCase().includes(query) || 
      (conv.answer && conv.answer.toLowerCase().includes(query))
    );
    
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const fetchConversations = async () => {
    if (!showDashboard) return;
    
    setConversationsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.CONVERSATIONS}`);
      if (res.ok) {
        const data = await res.json();
        // Sort by timestamp, newest first
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setConversations(data);
        setFilteredConversations(data); // Initialize filtered conversations
      } else {
        setConversations([]);
        setFilteredConversations([]);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setConversations([]);
      setFilteredConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchFeedbackStats = async () => {
    if (!showFeedbackStats) return;
    
    setFeedbackStatsLoading(true);
    setCountingDone(false);
    
    try {
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.FEEDBACK_STATS}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Feedback stats data:", data);
        
        // Reset counters first
        setStatsCounters({
          total: 0,
          helpful: 0,
          notHelpful: 0,
          percentage: 0
        });
        
        // Transform the data to match the expected format from API response
        const statsData = {
          total: data.total_conversations || 0,
          helpful: data.helpful_count || 0,
          notHelpful: data.not_helpful_count || 0,
          percentage: data.helpful_percentage || 0,
          comments: data.comments || []
        };
        
        setFeedbackStats(statsData);
        
        // Start counter animation after a short delay
        setTimeout(() => {
          startCounterAnimation(statsData);
        }, 300);
      } else {
        console.error("Failed to fetch feedback stats");
        setFeedbackStats({
          total: 0,
          helpful: 0,
          notHelpful: 0,
          percentage: 0,
          comments: []
        });
        setCountingDone(true);
      }
    } catch (err) {
      console.error("Error fetching feedback stats:", err);
      setFeedbackStats({
        total: 0,
        helpful: 0,
        notHelpful: 0,
        percentage: 0,
        comments: []
      });
      setCountingDone(true);
    } finally {
      setFeedbackStatsLoading(false);
    }
  };
  
  const startCounterAnimation = (stats) => {
    const duration = 1500; // animation duration in ms
    const steps = 30; // number of steps
    const interval = duration / steps;
    
    let currentStep = 0;
    
    const animateCounter = () => {
      if (currentStep >= steps) {
        // Set final values to ensure accuracy
        setStatsCounters({
          total: stats.total,
          helpful: stats.helpful,
          notHelpful: stats.notHelpful,
          percentage: stats.percentage
        });
        setCountingDone(true);
        return;
      }
      
      const progress = (currentStep + 1) / steps;
      
      setStatsCounters({
        total: Math.floor(stats.total * progress),
        helpful: Math.floor(stats.helpful * progress),
        notHelpful: Math.floor(stats.notHelpful * progress),
        percentage: parseFloat((stats.percentage * progress).toFixed(1))
      });
      
      currentStep++;
      setTimeout(animateCounter, interval);
    };
    
    animateCounter();
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

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredConversations.length > 0 && searchQuery.trim() !== "") {
        // Focus on the first result
        document.querySelector('.conversation-item')?.focus();
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
      console.log(`Sending request to: ${apiBaseUrl}${ENDPOINTS.SEARCH}`);
      
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.SEARCH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      console.log(`Response status: ${res.status}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API error: ${res.status} - ${errorText}`);
        
        // Try to parse the error as JSON
        let errorDetail = "An error occurred while processing your request.";
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.detail || errorText;
        } catch (e) {
          // If parsing fails, use the raw error text
          errorDetail = errorText;
        }
        
        throw new Error(`Server error (${res.status}): ${errorDetail}`);
      }

      const data = await res.json();
      console.log("Received successful response");
      setResponse(data);
      
      // Clear the input field after successfully receiving a response
      setQuestion("");
    } catch (err) {
      console.error("Error:", err);
      setError(`${err.message || "Failed to get response. Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isPositive) => {
    if (!response) return;
    
    setFeedback(isPositive ? "positive" : "negative");
    setFeedbackSubmitting(true);
    
    try {
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.FEEDBACK}`, {
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
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.FEEDBACK}`, {
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
          
          {!selectedConversation && (
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {searchQuery && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          )}
          
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
          ) : filteredConversations.length === 0 ? (
            <div className="no-conversations">
              {searchQuery ? "No conversations match your search." : "No conversations found."}
            </div>
          ) : (
            <div className="conversations-list">
              {filteredConversations.map((conv) => (
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
              {/* Main Stats Card with Animation */}
              <div className="stats-card">
                <h3>Overall Feedback</h3>
                <div className="stats-grid">
                  <div className="stat-item animated" onClick={() => !countingDone && fetchFeedbackStats()}>
                    <div className={`stat-value ${!countingDone ? 'counting' : 'counted'}`}>
                      {statsCounters.total}
                    </div>
                    <div className="stat-label">Total Feedback</div>
                  </div>
                  <div className="stat-item positive animated" onClick={() => !countingDone && fetchFeedbackStats()}>
                    <div className={`stat-value ${!countingDone ? 'counting' : 'counted'}`}>
                      {statsCounters.helpful}
                    </div>
                    <div className="stat-label">Helpful</div>
                  </div>
                  <div className="stat-item negative animated" onClick={() => !countingDone && fetchFeedbackStats()}>
                    <div className={`stat-value ${!countingDone ? 'counting' : 'counted'}`}>
                      {statsCounters.notHelpful}
                    </div>
                    <div className="stat-label">Not Helpful</div>
                  </div>
                  <div className="stat-item animated" onClick={() => !countingDone && fetchFeedbackStats()}>
                    <div className={`stat-value ${!countingDone ? 'counting' : 'counted'}`}>
                      {statsCounters.percentage}%
                    </div>
                    <div className="stat-label">Helpfulness Rate</div>
                  </div>
                </div>
                
                {/* Refresh button for stats */}
                <div className="stats-refresh-container">
                  <button 
                    className="refresh-button" 
                    onClick={fetchFeedbackStats}
                    disabled={feedbackStatsLoading}
                  >
                    {feedbackStatsLoading ? 'Refreshing...' : 'Refresh Stats'}
                  </button>
                </div>
              </div>

              {/* Visual representation of feedback ratio */}
              <div className="stats-card">
                <h3>Feedback Distribution</h3>
                <div className="feedback-distribution">
                  <div 
                    className="feedback-bar positive" 
                    style={{ 
                      width: `${statsCounters.total > 0 ? (statsCounters.helpful / statsCounters.total) * 100 : 0}%`,
                      transition: 'width 1.5s ease-in-out'
                    }}
                  >
                    👍
                  </div>
                  <div 
                    className="feedback-bar negative" 
                    style={{ 
                      width: `${statsCounters.total > 0 ? (statsCounters.notHelpful / statsCounters.total) * 100 : 0}%`,
                      transition: 'width 1.5s ease-in-out'
                    }}
                  >
                    👎
                  </div>
                </div>
              </div>

              {/* Comments section - only show if there are comments */}
              {feedbackStats.comments && Array.isArray(feedbackStats.comments) && feedbackStats.comments.length > 0 ? (
                <div className="stats-card">
                  <h3>Recent Comments</h3>
                  <div className="comments-list">
                    {feedbackStats.comments.map((comment, index) => (
                      <div key={index} className="comment-item">
                        <div className="comment-text">{comment.text || comment.comments || "No comment text"}</div>
                        <div className="comment-meta">
                          {formatDate(comment.timestamp || new Date())}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

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
    <div className="app-container" ref={appContainerRef}>
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
