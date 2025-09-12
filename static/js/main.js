/**
 * Main Application JavaScript
 * Author: lycosa9527 - Made by MindSpring Team
 */

class ConsoleLogger {
    constructor() {
        this.logLevel = 'INFO'; // DEBUG, INFO, WARNING, ERROR
        this.colors = {
            DEBUG: '#6B7280',
            INFO: '#10B981',
            WARNING: '#F59E0B',
            ERROR: '#EF4444'
        };
    }
    
    setLevel(level) {
        this.logLevel = level.toUpperCase();
    }
    
    debug(message, data = null) {
        this._log('DEBUG', message, data);
    }
    
    info(message, data = null) {
        this._log('INFO', message, data);
    }
    
    warning(message, data = null) {
        this._log('WARNING', message, data);
    }
    
    error(message, data = null) {
        this._log('ERROR', message, data);
    }
    
    _log(level, message, data) {
        const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex >= currentLevelIndex) {
            const timestamp = new Date().toLocaleTimeString();
            const color = this.colors[level];
            const prefix = `%c[${timestamp}] [${level}] MindWeb:`;
            
            if (data) {
                console.log(prefix, `color: ${color}; font-weight: bold;`, message, data);
            } else {
                console.log(prefix, `color: ${color}; font-weight: bold;`, message);
            }
        }
    }
}

class MindWebApp {
    constructor() {
        this.currentConversationId = null;
        this.messageCount = 0;
        this.chatMode = 'mindmate'; // 'mindmate' or 'general'
        this.userProfile = null; // Store user profile with persistent username
        this.logger = new ConsoleLogger(); // Initialize console logger
        this.logger.setLevel('DEBUG'); // Set to DEBUG level for troubleshooting
        this.isMobile = this.detectMobile(); // Detect if user is on mobile
        
        this.initializeElements();
        this.bindEvents();
        this.initializeApp();
    }
    
    detectMobile() {
        // Detect if user is on a mobile device
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 768;
        
        this.logger.debug(`Mobile detection: userAgent=${isMobile}, screenWidth=${isSmallScreen}, final=${isMobile || isSmallScreen}`);
        return isMobile || isSmallScreen;
    }
    
    initializeElements() {
        // Main chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        
        // UI elements
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorModal = document.getElementById('closeErrorModal');
        this.dismissError = document.getElementById('dismissError');
        
        // Chat mode toggle elements
        this.mindmateModeBtn = document.getElementById('mindmateMode');
        this.generalModeBtn = document.getElementById('generalMode');
        this.chatModeIndicator = document.getElementById('chatModeIndicator');
        
        // User list panel elements
        this.toggleUserList = document.getElementById('toggleUserList');
        this.userListPanel = document.getElementById('userListPanel');
        this.closeUserListPanel = document.getElementById('closeUserListPanel');
        this.onlineUsers = document.getElementById('onlineUsers');
        
        // Input elements
        this.attachFile = document.getElementById('attachFile');
        this.voiceInput = document.getElementById('voiceInput');
        this.fileInput = document.getElementById('fileInput');
        this.charCount = document.querySelector('.char-count');
        
        // Voice input properties
        this.recognition = null;
        this.isRecording = false;
    }
    
