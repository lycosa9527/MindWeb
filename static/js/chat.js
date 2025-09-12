/**
 * Chat.js - Real-time Chat Functionality
 * Author: lycosa9527 - Made by MindSpring Team
 */

class LiveChat {
    constructor() {
        this.messages = [];
        this.currentUser = this.generateUserId();
        this.isConnected = false;
        this.messageQueue = [];
        this.onlineUsers = new Map();
        this.userEmojis = [
            '😀', '😊', '😎', '🤔', '😴', '🤗', '😍', '🤩', '😋', '😜', 
            '🤪', '😏', '🙃', '😌', '😇', '🥳', '😘', '🥰', '😚', '😙',
            '😗', '😽', '😼', '😻', '😸', '😹', '😺', '😿', '😾', '🙀',
            '🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍',
            '🦄', '🐴', '🦓', '🦌', '🐗', '🐺', '🐪', '🐫', '🦒', '🐘',
            '🦏', '🦛', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🌻', '🌺', '🌸', '🌼', '🌷', '🌹', '🥀', '🌿', '🍀', '🌱',
            '🌵', '🌴', '🌳', '🌲', '🌰', '🍄', '🍁', '🍂', '🍃', '🌾'
        ];
        
        // Education-themed username components
        this.educationTitles = [
            '老师', '教师', '导师', '教授', '讲师', '助教', '班主任', '辅导员',
            '校长', '主任', '院长', '专家', '学者', '研究员', '博士', '硕士'
        ];
        
        this.educationSubjects = [
            '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理',
            '政治', '音乐', '美术', '体育', '科学', '技术', '工程', '艺术',
            '文学', '哲学', '心理学', '教育学', '计算机', '人工智能', '创新', '思维'
        ];
        
        this.educationAdjectives = [
            '智慧', '创新', '启发', '探索', '发现', '思考', '学习', '成长',
            '知识', '智慧', '博学', '渊博', '专业', '资深', '优秀', '杰出',
            '耐心', '细心', '用心', '专心', '热心', '爱心', '责任心', '使命感'
        ];
        
        this.educationNouns = [
            '园丁', '蜡烛', '灯塔', '指南针', '钥匙', '桥梁', '阶梯', '明灯',
            '导师', '引路人', '启蒙者', '播种者', '耕耘者', '守护者', '陪伴者', '支持者'
        ];
        
        this.initializeElements();
        this.bindEvents();
        this.loadStoredMessages();
        this.initializeUser();
    }
    
    initializeElements() {
        this.chatPanel = document.getElementById('chatPanel');
        this.liveChatMessages = document.getElementById('liveChatMessages');
        this.liveChatInput = document.getElementById('liveChatInput');
        this.sendLiveMessage = document.getElementById('sendLiveMessage');
        this.toggleChat = document.getElementById('toggleChat');
        this.closeChatPanel = document.getElementById('closeChatPanel');
        this.usersList = document.getElementById('usersList');
    }
    
