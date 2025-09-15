/**
 * MindWeb Chatroom JavaScript
 * Handles real-time chat with MindMate AI and Group Chat modes
 */

class MindWebChatroom {
    constructor() {
        this.currentMode = 'mindmate';
        this.userId = this.generateUserId();
        this.username = this.generateUsername();
        this.conversationId = null;
        this.eventSource = null;
        this.aiMessageBuffer = '';
        this.lang = localStorage.getItem('lang') || 'zh';
        this.webUrl = null;
        this.i18n = {
            en: {
                share: 'Share',
                users: 'Users',
                langToggle: '中文',
                welcome: 'Welcome to MindWeb! Choose between MindMate AI or Group Chat mode.',
                mindmate: 'MindMate',
                groupChat: 'Group Chat',
                typing: 'Someone is typing...',
                askMindmatePlaceholder: 'Ask MindMate AI anything...',
                groupPlaceholder: 'Type a group message...',
                switchedToMindmate: 'Switched to MindMate AI mode',
                switchedToGroup: 'Switched to Group Chat mode',
                errorConnectMindmate: 'Error connecting to MindMate',
                errorSendMessage: 'Error sending message',
                linkCopied: 'Link copied to clipboard!',
                failedCopy: 'Failed to copy link',
                onlineUsers: 'Online Users',
                mindmateMeta: 'MindMate',
                shareTitle: 'Share',
                close: 'Close'
            },
            zh: {
                share: '分享',
                users: '用户',
                langToggle: 'EN',
                welcome: '欢迎来到 MindWeb！请选择 MindMate AI 或群聊模式。',
                mindmate: 'MindMate',
                groupChat: '群聊',
                typing: '有人正在输入…',
                askMindmatePlaceholder: '问问 MindMate AI 吧…',
                groupPlaceholder: '输入群聊消息…',
                switchedToMindmate: '已切换到 MindMate AI 模式',
                switchedToGroup: '已切换到群聊模式',
                errorConnectMindmate: '连接 MindMate 出错',
                errorSendMessage: '发送消息出错',
                linkCopied: '链接已复制到剪贴板！',
                failedCopy: '复制链接失败',
                onlineUsers: '在线用户',
                mindmateMeta: 'MindMate',
                shareTitle: '分享',
                close: '关闭'
            }
        };
        
        this.initializeElements();
        this.bindEvents();
        this.applyTranslations();
        this.fetchConfig();
        this.connectSSE();
        this.trackUserVisit();
        this.loadOnlineUsers();
        
        console.log(`Chatroom initialized for user: ${this.username} (${this.userId})`);
    }
    