    bindEvents() {
        // Send message
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send message
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Input validation
        this.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.updateSendButton();
            this.autoResizeInput();
        });
        
        // Chat mode toggle buttons
        this.mindmateModeBtn.addEventListener('click', () => {
            this.setChatMode('mindmate');
        });
        
        this.generalModeBtn.addEventListener('click', () => {
            this.setChatMode('general');
        });
        
        // Error modal
        this.closeErrorModal.addEventListener('click', () => {
            this.hideErrorModal();
        });
        
        this.dismissError.addEventListener('click', () => {
            this.hideErrorModal();
        });
        
        // Close modal on backdrop click
        this.errorModal.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideErrorModal();
            }
        });
        
        // File attachment
        this.attachFile.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        // Voice input
        this.voiceInput.addEventListener('click', () => {
            this.toggleVoiceInput();
        });
        
        // User list panel
        this.toggleUserList.addEventListener('click', () => {
            this.toggleUserListPanel();
        });
        
        this.closeUserListPanel.addEventListener('click', () => {
            this.hideUserListPanel();
        });
    }
    
    initializeApp() {
        // Initialize user profile with persistent username
        this.initializeUserProfile();
        
        // Track user visit to add them to online users
        this.trackUserVisit();
        
        // Initialize voice recognition
        this.initializeVoiceRecognition();
        
        // Configure marked.js for markdown rendering
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                }
            });
        }
        
        // Load conversation history from database
        this.loadConversationHistory();
        
        // Set up real-time updates for shared chatroom
        this.setupRealTimeUpdates();
        
        // Initialize user panel state based on device type
        this.initializeUserPanelState();
        
        // Load online users since panel is open by default
        this.loadOnlineUsers();
        
        // Track page visibility changes
        this.setupPageVisibilityTracking();
        
        // Handle window resize for responsive behavior
        this.setupResponsiveHandling();
    }
    
    initializeUserProfile() {
        // Try to load existing user profile from localStorage
        const savedProfile = this.loadUserProfile();
        
        if (savedProfile) {
            this.userProfile = savedProfile;
            console.log('Loaded existing user profile:', this.userProfile);
        } else {
            // Generate new user profile
            this.userProfile = this.generateUserProfile();
            this.saveUserProfile(this.userProfile);
            console.log('Generated new user profile:', this.userProfile);
        }
        
        // Update the UI with the user profile
        this.updateUserProfileDisplay();
    }
    
    updateUserProfileDisplay() {
        if (this.userProfile) {
            if (this.currentUserAvatar) {
                this.currentUserAvatar.textContent = this.userProfile.emoji;
            }
            if (this.currentUsername) {
                this.currentUsername.textContent = this.userProfile.username;
            }
        }
    }
    
    showEditProfileModal() {
        const newUsername = prompt('请输入新的用户名:', this.userProfile?.username || '');
        if (newUsername && newUsername.trim() && newUsername !== this.userProfile?.username) {
            this.updateUserProfile({ username: newUsername.trim() });
            this.updateUserProfileDisplay();
            console.log('Username updated to:', newUsername);
        }
    }
    
    generateUserProfile() {
        const educationTitles = ['老师', '教授', '导师', '学者', '研究员', '专家', '顾问', '讲师', '导师', '教育者'];
        const educationSubjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '艺术', '音乐', '体育', '科学', '技术', '工程'];
        const educationAdjectives = ['智慧', '博学', '创新', '启发', '探索', '思考', '学习', '成长', '进步', '优秀', '杰出', '卓越', '专业', '资深', '经验'];
        const educationNouns = ['学者', '导师', '老师', '专家', '研究员', '顾问', '讲师', '教育者', '学习者', '探索者', '思考者', '创新者', '实践者', '研究者', '专家'];
        
        const title = educationTitles[Math.floor(Math.random() * educationTitles.length)];
        const subject = educationSubjects[Math.floor(Math.random() * educationSubjects.length)];
        const adjective = educationAdjectives[Math.floor(Math.random() * educationAdjectives.length)];
        const noun = educationNouns[Math.floor(Math.random() * educationNouns.length)];
        
        const username = `${title}${subject}${adjective}${noun}`;
        
        // Generate emoji avatar
        const emojis = [
            '😀', '😊', '😎', '🤔', '😴', '🤗', '😍', '🤩', '😋', '😜',
            '🤪', '😏', '🙃', '😌', '😇', '🥳', '😘', '🥰', '😚', '😙',
            '😗', '😽', '😼', '😻', '😸', '😹', '😺', '😿', '😾', '🙀',
            '🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍',
            '🦄', '🐴', '🦓', '🦌', '🐗', '🐺', '🐪', '🐫', '🦒', '🐘',
            '🦏', '🦛', '🌻', '🌺', '🌸', '🌼', '🌷', '🌹', '🥀', '🌿',
            '🍀', '🌱', '🌵', '🌴', '🌳', '🌲', '🌰', '🍄', '🍁', '🍂'
        ];
        
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        return {
            username: username,
            emoji: emoji,
            userId: this.getUserId(),
            createdAt: new Date().toISOString()
        };
    }
    
    saveUserProfile(profile) {
        try {
            localStorage.setItem('mindweb_user_profile', JSON.stringify(profile));
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }
    
    loadUserProfile() {
        try {
            const saved = localStorage.getItem('mindweb_user_profile');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    }
    
    updateUserProfile(updates) {
        if (this.userProfile) {
            this.userProfile = { ...this.userProfile, ...updates };
            this.saveUserProfile(this.userProfile);
        }
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        this.logger.info(`Sending message: "${message}" in ${this.chatMode} mode`);
        
        // Add user message to chat with username
        this.addMessage('user', message, this.getUsername());
        
        // Clear input
        this.messageInput.value = '';
        this.updateCharCount();
        this.updateSendButton();
        this.autoResizeInput();
        
        if (this.chatMode === 'mindmate') {
            // Send directly to Dify API when in MindMate mode
            this.logger.debug('Sending to Dify API');
            try {
                await this.sendToDifyAPI(message);
        } catch (error) {
            this.logger.error('Error sending message to MindMate:', error);
            this.showError('Failed to send message to MindMate. Please try again.');
        }
        } else {
            // General chat mode - just display the message locally
            // In the future, this could be sent to a general chat API or stored differently
            console.log('General chat message:', message);
        }
    }
    
    // Removed mention hint functionality since we now use mode toggle
    
    async sendToDifyAPI(message) {
        this.logger.info(`Sending to Dify API: ${message.substring(0, 50)}...`);
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                user_id: this.getUserId(),
                conversation_id: this.currentConversationId,
                username: this.getUsername(),
                emoji: this.getUserEmoji()
            })
        });
        
        this.logger.debug(`Dify API response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessageElement = null;
        let fullResponse = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'content') {
                                if (!aiMessageElement) {
                                    aiMessageElement = this.addMessage('ai', '');
                                }
                                fullResponse += data.data;
                                this.updateAIMessage(aiMessageElement, fullResponse);
                            } else if (data.type === 'end') {
                                this.currentConversationId = data.conversation_id;
                                
                                // Add @username reply and visual notification
                                this.addUsernameReply(aiMessageElement, fullResponse);
                                this.showNotification('MindMate 回复了您！');
                            } else if (data.type === 'error') {
                                this.showError(data.data);
                            } else if (data.type === 'thought') {
                                // Handle agent thoughts if needed
                                console.log('Agent thought:', data.data);
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE data:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
    
    addMessage(type, content, username = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (type === 'user') {
            // Use emoji avatar for user messages
            const userEmoji = this.getUserEmoji();
            avatar.innerHTML = userEmoji;
            avatar.style.fontSize = '1.5rem';
            avatar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            avatar.style.color = 'white';
            avatar.style.border = 'none';
        } else {
            // Use black cat emoji for AI messages
            avatar.innerHTML = '🐱';
            avatar.style.fontSize = '1.5rem';
            avatar.style.background = 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)';
            avatar.style.color = 'white';
            avatar.style.border = 'none';
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Add username for user messages in shared chatroom
        if (type === 'user' && username) {
            const usernameDiv = document.createElement('div');
            usernameDiv.className = 'message-username';
            usernameDiv.textContent = username;
            usernameDiv.style.fontSize = '0.8rem';
            usernameDiv.style.color = '#667eea';
            usernameDiv.style.fontWeight = '600';
            usernameDiv.style.marginBottom = '0.25rem';
            messageContent.appendChild(usernameDiv);
        }
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        
        if (type === 'ai' && typeof marked !== 'undefined') {
            messageBubble.innerHTML = marked.parse(content);
        } else {
            messageBubble.textContent = content;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageContent.appendChild(messageBubble);
        messageContent.appendChild(messageTime);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Initialize image modal for any images in this message
        this.initializeImageModalForNewImages(messageDiv);
        
        this.messageCount++;
        
        // Show chat mode indicator when first message is added
        if (this.messageCount === 1) {
            this.updateChatModeIndicator();
        }
        
        return messageBubble;
    }
    
    updateAIMessage(messageElement, content) {
        if (typeof marked !== 'undefined') {
            // Parse markdown and highlight @mentions
            const htmlContent = marked.parse(content);
            const highlightedContent = this.highlightMentions(htmlContent);
            messageElement.innerHTML = highlightedContent;
        } else {
            // Highlight @mentions in plain text
            const highlightedContent = this.highlightMentions(content);
            messageElement.innerHTML = highlightedContent;
        }
        this.scrollToBottom();
    }
    
    highlightMentions(content) {
        // Highlight @username mentions in content
        return content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    }
    
    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/2000`;
        
        if (count > 1800) {
            this.charCount.style.color = '#e53e3e';
        } else if (count > 1500) {
            this.charCount.style.color = '#dd6b20';
        } else {
            this.charCount.style.color = '#a0aec0';
        }
    }
    
    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText;
    }
    
    autoResizeInput() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.classList.remove('hidden');
    }
    
    hideErrorModal() {
        this.errorModal.classList.add('hidden');
    }
    
    showWelcomeMessage() {
        // Welcome message is already in HTML
    }
    
    clearChatHistory() {
        if (confirm('您确定要清空聊天记录吗？')) {
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h2>欢迎使用 MindWeb</h2>
                    <p>这是一个共享的AI聊天室！所有用户都能看到彼此的对话和AI的回复，共同学习和交流。</p>
                    <div class="welcome-features">
                        <div class="feature-item">
                            <i class="fas fa-users"></i>
                            <span>共享聊天室</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-brain"></i>
                            <span>AI智能回复</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-eye"></i>
                            <span>实时可见</span>
                        </div>
                    </div>
                </div>
            `;
            this.currentConversationId = null;
            this.messageCount = 0;
            
            // Also clear live chat if available
            if (window.liveChat) {
                window.liveChat.clearMessages();
            }
        }
    }
    
    async loadConversationHistory() {
        // Load all messages from database (shared chatroom)
        try {
            const response = await fetch('/api/chat/history?limit=100');
            if (response.ok) {
                const data = await response.json();
                const messages = data.messages || [];
                
                // Clear existing messages
                this.chatMessages.innerHTML = '';
                
                if (messages.length > 0) {
                    // Load all messages from database (shared chatroom)
                    messages.forEach(msg => {
                        this.addMessageFromDatabase(msg);
                    });
                    this.messageCount = messages.length;
                } else {
                    // Show welcome message if no history
                    this.showWelcomeMessage();
                }
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
            this.showWelcomeMessage();
        }
    }
    
    addMessageFromDatabase(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.message_type}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (msg.message_type === 'user') {
            // Use emoji avatar for user messages
            const userEmoji = msg.user ? msg.user.emoji : '😀';
            avatar.innerHTML = userEmoji;
            avatar.style.fontSize = '1.5rem';
            avatar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            avatar.style.color = 'white';
            avatar.style.border = 'none';
        } else {
            // Use black cat emoji for AI messages
            avatar.innerHTML = '🐱';
            avatar.style.fontSize = '1.5rem';
            avatar.style.background = 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)';
            avatar.style.color = 'white';
            avatar.style.border = 'none';
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Add username for user messages in shared chatroom
        if (msg.message_type === 'user' && msg.user) {
            const usernameDiv = document.createElement('div');
            usernameDiv.className = 'message-username';
            usernameDiv.textContent = msg.user.username;
            usernameDiv.style.fontSize = '0.8rem';
            usernameDiv.style.color = '#667eea';
            usernameDiv.style.fontWeight = '600';
            usernameDiv.style.marginBottom = '0.25rem';
            messageContent.appendChild(usernameDiv);
        }
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        
        if (msg.message_type === 'ai' && typeof marked !== 'undefined') {
            messageBubble.innerHTML = marked.parse(msg.content);
        } else {
            messageBubble.textContent = msg.content;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        const msgDate = new Date(msg.created_at);
        messageTime.textContent = msgDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageContent.appendChild(messageBubble);
        messageContent.appendChild(messageTime);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Initialize image modal for any images in this message
        this.initializeImageModalForNewImages(messageDiv);
    }
    
    saveConversationHistory() {
        try {
            const data = {
                conversationId: this.currentConversationId,
                messageCount: this.messageCount,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('mindweb_conversation', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving conversation history:', error);
        }
    }
    
    getUserId() {
        let userId = localStorage.getItem('mindweb_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('mindweb_user_id', userId);
        }
        return userId;
    }
    
    getUserEmoji() {
        // Get emoji from persistent user profile
        if (this.userProfile && this.userProfile.emoji) {
            return this.userProfile.emoji;
        }
        
        // Fallback emoji if profile is not available
        const fallbackEmojis = ['😀', '😊', '😎', '🤔', '😴', '🤗', '😍', '🤩', '😋', '😜'];
        return fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
    }
    
    initializeImageModalForNewImages(messageElement) {
        // Find all images in the message and add click handlers
        const images = messageElement.querySelectorAll('img');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', function() {
                openImageModal(this.src, this.alt);
            });
        });
    }
    
    setChatMode(mode) {
        this.chatMode = mode;
        
        // Update button states
        this.mindmateModeBtn.classList.toggle('active', mode === 'mindmate');
        this.generalModeBtn.classList.toggle('active', mode === 'general');
        
        // Update placeholder text
        if (mode === 'mindmate') {
            this.messageInput.placeholder = '与 MindMate AI 对话...';
        } else {
            this.messageInput.placeholder = '发送群聊消息...';
        }
        
        // Update send button icon
        const icon = this.sendButton.querySelector('i');
        if (mode === 'mindmate') {
            icon.textContent = '🐱';
            icon.className = '';
        } else {
            icon.className = 'fas fa-paper-plane';
            icon.textContent = '';
        }
        
        // Update chat mode indicator
        this.updateChatModeIndicator();
    }
    
    updateChatModeIndicator() {
        if (this.chatModeIndicator) {
            const spans = this.chatModeIndicator.querySelectorAll('span');
            const icon = spans[0];
            const text = spans[1];
            
            if (this.chatMode === 'mindmate') {
                icon.textContent = '🐱';
                text.textContent = '当前模式：MindMate AI';
            } else {
                icon.textContent = '👥';
                text.textContent = '当前模式：群聊';
            }
            
            // Show indicator when there are messages
            if (this.messageCount > 0) {
                this.chatModeIndicator.style.display = 'flex';
            }
        }
    }
    
    // User list panel methods removed as requested
    
    handleWindowResize() {
        // Ensure chat messages container adjusts to new window size
        if (this.chatMessages) {
            // Force a reflow to ensure proper sizing
            this.chatMessages.style.height = 'auto';
            setTimeout(() => {
                this.scrollToBottom();
            }, 100);
        }
    }
    
    getUsername() {
        // Get username from persistent user profile
        if (this.userProfile && this.userProfile.username) {
            return this.userProfile.username;
        }
        
        // Fallback to education-themed username
        return this.generateEducationUsername();
    }
    
    generateEducationUsername() {
        // Education-themed username components
        const educationTitles = [
            '老师', '教师', '导师', '教授', '讲师', '助教', '班主任', '辅导员',
            '校长', '主任', '院长', '专家', '学者', '研究员', '博士', '硕士'
        ];
        
        const educationSubjects = [
            '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理',
            '政治', '音乐', '美术', '体育', '科学', '技术', '工程', '艺术',
            '文学', '哲学', '心理学', '教育学', '计算机', '人工智能', '创新', '思维'
        ];
        
        const educationAdjectives = [
            '智慧', '创新', '启发', '探索', '发现', '思考', '学习', '成长',
            '知识', '智慧', '博学', '渊博', '专业', '资深', '优秀', '杰出',
            '耐心', '细心', '用心', '专心', '热心', '爱心', '责任心', '使命感'
        ];
        
        const educationNouns = [
            '园丁', '蜡烛', '灯塔', '指南针', '钥匙', '桥梁', '阶梯', '明灯',
            '导师', '引路人', '启蒙者', '播种者', '耕耘者', '守护者', '陪伴者', '支持者'
        ];
        
        // Generate education-themed username with different patterns
        const patterns = [
            // Pattern 1: Title + Subject + Number
            () => {
                const title = educationTitles[Math.floor(Math.random() * educationTitles.length)];
                const subject = educationSubjects[Math.floor(Math.random() * educationSubjects.length)];
                const number = Math.floor(Math.random() * 99) + 1;
                return `${title}${subject}${number}`;
            },
            
            // Pattern 2: Adjective + Noun + Subject
            () => {
                const adjective = educationAdjectives[Math.floor(Math.random() * educationAdjectives.length)];
                const noun = educationNouns[Math.floor(Math.random() * educationNouns.length)];
                const subject = educationSubjects[Math.floor(Math.random() * educationSubjects.length)];
                return `${adjective}${noun}${subject}`;
            },
            
            // Pattern 3: Subject + Title + Adjective
            () => {
                const subject = educationSubjects[Math.floor(Math.random() * educationSubjects.length)];
                const title = educationTitles[Math.floor(Math.random() * educationTitles.length)];
                const adjective = educationAdjectives[Math.floor(Math.random() * educationAdjectives.length)];
                return `${subject}${title}${adjective}`;
            },
            
            // Pattern 4: Education + Subject + Number
            () => {
                const subject = educationSubjects[Math.floor(Math.random() * educationSubjects.length)];
                const number = Math.floor(Math.random() * 999) + 1;
                return `教育${subject}${number}`;
            },
            
            // Pattern 5: School + Subject + Title
            () => {
                const subject = educationSubjects[Math.floor(Math.random() * educationSubjects.length)];
                const title = educationTitles[Math.floor(Math.random() * educationTitles.length)];
                return `学校${subject}${title}`;
            }
        ];
        
        // Randomly select a pattern
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        return selectedPattern();
    }
    
    setupRealTimeUpdates() {
        // Poll for new messages every 3 seconds
        this.lastMessageCount = this.messageCount;
        this.updateInterval = setInterval(() => {
            this.checkForNewMessages();
            // Also update online users if panel is visible
            if (this.userListPanel.classList.contains('show')) {
                this.loadOnlineUsers();
            }
            // Keep user online by sending periodic visit updates
            this.trackUserVisit();
        }, 3000);
    }
    
    async checkForNewMessages() {
        try {
            const response = await fetch('/api/chat/history?limit=100');
            if (response.ok) {
                const data = await response.json();
                const messages = data.messages || [];
                
                if (messages.length > this.lastMessageCount) {
                    // New messages found, reload the chat
                    this.loadConversationHistory();
                    this.lastMessageCount = messages.length;
                }
            }
        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }
    
    addUsernameReply(aiMessageElement, content) {
        // Add @username reply to the beginning of AI response
        const username = this.getUsername();
        const replyText = `@${username} `;
        
        // Check if content already has @username
        if (!content.includes(`@${username}`)) {
            const updatedContent = replyText + content;
            this.updateAIMessage(aiMessageElement, updatedContent);
        }
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">MindMate</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            this.hideNotification(notification);
        }, 5000);
        
        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        // Play notification sound (if supported)
        this.playNotificationSound();
    }
    
    hideNotification(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    playNotificationSound() {
        // Create a simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Fallback: no sound if Web Audio API is not supported
            console.log('Notification sound not available');
        }
    }
    
    // Voice Recognition Methods
    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'zh-CN'; // Chinese language
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.voiceInput.classList.add('recording');
                this.voiceInput.title = '正在录音...';
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.updateCharCount();
                this.updateSendButton();
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.voiceInput.classList.remove('recording');
                this.voiceInput.title = '语音输入';
            };
            
            this.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.isRecording = false;
                this.voiceInput.classList.remove('recording');
                this.voiceInput.title = '语音输入';
                
                if (event.error === 'not-allowed') {
                    this.showError('请允许麦克风权限以使用语音输入功能');
                } else {
                    this.showError('语音识别失败，请重试');
                }
            };
        } else {
            // Hide voice input button if not supported
            this.voiceInput.style.display = 'none';
        }
    }
    
    toggleVoiceInput() {
        if (!this.recognition) {
            this.showError('您的浏览器不支持语音输入功能');
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }
    
    // File Upload Methods
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('文件大小不能超过 10MB');
            return;
        }
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('不支持的文件类型。请选择图片、PDF、Word文档或文本文件');
            return;
        }
        
        if (file.type.startsWith('image/')) {
            this.handleImageUpload(file);
        } else {
            this.handleDocumentUpload(file);
        }
    }
    
    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Add image to message input
            const imageUrl = e.target.result;
            const currentText = this.messageInput.value;
            const imageMarkdown = `![${file.name}](${imageUrl})`;
            
            this.messageInput.value = currentText ? `${currentText}\n${imageMarkdown}` : imageMarkdown;
            this.updateCharCount();
            this.updateSendButton();
        };
        reader.readAsDataURL(file);
    }
    
    handleDocumentUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // For now, just add file name to message
            const currentText = this.messageInput.value;
            const fileInfo = `📎 已附加文件: ${file.name} (${this.formatFileSize(file.size)})`;
            
            this.messageInput.value = currentText ? `${currentText}\n${fileInfo}` : fileInfo;
            this.updateCharCount();
            this.updateSendButton();
        };
        reader.readAsText(file);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // User List Panel Methods
    toggleUserListPanel() {
        if (this.userListPanel.classList.contains('show')) {
            this.hideUserListPanel();
        } else {
            this.showUserListPanel();
        }
    }
    
    showUserListPanel() {
        this.userListPanel.classList.add('show');
        this.loadOnlineUsers();
    }
    
    hideUserListPanel() {
        this.userListPanel.classList.remove('show');
    }
    
    async loadOnlineUsers() {
        try {
            this.logger.debug('Loading online users...');
            const response = await fetch('/api/users/online');
            const data = await response.json();
            
            this.logger.debug('Online users response:', data);
            
            if (data.success) {
                this.displayOnlineUsers(data.users);
            } else {
                this.logger.error('Failed to load online users:', data.error);
            }
        } catch (error) {
            this.logger.error('Error loading online users:', error);
        }
    }
    
    displayOnlineUsers(users) {
        this.logger.debug(`Displaying ${users.length} online users`);
        this.onlineUsers.innerHTML = '';
        
        if (users.length === 0) {
            this.onlineUsers.innerHTML = '<p style="text-align: center; color: #718096; margin: 2rem 0;">暂无在线用户</p>';
            this.logger.info('No online users found');
            return;
        }
        
        users.forEach(user => {
            this.logger.debug(`Adding user to list: ${user.username} (${user.emoji})`);
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            userElement.innerHTML = `
                <div class="user-avatar">${user.emoji}</div>
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-status online">在线</div>
                </div>
            `;
            
            this.onlineUsers.appendChild(userElement);
        });
        
        this.logger.info(`Successfully displayed ${users.length} online users`);
    }
    
    // User Panel State Management
    initializeUserPanelState() {
        if (this.isMobile) {
            // On mobile: panel starts collapsed
            this.userListPanel.classList.remove('show');
            this.logger.info('User panel initialized as collapsed (mobile device)');
        } else {
            // On desktop: panel starts open
            this.userListPanel.classList.add('show');
            this.logger.info('User panel initialized as open (desktop device)');
        }
    }
    
    // User Visit Tracking
    async trackUserVisit() {
        try {
            this.logger.info('Tracking user visit...');
            
            const response = await fetch('/api/users/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.getUserId(),
                    username: this.getUsername(),
                    emoji: this.getUserEmoji()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.logger.info(`User visit tracked successfully: ${this.getUsername()}`);
            } else {
                this.logger.error('Failed to track user visit:', data.error);
            }
        } catch (error) {
            this.logger.error('Error tracking user visit:', error);
        }
    }
    
    setupPageVisibilityTracking() {
        // Track when user leaves or returns to the page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logger.info('User left the page');
                // Stop periodic updates when page is hidden
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            } else {
                this.logger.info('User returned to the page');
                // Resume periodic updates and track visit
                this.trackUserVisit();
                this.setupRealTimeUpdates();
            }
        });
        
        // Track when user closes the page
        window.addEventListener('beforeunload', () => {
            this.logger.info('User is leaving the page');
            // Send a final visit update
            navigator.sendBeacon('/api/users/visit', JSON.stringify({
                user_id: this.getUserId(),
                username: this.getUsername(),
                emoji: this.getUserEmoji()
            }));
        });
    }
    
    setupResponsiveHandling() {
        // Handle window resize to update mobile detection
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const wasMobile = this.isMobile;
                this.isMobile = this.detectMobile();
                
                // If device type changed, update panel state
                if (wasMobile !== this.isMobile) {
                    this.logger.info(`Device type changed: ${wasMobile ? 'mobile' : 'desktop'} -> ${this.isMobile ? 'mobile' : 'desktop'}`);
                    this.initializeUserPanelState();
                }
            }, 250); // Debounce resize events
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mindWebApp = new MindWebApp();
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.mindWebApp) {
        window.mindWebApp.loadConversationHistory();
    }
});

// Handle beforeunload to save state and cleanup
window.addEventListener('beforeunload', () => {
    if (window.mindWebApp) {
        window.mindWebApp.saveConversationHistory();
        // Cleanup interval
        if (window.mindWebApp.updateInterval) {
            clearInterval(window.mindWebApp.updateInterval);
        }
    }
});

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    if (window.mindWebApp) {
        // Trigger a re-layout if needed
        window.mindWebApp.handleWindowResize();
    }
});

// Image modal functionality
function initializeImageModal() {
    // Add click event listeners to all images in messages
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && e.target.closest('.message-content')) {
            openImageModal(e.target.src, e.target.alt);
        }
    });
    
    // Close modal when clicking outside the image
    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
}

function openImageModal(src, alt) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    modalImg.src = src;
    modalImg.alt = alt || 'Enlarged image';
    modal.style.display = 'block';
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Initialize image modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeImageModal();
});