    bindEvents() {
        // Toggle chat panel
        this.toggleChat.addEventListener('click', () => {
            this.toggleChatPanel();
        });
        
        // Close chat panel
        this.closeChatPanel.addEventListener('click', () => {
            this.hideChatPanel();
        });
        
        // Send live message
        this.sendLiveMessage.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send message
        this.liveChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize input
        this.liveChatInput.addEventListener('input', () => {
            this.autoResizeInput();
        });
    }
    
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    generateEducationUsername() {
        // Generate education-themed username with different patterns
        const patterns = [
            // Pattern 1: Title + Subject + Number
            () => {
                const title = this.educationTitles[Math.floor(Math.random() * this.educationTitles.length)];
                const subject = this.educationSubjects[Math.floor(Math.random() * this.educationSubjects.length)];
                const number = Math.floor(Math.random() * 99) + 1;
                return `${title}${subject}${number}`;
            },
            
            // Pattern 2: Adjective + Noun + Subject
            () => {
                const adjective = this.educationAdjectives[Math.floor(Math.random() * this.educationAdjectives.length)];
                const noun = this.educationNouns[Math.floor(Math.random() * this.educationNouns.length)];
                const subject = this.educationSubjects[Math.floor(Math.random() * this.educationSubjects.length)];
                return `${adjective}${noun}${subject}`;
            },
            
            // Pattern 3: Subject + Title + Adjective
            () => {
                const subject = this.educationSubjects[Math.floor(Math.random() * this.educationSubjects.length)];
                const title = this.educationTitles[Math.floor(Math.random() * this.educationTitles.length)];
                const adjective = this.educationAdjectives[Math.floor(Math.random() * this.educationAdjectives.length)];
                return `${subject}${title}${adjective}`;
            },
            
            // Pattern 4: Education + Subject + Number
            () => {
                const subject = this.educationSubjects[Math.floor(Math.random() * this.educationSubjects.length)];
                const number = Math.floor(Math.random() * 999) + 1;
                return `教育${subject}${number}`;
            },
            
            // Pattern 5: School + Subject + Title
            () => {
                const subject = this.educationSubjects[Math.floor(Math.random() * this.educationSubjects.length)];
                const title = this.educationTitles[Math.floor(Math.random() * this.educationTitles.length)];
                return `学校${subject}${title}`;
            }
        ];
        
        // Randomly select a pattern
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        return selectedPattern();
    }
    
    toggleChatPanel() {
        if (this.chatPanel.classList.contains('hidden')) {
            this.showChatPanel();
        } else {
            this.hideChatPanel();
        }
    }
    
    showChatPanel() {
        this.chatPanel.classList.remove('hidden');
        this.toggleChat.innerHTML = '<i class="fas fa-times"></i> 关闭聊天';
        this.liveChatInput.focus();
    }
    
    hideChatPanel() {
        this.chatPanel.classList.add('hidden');
        this.toggleChat.innerHTML = '<i class="fas fa-users"></i> 在线用户';
    }
    
    sendMessage() {
        const message = this.liveChatInput.value.trim();
        if (!message) return;
        
        // Create message object
        const messageObj = {
            id: this.generateMessageId(),
            userId: this.currentUser,
            username: this.getUsername(),
            message: message,
            timestamp: new Date().toISOString(),
            type: 'user'
        };
        
        // Add to messages array
        this.messages.push(messageObj);
        
        // Display message
        this.displayMessage(messageObj);
        
        // Clear input
        this.liveChatInput.value = '';
        this.autoResizeInput();
        
        // Store messages
        this.storeMessages();
        
        // Simulate other users (for demo purposes)
        this.simulateOtherUsers(message);
    }
    
