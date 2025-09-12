# MindWeb - AI Chat Interface

A modern Flask-based web application that integrates with Dify API to provide AI-powered chat functionality with streaming responses, markdown rendering, and real-time chat capabilities.

## Features

- **AI Chat Integration**: Connect to Dify API for intelligent conversations
- **Streaming Responses**: Real-time response streaming for better user experience
- **Markdown Support**: Rich text rendering with syntax highlighting
- **Live Chat**: Real-time chat panel for multiple users
- **Modern UI**: Clean, responsive design with professional styling
- **Mobile Friendly**: Works seamlessly on desktop and mobile devices

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Dify API key and endpoint

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd MindWeb
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your actual values
   # Set your DIFY_API_KEY and other configuration
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:9530`

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# Dify API Configuration
DIFY_API_KEY=your-dify-api-key-here
DIFY_API_URL=https://api.dify.ai/v1
DIFY_TIMEOUT=30

# CORS Configuration
CORS_ORIGINS=*
```

### Dify API Setup

1. Get your API key from Dify platform
2. Set the correct API URL for your Dify instance
3. Configure timeout based on your needs (default: 30 seconds)

## Project Structure

```
MindWeb/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── dify_client.py        # Dify API integration
├── requirements.txt      # Python dependencies
├── env.example          # Environment configuration template
├── static/
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   ├── js/
│   │   ├── chat.js       # Live chat functionality
│   │   └── main.js       # Main application logic
│   └── images/           # Static images
├── templates/
│   └── index.html        # Main HTML template
├── FRAMEWORK.md          # Detailed framework documentation
└── README.md             # This file
```

## API Endpoints

### Chat Endpoints

- `POST /api/chat` - Send message to AI (streaming response)
- `GET /api/chat/history` - Get chat history for user
- `DELETE /api/chat/delete` - Delete a conversation

### Utility Endpoints

- `GET /api/health` - Health check endpoint

## Usage

### AI Chat

1. Type your message in the main input area
2. Press Enter or click Send to send the message
3. Watch the AI response stream in real-time
4. Use the Clear Chat button to start a new conversation

### Live Chat

1. Click the "Chat Panel" button to open the live chat
2. Type messages to chat with other users
3. Messages are stored locally and shared with all users
4. Use the close button to hide the chat panel

## Development

### Running in Development Mode

```bash
# Set environment to development
export FLASK_ENV=development

# Run with auto-reload
python app.py
```

### Running in Production

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:9530 app:app
```

## Customization

### Styling

Edit `static/css/style.css` to customize the appearance:
- Colors and themes
- Layout and spacing
- Responsive breakpoints
- Animation effects

### Functionality

- **AI Integration**: Modify `dify_client.py` for different AI providers
- **Chat Features**: Extend `static/js/chat.js` for additional chat functionality
- **UI Components**: Update `templates/index.html` for layout changes

## Troubleshooting

### Common Issues

1. **API Key Error**
   - Ensure your Dify API key is correct
   - Check that the API URL is properly configured

2. **Streaming Not Working**
   - Verify your Dify API supports streaming
   - Check browser console for errors

3. **CORS Issues**
   - Update CORS_ORIGINS in your .env file
   - Ensure your domain is allowed

### Debug Mode

Enable debug mode by setting `FLASK_ENV=development` in your `.env` file.

## Security Considerations

- Keep your API keys secure and never commit them to version control
- Use environment variables for sensitive configuration
- Consider implementing rate limiting for production use
- Validate and sanitize all user inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[To be specified based on project requirements]

## Author

lycosa9527 - Made by MindSpring Team

## Support

For issues and questions, please check the troubleshooting section or create an issue in the repository.
