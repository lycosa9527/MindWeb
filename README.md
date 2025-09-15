# MindWeb - AI Chat Interface / MindWeb - AI 聊天界面

A modern Flask-based web application that integrates with Dify API to provide AI-powered chat functionality with streaming responses, markdown rendering, and real-time multi-user chat capabilities.

一个现代化的基于 Flask 的 Web 应用程序，集成了 Dify API，提供 AI 驱动的聊天功能，支持流式响应、Markdown 渲染和实时多用户聊天功能。

## ✨ Latest Updates (v1.3.0) / 最新更新 (v1.3.0)

- 🚀 **Enhanced Streaming**: Improved reliability and performance for real-time AI responses
  - **增强流式传输**：提高实时 AI 响应的可靠性和性能
- 🌏 **Beijing Time Support**: All timestamps display in Beijing Time (UTC+8)
  - **北京时间支持**：所有时间戳显示北京时间 (UTC+8)
- 🔄 **Unified Deployment**: Single `app.py` file for development and production
  - **统一部署**：单个 `app.py` 文件用于开发和生产
- 🎯 **Improved UX**: Cleaner notifications and better message finalization
  - **改进用户体验**：更清洁的通知和更好的消息完成处理
- 🧪 **Enhanced Testing**: Comprehensive API testing suite with concurrent user simulation
  - **增强测试**：全面的 API 测试套件，支持并发用户模拟

## Features / 功能特性

- **AI Chat Integration**: Connect to Dify API for intelligent conversations with streaming responses
  - **AI 聊天集成**：连接 Dify API 进行智能对话，支持流式响应
- **Real-time Broadcasting**: Multi-user chat with live message streaming to all connected users
  - **实时广播**：多用户聊天，实时消息流传输到所有连接用户
- **Markdown Support**: Rich text rendering with syntax highlighting
  - **Markdown 支持**：富文本渲染，支持语法高亮
- **Timezone Consistency**: All timestamps display in Beijing Time (UTC+8)
  - **时区一致性**：所有时间戳显示北京时间 (UTC+8)
- **Modern UI**: Clean, responsive design with professional styling
  - **现代化界面**：简洁、响应式设计，专业风格
- **Mobile Friendly**: Works seamlessly on desktop and mobile devices
  - **移动友好**：在桌面和移动设备上无缝工作
- **Production Ready**: Optimized for production deployment with Waitress WSGI server
  - **生产就绪**：使用 Waitress WSGI 服务器优化生产部署

## Quick Start / 快速开始

### Prerequisites / 前置要求

- Python 3.8 or higher / Python 3.8 或更高版本
- Dify API key and endpoint / Dify API 密钥和端点

### Installation / 安装

1. **Clone or download the project / 克隆或下载项目**
   ```bash
   git clone <repository-url>
   cd MindWeb
   ```

2. **Install dependencies / 安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment / 配置环境**
   ```bash
   # Copy the example environment file
   # 复制示例环境文件
   cp env.example .env
   
   # Edit .env with your actual values
   # 使用实际值编辑 .env 文件
   # Set your DIFY_API_KEY and other configuration
   # 设置您的 DIFY_API_KEY 和其他配置
   ```

4. **Run the application / 运行应用程序**
   
   **Simple startup / 简单启动**
   ```bash
   python app.py                    # Interactive mode selection / 交互式模式选择
   python app.py --production       # Production mode / 生产模式
   python app.py --test             # Run tests / 运行测试
   ```

5. **Open your browser / 打开浏览器**
   Navigate to `http://localhost:9530` / 访问 `http://localhost:9530`

## Configuration / 配置

### Environment Variables / 环境变量

Create a `.env` file in the project root with the following variables:
在项目根目录创建 `.env` 文件，包含以下变量：

```env
# Flask Configuration / Flask 配置
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# Dify API Configuration / Dify API 配置
DIFY_API_KEY=your-dify-api-key-here
DIFY_API_URL=https://api.dify.ai/v1
DIFY_TIMEOUT=30

# CORS Configuration / CORS 配置
CORS_ORIGINS=*
```

### Dify API Setup / Dify API 设置

1. Get your API key from Dify platform / 从 Dify 平台获取您的 API 密钥
2. Set the correct API URL for your Dify instance / 为您的 Dify 实例设置正确的 API URL
3. Configure timeout based on your needs (default: 30 seconds) / 根据您的需要配置超时时间（默认：30 秒）