    initializeElements() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.typingText = document.getElementById('typingText');
        this.onlineUsers = document.getElementById('onlineUsers');
        this.userList = document.getElementById('userList');
        this.modeBtns = document.querySelectorAll('.mode-btn');
        this.shareBtn = document.getElementById('shareBtn');
        this.usersBtn = document.getElementById('usersBtn');
        this.langBtn = document.getElementById('langBtn');
        this.qrModal = document.getElementById('qrModal');
        this.qrCloseBtn = document.getElementById('qrCloseBtn');
        this.qrCodeEl = document.getElementById('qrcode');
        this.qrUrlEl = document.getElementById('qrUrl');
        this.qrTitleEl = document.getElementById('qrTitle');
    }
    
    bindEvents() {
        // Mode toggle
        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });
        
        // Send message
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.updateSendButton();
        });
        
        // Header buttons
        this.shareBtn.addEventListener('click', () => {
            this.shareWebsite();
        });
        
        this.usersBtn.addEventListener('click', () => {
            this.onlineUsers.classList.toggle('show');
        });
        
        if (this.langBtn) {
            this.langBtn.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }
        
        if (this.qrCloseBtn) {
            this.qrCloseBtn.addEventListener('click', () => this.closeQr());
        }
        if (this.qrModal) {
            this.qrModal.addEventListener('click', (e) => {
                if (e.target === this.qrModal) this.closeQr();
            });
        }
        
        // Hide online users when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.online-users') && !e.target.closest('#usersBtn')) {
                this.onlineUsers.classList.remove('show');
            }
        });
    }
    
    t(key) {
        const dict = this.i18n[this.lang] || this.i18n.en;
        return dict[key] || key;
    }
    
    applyTranslations() {
        document.documentElement.setAttribute('lang', this.lang);
        
        // Header buttons
        if (this.shareBtn) this.shareBtn.innerHTML = '<span>🔗</span>' + this.t('share');
        if (this.usersBtn) this.usersBtn.innerHTML = '<span>👥</span>' + this.t('users');
        if (this.langBtn) this.langBtn.innerHTML = '<span>🌐</span>' + this.t('langToggle');
        if (this.qrTitleEl) this.qrTitleEl.textContent = this.t('shareTitle');
        if (this.qrCloseBtn) this.qrCloseBtn.textContent = this.t('close');
        
        // Typing indicator
        if (this.typingText) this.typingText.textContent = this.t('typing');
        
        // Mode buttons
        const modeBtns = Array.from(this.modeBtns);
        const mindmateBtn = modeBtns.find(b => b.dataset.mode === 'mindmate');
        const groupBtn = modeBtns.find(b => b.dataset.mode === 'group');
        if (mindmateBtn) mindmateBtn.textContent = '🤖 ' + this.t('mindmate');
        if (groupBtn) groupBtn.textContent = '👥 ' + this.t('groupChat');
        
        // Welcome system message (first system message on page)
        const welcomeEl = document.querySelector('.message.system .message-content');
        if (welcomeEl) welcomeEl.textContent = this.t('welcome');
        
        // Online users title
        const onlineUsersTitle = this.onlineUsers ? this.onlineUsers.querySelector('h3') : null;
        if (onlineUsersTitle) onlineUsersTitle.textContent = this.t('onlineUsers');
        
        // Placeholder depending on mode
        this.updatePlaceholderByMode();
    }
    
    toggleLanguage() {
        this.lang = this.lang === 'en' ? 'zh' : 'en';
        localStorage.setItem('lang', this.lang);
        this.applyTranslations();
    }

    async fetchConfig() {
        try {
            const res = await fetch('/api/chat/config');
            if (res.ok) {
                const data = await res.json();
                this.webUrl = data.web_url || null;
            }
        } catch (e) {
            console.warn('Failed to load config', e);
        }
    }
    
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateUsername() {
        // Choose ZH or EN based on current language at first load
        const useZh = (localStorage.getItem('lang') || navigator.language || 'zh').toLowerCase().startsWith('zh');
        if (useZh) {
            return this.generateZhUsername();
        }
        return this.generateEnUsername();
    }

    generateEnUsername() {
        const words = [
            'Scholar','Mentor','Tutor','Learner','Teacher','Student','Professor','Dean','Reader','Author',
            'Thinker','Researcher','Analyst','Scribe','Linguist','Mathematician','Physicist','Chemist','Biologist','Coder',
            'Engineer','Designer','Artist','Historian','Geographer','Philosopher','Psychologist','Economist','Librarian','Coach',
            'Trainer','Lecturer','Advisor','Guide','Curator','Explorer','Innovator','Maker','Builder','Creator',
            'Astronomer','Anthropologist','Archaeologist','Sociologist','Statistician','Logician','Ethicist','Ecologist','Geologist','Botanist',
            'Zoologist','Pianist','Violinist','Composer','Poet','Editor','Translator','Orator','Debater','Strategist',
            'Archivist','Cartographer','Drafter','Instructor','Scholarship','Campus','Academy','Seminar','Workshop','Lab',
            'Notebook','Chalk','Blackboard','Whiteboard','Backpack','Diploma','Thesis','Lecture','Library','Study',
            'Algebra','Geometry','Calculus','Grammar','Vocabulary','Essay','Project','Assignment','Quiz','Exam'
        ];
        const a = words[Math.floor(Math.random() * words.length)];
        const b = words[Math.floor(Math.random() * words.length)];
        const num = Math.floor(100 + Math.random() * 9900); // 3-4 digits
        return `${a}${b}${num}`;
    }

    generateZhUsername() {
        // Short Chinese education-themed words (≤5 chars)
        const words = [
            '学霸','学者','老师','同学','校友','书虫','书生','书友','读者','笔记',
            '黑板','教室','课堂','校长','讲师','导师','助教','图书','图书馆','学堂',
            '学苑','学府','学海','学子','才子','才女','理科','文科','语文','数学',
            '英语','物理','化学','生物','历史','地理','哲学','心理','经济','艺术',
            '音乐','美术','体育','实验','论文','课题','作业','考卷','考试','竞赛',
            '演讲','辩论','实践','创新','研究','学术','课堂笔记','校园','课代表','班长'
        ];
        const a = words[Math.floor(Math.random() * words.length)];
        const b = words[Math.floor(Math.random() * words.length)];
        let base = a + b;
        if (base.length > 5) {
            base = base.slice(0, 5);
        }
        const num = Math.floor(10 + Math.random() * 9990); // 2-4 digits
        return `${base}${num}`;
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update button states
        this.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update placeholder
        this.updatePlaceholderByMode();
        
        // Add mode switch message
        this.addSystemMessage(mode === 'mindmate' ? this.t('switchedToMindmate') : this.t('switchedToGroup'));
    }
    
    updatePlaceholderByMode() {
        if (this.currentMode === 'mindmate') {
            this.messageInput.placeholder = this.t('askMindmatePlaceholder');
        } else {
            this.messageInput.placeholder = this.t('groupPlaceholder');
        }
    }
    
    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;
        
        // Add user message to UI immediately
        this.addMessage('user', content, this.username, '😀');
        
        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.updateSendButton();
        
        if (this.currentMode === 'mindmate') {
            await this.sendToMindMate(content);
        } else {
            await this.sendToGroup(content);
        }
    }
    
    async sendToMindMate(content) {
        try {
            console.log('Sending to MindMate:', content);
            
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    user_id: this.userId,
                    conversation_id: this.conversationId,
                    username: this.username,
                    emoji: '😀'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || 'Failed to send message to MindMate');
            }
            
            const result = await response.json();
            if (result.conversation_id) {
                this.conversationId = result.conversation_id;
                console.log('Conversation ID updated:', this.conversationId);
            }
            
        } catch (error) {
            console.error('Error sending to MindMate:', error);
            this.addSystemMessage(`${this.t('errorConnectMindmate')}: ${error.message}`);
        }
    }
    
    async sendToGroup(content) {
        try {
            console.log('Sending group message:', content);
            
            // For group chat, we'll use the same endpoint but handle it differently
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    user_id: this.userId,
                    username: this.username,
                    emoji: '😀'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || 'Failed to send group message');
            }
            
            console.log('Group message sent successfully');
            
        } catch (error) {
            console.error('Error sending group message:', error);
            this.addSystemMessage(`${this.t('errorSendMessage')}: ${error.message}`);
        }
    }
    
    connectSSE() {
        console.log('Connecting to SSE...');
        this.eventSource = new EventSource('/api/chat/broadcast');
        
        this.eventSource.onopen = () => {
            console.log('SSE connection opened');
        };
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleSSEMessage(data);
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    console.log('Attempting to reconnect SSE...');
                    this.connectSSE();
                }
            }, 5000);
        };
    }
    
    handleSSEMessage(data) {
        console.log('Received SSE message:', data);
        
        switch (data.type) {
            case 'user_message':
                // Only show messages from other users
                if (data.from_user_id !== this.userId) {
                    this.addMessage('user', data.content, data.from_user, data.emoji);
                }
                break;
                
            case 'ai_message_chunk':
                this.addAIMessageChunk(data.content, data.from_user);
                break;
                
            case 'ai_message_end':
                this.finishAIMessage();
                break;
                
            case 'error':
                this.addSystemMessage(`Error: ${data.error}`);
                break;
                
            case 'ping':
                // Keep-alive ping - no action needed
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    addMessage(type, content, username, emoji = '😀') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = emoji;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        metaDiv.textContent = `${username} • ${new Date().toLocaleTimeString()}`;
        
        contentDiv.appendChild(metaDiv);
        
        if (type === 'user') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatar);
        } else {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(contentDiv);
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addAIMessageChunk(content, fromUser) {
        let aiMessage = document.querySelector('.ai-message-streaming');
        
        if (!aiMessage) {
            aiMessage = document.createElement('div');
            aiMessage.className = 'message ai ai-message-streaming';
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = '🤖';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';
            metaDiv.textContent = `${this.t('mindmateMeta')} • ${new Date().toLocaleTimeString()}`;
            
            contentDiv.appendChild(metaDiv);
            
            aiMessage.appendChild(avatar);
            aiMessage.appendChild(contentDiv);
            
            this.messagesContainer.appendChild(aiMessage);
            
            // Clear any previous AI message buffer
            this.aiMessageBuffer = '';
        }
        
        const contentDiv = aiMessage.querySelector('.message-content');
        const textNode = contentDiv.childNodes[0];
        
        // Add content to buffer and display
        this.aiMessageBuffer += content;
        textNode.textContent = this.aiMessageBuffer;
        
        this.scrollToBottom();
    }
    
    finishAIMessage() {
        const aiMessage = document.querySelector('.ai-message-streaming');
        if (aiMessage) {
            aiMessage.classList.remove('ai-message-streaming');
            console.log('AI message completed:', this.aiMessageBuffer);
        }
    }
    
    addSystemMessage(content) {
        this.addMessage('system', content);
    }
    
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    updateSendButton() {
        this.sendBtn.disabled = !this.messageInput.value.trim();
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    async trackUserVisit() {
        try {
            const response = await fetch('/api/users/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    username: this.username,
                    emoji: '😀'
                })
            });
            
            if (response.ok) {
                console.log('User visit tracked successfully');
            }
        } catch (error) {
            console.error('Error tracking user visit:', error);
        }
    }
    
    async loadOnlineUsers() {
        try {
            const response = await fetch('/api/users/online');
            if (response.ok) {
                const data = await response.json();
                this.updateOnlineUsersList(data.users);
            }
        } catch (error) {
            console.error('Error loading online users:', error);
        }
        
        // Refresh online users every 30 seconds
        setTimeout(() => {
            this.loadOnlineUsers();
        }, 30000);
    }
    
    updateOnlineUsersList(users) {
        this.userList.innerHTML = '';
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'status-indicator';
            
            const userInfo = document.createElement('span');
            userInfo.textContent = `${user.emoji} ${user.username}`;
            
            userDiv.appendChild(statusIndicator);
            userDiv.appendChild(userInfo);
            this.userList.appendChild(userDiv);
        });
    }
    
    shareWebsite() {
        const url = this.webUrl || window.location.origin;
        // Show QR modal
        if (this.qrModal && window.QRCode) {
            this.qrModal.style.display = 'flex';
            // Clear previous QR
            if (this.qrCodeEl) this.qrCodeEl.innerHTML = '';
            // Generate new QR
            new QRCode(this.qrCodeEl, {
                text: url,
                width: 220,
                height: 220
            });
            if (this.qrUrlEl) this.qrUrlEl.textContent = url;
        } else {
            // Fallback: clipboard
            this.copyToClipboard(url);
        }
    }

    closeQr() {
        if (this.qrModal) this.qrModal.style.display = 'none';
    }
    
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast(this.t('linkCopied'));
            }).catch(err => {
                console.error('Failed to copy: ', err);
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }
    
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showToast(this.t('linkCopied'));
        } catch (err) {
            console.error('Fallback copy failed: ', err);
            this.showToast(this.t('failedCopy'));
        }
        
        document.body.removeChild(textArea);
    }
    
    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
}

// Initialize the chatroom when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MindWebChatroom();
});