    displayMessage(messageObj) {
        const messageElement = this.createMessageElement(messageObj);
        this.liveChatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    createMessageElement(messageObj) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `live-chat-message ${messageObj.type}`;
        messageDiv.dataset.messageId = messageObj.id;
        
        const time = new Date(messageObj.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="username">${messageObj.username}</span>
                <span class="timestamp">${time}</span>
            </div>
            <div class="message-text">${this.escapeHtml(messageObj.message)}</div>
        `;
        
        return messageDiv;
    }
    
    simulateOtherUsers(originalMessage) {
        // Simulate other users responding (for demo purposes)
        const responses = [
            "这很有趣！",
            "我同意这个观点。",
            "你能详细说明一下吗？",
            "谢谢分享！",
            "我也有类似的经历。",
            "你觉得这个怎么样？",
            "好问题！",
            "我不太确定。",
            "这对我来说很有道理。",
            "我想了解更多关于这个的信息。"
        ];
        
        // Randomly decide if other users should respond
        if (Math.random() < 0.3) {
            setTimeout(() => {
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                const otherUserMessage = {
                    id: this.generateMessageId(),
                    userId: 'other_user_' + Math.random().toString(36).substr(2, 5),
                    username: '用户' + Math.floor(Math.random() * 100),
                    message: randomResponse,
                    timestamp: new Date().toISOString(),
                    type: 'user'
                };
                
                this.messages.push(otherUserMessage);
                this.displayMessage(otherUserMessage);
                this.storeMessages();
            }, Math.random() * 3000 + 1000); // 1-4 seconds delay
        }
    }
    
    loadStoredMessages() {
        try {
            const stored = localStorage.getItem('liveChatMessages');
            if (stored) {
                this.messages = JSON.parse(stored);
                this.messages.forEach(message => {
                    this.displayMessage(message);
                });
            }
        } catch (error) {
            console.error('Error loading stored messages:', error);
        }
    }
    
    storeMessages() {
        try {
            // Keep only last 50 messages
            const recentMessages = this.messages.slice(-50);
            localStorage.setItem('liveChatMessages', JSON.stringify(recentMessages));
        } catch (error) {
            console.error('Error storing messages:', error);
        }
    }
    
    initializeUser() {
        // Get or create user profile
        let userProfile = localStorage.getItem('liveChatUserProfile');
        if (!userProfile) {
            userProfile = {
                username: this.generateEducationUsername(),
                emoji: this.userEmojis[Math.floor(Math.random() * this.userEmojis.length)],
                userId: this.currentUser
            };
            localStorage.setItem('liveChatUserProfile', JSON.stringify(userProfile));
        } else {
            userProfile = JSON.parse(userProfile);
        }
        
        this.userProfile = userProfile;
        this.addUserToList(userProfile);
        
        // Simulate other users joining
        this.simulateOtherUsersJoining();
    }
    
    getUsername() {
        return this.userProfile.username;
    }
    
    getUserEmoji() {
        return this.userProfile.emoji;
    }
    
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    
    addUserToList(userProfile) {
        if (this.onlineUsers.has(userProfile.userId)) return;
        
        this.onlineUsers.set(userProfile.userId, userProfile);
        this.renderUsersList();
    }
    
    removeUserFromList(userId) {
        this.onlineUsers.delete(userId);
        this.renderUsersList();
    }
    
    renderUsersList() {
        this.usersList.innerHTML = '';
        
        this.onlineUsers.forEach((user, userId) => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.dataset.userId = userId;
            
            userElement.innerHTML = `
                <div class="user-avatar">${user.emoji}</div>
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-status online">在线</div>
                </div>
            `;
            
            this.usersList.appendChild(userElement);
        });
    }
    
    simulateOtherUsersJoining() {
        // Simulate 2-5 other users joining
        const numUsers = Math.floor(Math.random() * 4) + 2;
        
        for (let i = 0; i < numUsers; i++) {
            setTimeout(() => {
                const otherUser = {
                    username: this.generateEducationUsername(),
                    emoji: this.userEmojis[Math.floor(Math.random() * this.userEmojis.length)],
                    userId: 'user_' + Date.now() + '_' + i
                };
                
                this.addUserToList(otherUser);
                
                // Simulate user leaving after some time
                setTimeout(() => {
                    this.removeUserFromList(otherUser.userId);
                }, Math.random() * 30000 + 10000); // 10-40 seconds
                
            }, Math.random() * 5000 + 1000); // 1-6 seconds delay
        }
    }
    
    autoResizeInput() {
        this.liveChatInput.style.height = 'auto';
        this.liveChatInput.style.height = this.liveChatInput.scrollHeight + 'px';
    }
    
    scrollToBottom() {
        this.liveChatMessages.scrollTop = this.liveChatMessages.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public methods
    addSystemMessage(message) {
        const systemMessage = {
            id: this.generateMessageId(),
            userId: 'system',
            username: '系统',
            message: message,
            timestamp: new Date().toISOString(),
            type: 'system'
        };
        
        this.messages.push(systemMessage);
        this.displayMessage(systemMessage);
        this.storeMessages();
    }
    
    clearMessages() {
        this.messages = [];
        this.liveChatMessages.innerHTML = `
            <div class="system-message">
                <i class="fas fa-info-circle"></i>
                加入对话！每个人都能看到您的消息。
            </div>
        `;
        localStorage.removeItem('liveChatMessages');
    }
}

// Initialize live chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.liveChat = new LiveChat();
});