## Project Structure / 项目结构

```
MindWeb/
├── app.py                 # 🚀 Main Flask application (unified dev/prod) / 主 Flask 应用程序（统一开发/生产）
├── config.py             # Configuration settings / 配置设置
├── dify_client.py        # Dify API integration / Dify API 集成
├── models.py             # Database models / 数据库模型
├── logging_config.py     # Logging configuration / 日志配置
├── test_streaming.py     # 🧪 API testing suite / API 测试套件
├── requirements.txt      # Python dependencies / Python 依赖
├── env.example          # Environment configuration template / 环境配置模板
├── CHANGELOG.md          # 📝 Version history and updates / 版本历史和更新
├── static/
│   ├── css/
│   │   └── style.css     # Main stylesheet / 主样式表
│   ├── js/
│   │   ├── chat.js       # Live chat functionality / 实时聊天功能
│   │   └── main.js       # Main application logic / 主应用程序逻辑
│   └── images/           # Static images / 静态图片
├── templates/
│   └── index.html        # Main HTML template / 主 HTML 模板
├── logs/                 # Application logs / 应用程序日志
│   ├── mindweb.log       # Main application log / 主应用程序日志
│   ├── errors.log        # Error log / 错误日志
│   └── requests.log      # Request log / 请求日志
├── instance/
│   └── mindweb.db        # SQLite database / SQLite 数据库
└── README.md             # This file / 本文件
```

## API Endpoints / API 端点

### Chat Endpoints / 聊天端点

- `POST /api/chat` - Send message to AI (streaming response) / 发送消息给 AI（流式响应）
- `GET /api/chat/history` - Get chat history for user / 获取用户聊天历史
- `GET /api/chat/broadcast` - Real-time broadcast stream (Server-Sent Events) / 实时广播流（服务器发送事件）
- `DELETE /api/chat/delete` - Delete a conversation / 删除对话

### User Management Endpoints / 用户管理端点

- `GET /api/users/online` - Get online users / 获取在线用户
- `POST /api/users/visit` - Track user visit / 跟踪用户访问

### Utility Endpoints / 工具端点

- `GET /api/health` - Health check endpoint / 健康检查端点
- `GET /api/qr-code` - Generate QR code for sharing / 生成分享二维码
- `GET /api/metrics` - **NEW**: Comprehensive application metrics for production monitoring / 全面应用程序指标用于生产监控
- `GET /api/broadcast/stats` - Get broadcast system statistics / 获取广播系统统计
- `GET /api/requests/status` - Get Dify request status / 获取 Dify 请求状态

## Usage / 使用方法

### AI Chat / AI 聊天

1. Type your message in the main input area / 在主输入区域输入您的消息
2. Press Enter or click Send to send the message / 按回车键或点击发送按钮发送消息
3. Watch the AI response stream in real-time / 实时观看 AI 响应流
4. Use the Clear Chat button to start a new conversation / 使用清除聊天按钮开始新对话

### Multi-User Chat Experience / 多用户聊天体验

1. **Real-time Broadcasting**: When any user sends a message to AI, all connected users see the streaming response
   - **实时广播**：当任何用户向 AI 发送消息时，所有连接的用户都能看到流式响应
2. **Message Finalization**: Streaming messages convert to regular message bubbles when complete
   - **消息完成处理**：流式消息在完成时转换为常规消息气泡
3. **Timezone Display**: All timestamps show in Beijing Time (UTC+8)
   - **时区显示**：所有时间戳显示北京时间 (UTC+8)
4. **Online Users**: See who's currently online in the user panel
   - **在线用户**：在用户面板中查看当前在线用户

### Live Chat Panel / 实时聊天面板

1. Click the "在线用户" button to open the user panel / 点击"在线用户"按钮打开用户面板
2. View online users and their activity / 查看在线用户及其活动
3. Share the application URL using the QR code feature / 使用二维码功能分享应用程序 URL
4. Use the close button to hide the panel / 使用关闭按钮隐藏面板

## Development / 开发

### Running in Development Mode / 开发模式运行

```bash
# Method 1: Interactive mode / 方法1：交互式模式
python app.py

# Method 2: Set environment variable / 方法2：设置环境变量
export FLASK_ENV=development
python app.py
```

### Running in Production / 生产环境运行

