/**
 * CustoPilot Chat Widget
 * Embeddable chat widget for customer websites
 * 
 * Usage:
 * <script>
 *   window.CustoPilotConfig = { chatbotId: "your-chatbot-id" };
 * </script>
 * <script src="https://your-custopilot-domain/static/widget.js" async></script>
 */
(function() {
  'use strict';

  // Configuration
  const config = window.CustoPilotConfig || {};
  const chatbotId = config.chatbotId;
  
  if (!chatbotId) {
    console.error('CustoPilot: chatbotId is required in window.CustoPilotConfig');
    return;
  }

  // Generate unique session ID for this page visit (not persisted)
  const sessionId = 'cp_' + crypto.randomUUID();
  
  // API base URL - auto-detect or use configured
  const apiBaseUrl = config.apiUrl || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('widget.js')) {
        const url = new URL(src);
        return url.origin;
      }
    }
    return 'http://localhost:8080';
  })();

  // State
  let isOpen = false;
  let isLoading = false;
  let chatbotConfig = null;
  let messages = [];
  let conversationId = null;

  // Styles
  const styles = `
    #custopilot-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    #custopilot-chat-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    #custopilot-chat-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    #custopilot-chat-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    #custopilot-chat-panel {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 380px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    #custopilot-chat-panel.open {
      display: flex;
    }

    #custopilot-chat-header {
      padding: 16px 20px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #custopilot-chat-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    #custopilot-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    #custopilot-close-btn:hover {
      opacity: 1;
    }

    #custopilot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .custopilot-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .custopilot-message.bot {
      background: #f3f4f6;
      color: #1f2937;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .custopilot-message.user {
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .custopilot-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: #f3f4f6;
      border-radius: 16px;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .custopilot-typing span {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: custopilot-bounce 1.4s infinite ease-in-out;
    }

    .custopilot-typing span:nth-child(1) { animation-delay: -0.32s; }
    .custopilot-typing span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes custopilot-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    #custopilot-input-area {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }

    #custopilot-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    #custopilot-input:focus {
      border-color: var(--primary-color, #6366f1);
    }

    #custopilot-send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    #custopilot-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #custopilot-send-btn svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    #custopilot-powered-by {
      padding: 8px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      background: #f9fafb;
    }

    #custopilot-powered-by a {
      color: #6366f1;
      text-decoration: none;
    }

    @media (max-width: 480px) {
      #custopilot-chat-panel {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
        bottom: 80px;
        right: 0;
      }
    }
  `;

  // Icons
  const chatIcon = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;
  const closeIcon = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
  const sendIcon = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  // Initialize widget
  async function init() {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Fetch chatbot config
    try {
      const response = await fetch(`${apiBaseUrl}/api/chatbots/${chatbotId}/public-config`);
      if (!response.ok) throw new Error('Failed to load chatbot config');
      chatbotConfig = await response.json();
    } catch (error) {
      console.error('CustoPilot: Failed to load chatbot configuration', error);
      return;
    }

    // Create widget container
    const container = document.createElement('div');
    container.id = 'custopilot-widget-container';
    container.innerHTML = createWidgetHTML();
    document.body.appendChild(container);

    // Apply primary color
    applyPrimaryColor(chatbotConfig.primary_color || '#6366f1');

    // Attach event listeners
    attachEventListeners();

    // Add welcome message
    addMessage(chatbotConfig.welcome_message || 'Hi! How can I help you today?', 'bot');
  }

  function createWidgetHTML() {
    return `
      <button id="custopilot-chat-button" aria-label="Open chat">
        ${chatIcon}
      </button>
      <div id="custopilot-chat-panel">
        <div id="custopilot-chat-header">
          <h3>${escapeHtml(chatbotConfig?.name || 'Chat Support')}</h3>
          <button id="custopilot-close-btn" aria-label="Close chat">
            ${closeIcon}
          </button>
        </div>
        <div id="custopilot-messages"></div>
        <div id="custopilot-input-area">
          <input 
            type="text" 
            id="custopilot-input" 
            placeholder="Type a message..." 
            autocomplete="off"
          />
          <button id="custopilot-send-btn" aria-label="Send message">
            ${sendIcon}
          </button>
        </div>
        <div id="custopilot-powered-by">
          Powered by <a href="https://custopilot.com" target="_blank">CustoPilot</a>
        </div>
      </div>
    `;
  }

  function applyPrimaryColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', color);
    
    const button = document.getElementById('custopilot-chat-button');
    const header = document.getElementById('custopilot-chat-header');
    const sendBtn = document.getElementById('custopilot-send-btn');
    
    if (button) button.style.backgroundColor = color;
    if (header) header.style.backgroundColor = color;
    if (sendBtn) sendBtn.style.backgroundColor = color;
    
    // Apply to user messages dynamically via CSS variable
    const styleEl = document.createElement('style');
    styleEl.textContent = `.custopilot-message.user { background-color: ${color}; }`;
    document.head.appendChild(styleEl);
  }

  function attachEventListeners() {
    const chatButton = document.getElementById('custopilot-chat-button');
    const closeBtn = document.getElementById('custopilot-close-btn');
    const input = document.getElementById('custopilot-input');
    const sendBtn = document.getElementById('custopilot-send-btn');

    chatButton.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const panel = document.getElementById('custopilot-chat-panel');
    const button = document.getElementById('custopilot-chat-button');
    
    if (isOpen) {
      panel.classList.add('open');
      button.innerHTML = closeIcon;
      document.getElementById('custopilot-input').focus();
    } else {
      panel.classList.remove('open');
      button.innerHTML = chatIcon;
    }
  }

  function addMessage(content, role) {
    messages.push({ content, role });
    
    const messagesContainer = document.getElementById('custopilot-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `custopilot-message ${role}`;
    messageEl.textContent = content;
    messagesContainer.appendChild(messageEl);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById('custopilot-messages');
    const typingEl = document.createElement('div');
    typingEl.className = 'custopilot-typing';
    typingEl.id = 'custopilot-typing-indicator';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingEl = document.getElementById('custopilot-typing-indicator');
    if (typingEl) typingEl.remove();
  }

  async function sendMessage() {
    const input = document.getElementById('custopilot-input');
    const sendBtn = document.getElementById('custopilot-send-btn');
    const message = input.value.trim();
    
    if (!message || isLoading) return;
    
    // Clear input and add user message
    input.value = '';
    addMessage(message, 'user');
    
    // Disable input while loading
    isLoading = true;
    input.disabled = true;
    sendBtn.disabled = true;
    showTypingIndicator();
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/widget-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbot_id: chatbotId,
          session_id: sessionId,
          content: message,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      conversationId = data.conversation_id;
      
      hideTypingIndicator();
      addMessage(data.content, 'bot');
      
    } catch (error) {
      console.error('CustoPilot: Failed to send message', error);
      hideTypingIndicator();
      addMessage('Sorry, something went wrong. Please try again.', 'bot');
    } finally {
      isLoading = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
