/**
 * MindWeb Chatroom JavaScript
 * Handles real-time chat with MindMate AI and Group Chat modes
 */

class MindWebChatroom {
    constructor() {
        this.currentMode = 'mindmate';
        this.userId = this.generateUserId();
        this.username = this.loadOrGenerateUsername();
        this.userEmoji = this.loadOrGenerateEmoji();
        this.conversationId = null;
        this.eventSource = null;
        this.aiMessageBuffer = '';
        this.lang = localStorage.getItem('lang') || 'zh';
        this.webUrl = null;
        this.aiName = 'MindMate';
        this.aiPlaceholder = 'Ask MindMate AI anything...';
        this.nextBeforeMs = null;
        this.loadingOlder = false;
        this.scrollDebounceTimer = null;
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
                shareTitle: '使用相机扫一扫',
                close: '关闭'
            }
        };
        
        this.initializeElements();
        this.bindEvents();
        this.applyTranslations();
        this.fetchConfig();
        this.loadInitialHistory();
        this.connectSSE();
        this.trackUserVisit();
        this.loadOnlineUsers();
        
        console.log(`Chatroom initialized for user: ${this.username} (${this.userId})`);
    }

    async loadOlderMessages() {
        if (this.loadingOlder || !this.nextBeforeMs) return;
        this.loadingOlder = true;
        try {
            const url = `/api/chat/history?limit=20&before_ms=${encodeURIComponent(this.nextBeforeMs)}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
                this.nextBeforeMs = null;
                return;
            }
            const prevHeight = this.messagesContainer.scrollHeight;
            const frag = document.createDocumentFragment();
            for (const msg of data.messages) {
                const isAi = msg.message_type === 'ai';
                const el = isAi
                    ? this.buildMessageElement('ai', msg.content, this.t('mindmateMeta'), '🐈‍⬛')
                    : this.buildMessageElement(
                        (msg.user_id && msg.user_id === this.userId) ? 'user' : 'other',
                        msg.content,
                        (msg.user_id && msg.user_id === this.userId) ? this.username : (msg.username || 'User'),
                        (msg.user_id && msg.user_id === this.userId) ? this.userEmoji : '😀'
                      );
                frag.appendChild(el);
            }
            this.messagesContainer.insertBefore(frag, this.messagesContainer.firstChild);
            const newHeight = this.messagesContainer.scrollHeight;
            this.messagesContainer.scrollTop = newHeight - prevHeight;
            this.nextBeforeMs = data.next_before_ms || null;
        } catch (e) {
            console.warn('Failed to load older messages', e);
        } finally {
            this.loadingOlder = false;
        }
    }

    buildMessageElement(type, content, username, emoji = '😀') {
        const messageDiv = document.createElement('div');
        let cls = 'message';
        if (type === 'user') {
            cls = 'message user';
        } else if (type === 'system') {
            cls = 'message system';
        } else if (type === 'other' || type === 'ai') {
            cls = 'message ai';
        }
        messageDiv.className = cls;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = emoji;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.renderMarkdown(content);

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
        return messageDiv;
    }
    async loadInitialHistory() {
        try {
            const res = await fetch('/api/chat/history?limit=20');
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !Array.isArray(data.messages)) return;
            this.nextBeforeMs = data.next_before_ms || null;
            for (const msg of data.messages) {
                const isAi = msg.message_type === 'ai';
                if (isAi) {
                    this.addMessage('ai', msg.content, this.t('mindmateMeta'), '🐈‍⬛');
                    continue;
                }
                const isMine = msg.user_id && msg.user_id === this.userId;
                if (isMine) {
                    this.addMessage('user', msg.content, this.username, this.userEmoji);
                } else {
                    this.addMessage('other', msg.content, (msg.username || 'User'), '😀');
                }
            }
        } catch (e) {
            console.warn('Failed to load initial history', e);
        }
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

        // Infinite scroll: load older messages when reaching top (debounced)
        this.messagesContainer.addEventListener('scroll', () => {
            if (this.messagesContainer.scrollTop === 0) {
                if (this.scrollDebounceTimer) return;
                this.scrollDebounceTimer = setTimeout(() => {
                    this.scrollDebounceTimer = null;
                }, 400);
                this.loadOlderMessages();
            }
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
                if (data.ai_name) this.aiName = data.ai_name;
                if (data.ai_placeholder) this.aiPlaceholder = data.ai_placeholder;
                // Update i18n labels dynamically based on config
                this.i18n.en.mindmate = this.aiName;
                this.i18n.zh.mindmate = this.aiName; // keep same name unless localized later
                this.i18n.en.mindmateMeta = this.aiName;
                this.i18n.zh.mindmateMeta = this.aiName;
                this.i18n.en.askMindmatePlaceholder = this.aiPlaceholder;
                this.i18n.zh.askMindmatePlaceholder = this.aiPlaceholder;
                // Re-apply translations to reflect new labels/placeholders
                this.applyTranslations();
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

    loadOrGenerateUsername() {
        const saved = localStorage.getItem('username');
        if (saved && saved.trim()) return saved.trim();
        const name = this.generateUsername();
        localStorage.setItem('username', name);
        return name;
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
        this.addMessage('user', content, this.username, this.userEmoji);
        
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
                    emoji: this.userEmoji
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
            
            // For group chat, do not trigger Dify. Use group endpoint.
            const response = await fetch('/api/chat/group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    user_id: this.userId,
                    username: this.username,
                    emoji: this.userEmoji
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
                // Only show messages from other users (left side)
                if (data.from_user_id !== this.userId) {
                    this.addMessage('other', data.content, data.from_user, data.emoji);
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
        // Right-align only 'user'. Map 'other' to left bubble style like AI.
        let cls = 'message';
        if (type === 'user') {
            cls = 'message user';
        } else if (type === 'system') {
            cls = 'message system';
        } else if (type === 'other' || type === 'ai') {
            cls = 'message ai';
        }
        messageDiv.className = cls;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = emoji;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.renderMarkdown(content);
        
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
        // Ensure we scroll after async media (images) load
        this.observeImages(messageDiv);
        this.scrollToBottom();
    }
    
    addAIMessageChunk(content, fromUser) {
        let aiMessage = document.querySelector('.ai-message-streaming');
        
        if (!aiMessage) {
            aiMessage = document.createElement('div');
            aiMessage.className = 'message ai ai-message-streaming';
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = '🐈‍⬛';
            
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
        // Add content to buffer and display (render markdown safely)
        this.aiMessageBuffer += content;
        contentDiv.innerHTML = this.renderMarkdown(this.aiMessageBuffer);
        // If markdown introduced images, scroll after they load
        this.observeImages(aiMessage);
        
        this.scrollToBottom();
    }

    renderMarkdown(text) {
        // Local lightweight Markdown renderer with basic sanitization
        if (!text) return '';
        const escapeHtml = (s) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const isSafeUrl = (url) => {
            try {
                const u = new URL(url, window.location.origin);
                return u.protocol === 'http:' || u.protocol === 'https:';
            } catch { return false; }
        };

        // Preserve code blocks first
        const codeBlocks = [];
        let src = String(text);
        src = src.replace(/```([\s\S]*?)```/g, (_, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
            return `@@CODEBLOCK_${idx}@@`;
        });

        // Escape remaining HTML
        src = escapeHtml(src);

        // Inline code
        src = src.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Images ![alt](url)
        src = src.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, (m, alt, url) => {
            url = url.trim();
            return isSafeUrl(url) ? `<img src="${url}" alt="${alt}" style="max-width:100%; height:auto;"/>` : m;
        });

        // Links [text](url)
        src = src.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (m, text, url) => {
            url = url.trim();
            return isSafeUrl(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
        });

        // Bold and italics
        src = src.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        src = src.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Simple lists (unordered)
        const lines = src.split(/\r?\n/);
        let out = '';
        let inList = false;
        for (const line of lines) {
            const m = line.match(/^\s*[-\*]\s+(.*)$/);
            if (m) {
                if (!inList) { out += '<ul>'; inList = true; }
                out += `<li>${m[1]}</li>`;
            } else {
                if (inList) { out += '</ul>'; inList = false; }
                if (line.trim() === '') {
                    out += '<br/>';
                } else {
                    out += `<p>${line}</p>`;
                }
            }
        }
        if (inList) out += '</ul>';

        // Restore code blocks
        out = out.replace(/@@CODEBLOCK_(\d+)@@/g, (_, i) => codeBlocks[Number(i)] || '');
        return out;
    }

    observeImages(rootEl) {
        try {
            const imgs = rootEl.querySelectorAll('img');
            if (!imgs || imgs.length === 0) return;
            imgs.forEach(img => {
                const onLoad = () => this.scrollToBottom();
                // If already loaded, scroll immediately; else after load
                if (img.complete) {
                    onLoad();
                } else {
                    img.addEventListener('load', onLoad, { once: true });
                    img.addEventListener('error', () => {}, { once: true });
                }
            });
        } catch (e) {
            // noop
        }
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
                    emoji: this.userEmoji
                })
            });
            
            if (response.ok) {
                console.log('User visit tracked successfully');
            }
        } catch (error) {
            console.error('Error tracking user visit:', error);
        }
    }

    // ---------- Emoji handling ----------
    loadOrGenerateEmoji() {
        const saved = localStorage.getItem('userEmoji');
        if (saved) return saved;
        const emoji = this.pickEmoji(this.userId);
        localStorage.setItem('userEmoji', emoji);
        return emoji;
    }
    
    pickEmoji(seedStr) {
        // Expanded and varied emoji pool (faces, animals, food, objects)
        const emojis = [
            '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','😘','😗','😙','😚','😋',
            '😜','🤪','😝','😛','🤑','🤗','🤭','🤫','🤔','🤓','😎','🥳','🤠','🤡','👻','👽','🤖','🎃','😺','😸',
            '😻','😼','😽','🙀','😿','😹','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🐮','🐷','🐵','🦄','🐥',
            '🐧','🐢','🐸','🐙','🦋','🐝','🐳','🐬','🦕','🦖','🌸','🌼','🌻','🌷','🍀','🍃','🍎','🍉','🍓','🍍',
            '🍓','🍊','🍋','🍇','🍑','🍒','🍌','🍩','🍪','🍰','🧁','🍫','🍬','🍭','🍯','🥞','🧇','🥐','🥯','🥨',
            '🎈','🎉','🎊','🎁','🪅','🧸','🪄','⭐','🌟','⚡','✨','💎','🧩','🎲','🎮','🎧','🎵','🎶','🎨'
        ];
        // Mix in a stronger seed using crypto if available, persisted per browser
        let browserSalt = localStorage.getItem('emojiSalt');
        if (!browserSalt) {
            if (window.crypto && window.crypto.getRandomValues) {
                const arr = new Uint32Array(2);
                window.crypto.getRandomValues(arr);
                browserSalt = `${arr[0].toString(36)}${arr[1].toString(36)}`;
            } else {
                browserSalt = String(Date.now());
            }
            localStorage.setItem('emojiSalt', browserSalt);
        }
        const fullSeed = `${seedStr}:${browserSalt}`;
        let hash = 0;
        for (let i = 0; i < fullSeed.length; i++) {
            hash = ((hash << 5) - hash) + fullSeed.charCodeAt(i);
            hash |= 0;
        }
        const idx = Math.abs(hash) % emojis.length;
        return emojis[idx];
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