```bash
# Method 1: Direct execution with flag / 方法1：使用标志直接执行
python app.py --production

# Method 2: Set environment variable / 方法2：设置环境变量
export FLASK_ENV=production
python app.py

# Method 3: Using waitress directly / 方法3：直接使用 waitress
waitress-serve --host=0.0.0.0 --port=9530 app:create_app
```

**Production Features / 生产特性:**
- ✅ **Waitress WSGI Server** - Optimized for production / 为生产环境优化
- ✅ **Multiple Threads** - Better concurrency / 更好的并发性
- ✅ **Connection Limits** - Prevents overload / 防止过载
- ✅ **Auto Cleanup** - Memory management / 内存管理
- ✅ **Timeout Handling** - Better reliability / 更好的可靠性

### Testing / 测试

```bash
# Method 1: Using integrated test mode / 方法1：使用集成测试模式
python app.py --test

# Method 2: Direct execution / 方法2：直接执行
python test_streaming.py

# Method 3: Run specific tests / 方法3：运行特定测试
python test_streaming.py
# Then select from menu:
# 1. Send single test message
# 2. Send multiple test messages sequentially
# 3. Simulate concurrent users
# 4. Test broadcast stream directly
# 5. Quick test (send 3 messages)
```

**Test Features / 测试特性:**
- ✅ **Real API Testing** - Tests actual MindWeb endpoints / 测试实际的 MindWeb 端点
- ✅ **Broadcast Testing** - Tests streaming to all users / 测试向所有用户的流式传输
- ✅ **Concurrent Users** - Simulates multiple users / 模拟多用户
- ✅ **Performance Testing** - Tests under load / 负载测试

## Customization / 自定义

### Styling / 样式

Edit `static/css/style.css` to customize the appearance:
编辑 `static/css/style.css` 来自定义外观：
- Colors and themes / 颜色和主题
- Layout and spacing / 布局和间距
- Responsive breakpoints / 响应式断点
- Animation effects / 动画效果

### Functionality / 功能

- **AI Integration**: Modify `dify_client.py` for different AI providers / **AI 集成**：修改 `dify_client.py` 以支持不同的 AI 提供商
- **Chat Features**: Extend `static/js/chat.js` for additional chat functionality / **聊天功能**：扩展 `static/js/chat.js` 以添加更多聊天功能
- **UI Components**: Update `templates/index.html` for layout changes / **UI 组件**：更新 `templates/index.html` 以修改布局

## Troubleshooting / 故障排除

### Common Issues / 常见问题

1. **API Key Error / API 密钥错误**
   - Ensure your Dify API key is correct / 确保您的 Dify API 密钥正确
   - Check that the API URL is properly configured / 检查 API URL 是否正确配置

2. **Streaming Not Working / 流式响应不工作**
   - Verify your Dify API supports streaming / 验证您的 Dify API 支持流式响应
   - Check browser console for errors / 检查浏览器控制台错误
   - Ensure SSE (Server-Sent Events) are supported in your browser / 确保您的浏览器支持 SSE（服务器发送事件）

3. **Multi-User Broadcasting Issues / 多用户广播问题**
   - Check that multiple users can connect to the broadcast stream / 检查多个用户是否可以连接到广播流
   - Verify that messages are being sent to all connected clients / 验证消息是否发送到所有连接的客户端
   - Use the test suite to verify broadcasting functionality / 使用测试套件验证广播功能

4. **Timezone Display Issues / 时区显示问题**
   - All timestamps should display in Beijing Time (UTC+8) / 所有时间戳应显示北京时间 (UTC+8)
   - Check that `pytz` is properly installed / 检查 `pytz` 是否正确安装

5. **CORS Issues / CORS 问题**
   - Update CORS_ORIGINS in your .env file / 在 .env 文件中更新 CORS_ORIGINS
   - Ensure your domain is allowed / 确保您的域名被允许

6. **Production Deployment Issues / 生产部署问题**
   - Ensure Waitress is installed for production mode / 确保为生产模式安装 Waitress
   - Check that the application starts correctly with `--production` flag / 检查应用程序是否使用 `--production` 标志正确启动

### Debug Mode / 调试模式

Enable debug mode by setting `FLASK_ENV=development` in your `.env` file.
通过在 `.env` 文件中设置 `FLASK_ENV=development` 来启用调试模式。

### Testing / 测试

Use the built-in testing suite to diagnose issues:
使用内置测试套件诊断问题：

```bash
# Run comprehensive tests / 运行综合测试
python app.py --test

# Or run tests directly / 或直接运行测试
python test_streaming.py
```

## Key Features & Improvements / 主要功能与改进

### v1.3.0 Highlights / v1.3.0 亮点

- **🚀 Enhanced Streaming Performance**: Fixed critical bugs in streaming content accumulation and improved real-time response handling
  - **增强流式性能**：修复流式内容累积中的关键错误，改进实时响应处理
- **🌏 Beijing Time Integration**: Comprehensive timezone support with consistent timestamp display across all components
  - **北京时间集成**：全面的时区支持，所有组件中一致的时间戳显示
- **🔄 Unified Deployment**: Single-file application with interactive mode selection for simplified deployment
  - **统一部署**：单文件应用程序，具有交互式模式选择，简化部署
- **🎯 Improved User Experience**: Cleaner notifications, better message finalization, and enhanced multi-user chat experience
  - **改进用户体验**：更清洁的通知、更好的消息完成处理，增强多用户聊天体验
- **🧪 Comprehensive Testing**: Built-in API testing suite with concurrent user simulation and broadcast testing
  - **全面测试**：内置 API 测试套件，支持并发用户模拟和广播测试

### Technical Improvements / 技术改进

- **Dify API Integration**: Enhanced SSE parsing, error handling, and timeout management
  - **Dify API 集成**：增强的 SSE 解析、错误处理和超时管理
- **Broadcasting System**: Atomic event counters, proper ordering, and race condition prevention
  - **广播系统**：原子事件计数器、 proper ordering 和竞态条件预防
- **Frontend Enhancements**: Fixed content accumulation bugs, improved EventSource handling, and better conversation management
  - **前端增强**：修复内容累积错误、改进 EventSource 处理和更好的对话管理
- **Production Ready**: Optimized Waitress WSGI server configuration with proper connection limits and memory management
  - **生产就绪**：优化的 Waitress WSGI 服务器配置，具有适当的连接限制和内存管理

## Security Considerations / 安全考虑

- Keep your API keys secure and never commit them to version control / 保护您的 API 密钥安全，永远不要将其提交到版本控制
- Use environment variables for sensitive configuration / 对敏感配置使用环境变量
- Consider implementing rate limiting for production use / 考虑在生产环境中实施速率限制
- Validate and sanitize all user inputs / 验证和清理所有用户输入

## Contributing / 贡献

1. Fork the repository / 分叉仓库
2. Create a feature branch / 创建功能分支
3. Make your changes / 进行更改
4. Test thoroughly / 彻底测试
5. Submit a pull request / 提交拉取请求

## Dependencies / 依赖

### Core Dependencies / 核心依赖
- `Flask==3.0.0` - Web framework / Web 框架
- `Flask-SQLAlchemy==3.1.1` - Database ORM / 数据库 ORM
- `Flask-CORS==4.0.0` - Cross-origin resource sharing / 跨域资源共享
- `Flask-Limiter==3.5.0` - Rate limiting / 速率限制
- `requests==2.31.0` - HTTP client / HTTP 客户端
- `python-dotenv==1.0.0` - Environment variable management / 环境变量管理
- `pytz==2023.3` - Timezone handling / 时区处理

### Production Dependencies / 生产依赖
- `waitress==3.0.0` - WSGI server for production / 生产环境 WSGI 服务器

### Development Dependencies / 开发依赖
- Built-in testing suite with `test_streaming.py` / 内置测试套件

## Version History / 版本历史

- **v1.3.0** (2025-01-14) - Streaming improvements, Beijing Time support, unified deployment
- **v1.2.0** (2024-12-19) - Security fixes, production optimizations
- **v1.0.0** (2025-01-12) - Initial release with core features

## License / 许可证

[To be specified based on project requirements] / [根据项目要求指定]

## Author / 作者

lycosa9527 - Made by MindSpring Team / lycosa9527 - 由 MindSpring 团队制作

## Support / 支持

For issues and questions, please check the troubleshooting section or create an issue in the repository.
如有问题和疑问，请查看故障排除部分或在仓库中创建问题。

---

**🎉 MindWeb v1.3.0 - Enhanced AI Chat with Real-time Multi-user Broadcasting**
**🎉 MindWeb v1.3.0 - 增强的 AI 聊天与实时多用户广播**
