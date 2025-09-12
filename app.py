"""
MindWeb Flask Application
Author: lycosa9527 - Made by MindSpring Team
"""

from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import json
import time
from datetime import datetime, timezone, timedelta
from dify_client import get_dify_client
from config import config
from models import db, User, Conversation, Message, OnlineUser
from logging_config import setup_logging, get_logger
import logging

def create_app(config_name='default'):
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize logging
    logger = setup_logging("MindWeb", logging.DEBUG if app.debug else logging.INFO)
    app.logger = logger
    
    # Initialize database
    db.init_app(app)
    
    # Enable CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Database helper functions
    def get_or_create_user(user_id, username, emoji):
        """Get or create user in database"""
        user = User.query.filter_by(user_id=user_id).first()
        if not user:
            user = User(user_id=user_id, username=username, emoji=emoji)
            db.session.add(user)
            db.session.commit()
        else:
            # Update last seen and online status
            user.last_seen = datetime.now(timezone.utc)
            user.is_online = True
            db.session.commit()
        return user
    
    def get_or_create_conversation(conversation_id):
        """Get or create conversation in database"""
        if not conversation_id:
            return None
        
        conversation = Conversation.query.filter_by(conversation_id=conversation_id).first()
        if not conversation:
            conversation = Conversation(conversation_id=conversation_id)
            db.session.add(conversation)
            db.session.commit()
        return conversation
    
    def save_message(content, message_type, user_id=None, conversation_id=None, metadata=None):
        """Save message to database"""
        message_id = f"msg_{int(time.time())}_{hash(content) % 10000}"
        
        # Get user if provided
        user = None
        if user_id:
            user = User.query.filter_by(user_id=user_id).first()
        
        # Get conversation if provided
        conversation = None
        if conversation_id:
            conversation = Conversation.query.filter_by(conversation_id=conversation_id).first()
        
        message = Message(
            message_id=message_id,
            content=content,
            message_type=message_type,
            user_id=user.id if user else None,
            conversation_id=conversation.id if conversation else None
        )
        
        if metadata:
            message.set_metadata(metadata)
        
        db.session.add(message)
        db.session.commit()
        return message
    
    @app.route('/')
    def index():
        """Main page with AI chat interface"""
        return render_template('index.html')
    
    @app.route('/api/chat', methods=['POST'])
    def chat():
        """Handle chat messages with Dify API"""
        logger = get_logger('chat')
        request_logger = get_logger('requests')
        
        try:
            data = request.get_json()
            message = data.get('message', '').strip()
            user_id = data.get('user_id', f'user_{int(time.time())}')
            conversation_id = data.get('conversation_id')
            username = data.get('username', f'用户{hash(user_id) % 1000}')
            emoji = data.get('emoji', '😀')
            
            # Log request details
            request_logger.info(f"Chat request from {username} ({user_id}) - Message length: {len(message)}")
            logger.debug(f"Chat request data: {data}")
            
            if not message:
                logger.warning(f"Empty message from user {username} ({user_id})")
                return jsonify({'error': 'Message cannot be empty'}), 400
            
            # Get or create user in database
            try:
                with app.app_context():
                    user = get_or_create_user(user_id, username, emoji)
                    
                    # Save user message to database
                    save_message(message, 'user', user_id, conversation_id)
                logger.info(f"User message saved to database for {username}")
            except Exception as e:
                logger.error(f"Error saving user message to database: {e}")
                # Continue with API call even if database save fails
            
            # Get Dify client
            client = get_dify_client()
            
            def generate_response():
                """Generate streaming response from Dify API"""
                current_conversation_id = conversation_id
                ai_response_content = ""
                chunk_count = 0
                
                try:
                    logger.info(f"Starting Dify API stream for user {username} ({user_id})")
                    for chunk in client.send_message(
                        message=message,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        stream=True
                    ):
                        chunk_count += 1
                        
                        # Process different event types
                        event = chunk.get('event', 'message')
                        
                        if event == 'message':
                            # Regular message content
                            content = chunk.get('answer', '')
                            if content:
                                ai_response_content += content
                                yield f"data: {json.dumps({'type': 'content', 'data': content})}\n\n"
                        
                        elif event == 'message_end':
                            # Message completed
                            current_conversation_id = chunk.get('conversation_id', current_conversation_id)
                            logger.info(f"Dify response completed for {username} - {len(ai_response_content)} characters, {chunk_count} chunks")
                            
                            # Save AI response to database within app context
                            if ai_response_content:
                                try:
                                    with app.app_context():
                                        save_message(ai_response_content, 'ai', None, current_conversation_id)
                                    logger.info(f"AI response saved to database for conversation {current_conversation_id}")
                                except Exception as e:
                                    logger.error(f"Error saving AI response to database: {e}")
                                    # Continue with response even if database save fails
                            
                            yield f"data: {json.dumps({'type': 'end', 'conversation_id': current_conversation_id})}\n\n"
                        
                        elif event == 'error':
                            # Error occurred
                            error = chunk.get('error', 'Unknown error')
                            logger.error(f"Dify API error for user {username}: {error}")
                            yield f"data: {json.dumps({'type': 'error', 'data': error})}\n\n"
                        
                        elif event == 'agent_thought':
                            # Agent thinking (if supported)
                            thought = chunk.get('thought', '')
                            if thought:
                                yield f"data: {json.dumps({'type': 'thought', 'data': thought})}\n\n"
                    
                    # Send completion signal
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    
                except Exception as e:
                    error_msg = f"Error generating response: {str(e)}"
                    logger.error(f"Stream generation error for user {username}: {error_msg}")
                    yield f"data: {json.dumps({'type': 'error', 'data': error_msg})}\n\n"
            
            return Response(
                generate_response(),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Cache-Control'
                }
            )
            
        except Exception as e:
            logger.error(f"Chat endpoint error: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/chat/history', methods=['GET'])
    def get_chat_history():
        """Get chat history from database"""
        try:
            conversation_id = request.args.get('conversation_id')
            limit = int(request.args.get('limit', 50))
            offset = int(request.args.get('offset', 0))
            
            query = Message.query.order_by(Message.created_at.desc())
            
            if conversation_id:
                conversation = Conversation.query.filter_by(conversation_id=conversation_id).first()
                if conversation:
                    query = query.filter_by(conversation_id=conversation.id)
            
            messages = query.limit(limit).offset(offset).all()
            
            # Convert to dict format
            history = []
            for msg in reversed(messages):  # Reverse to get chronological order
                history.append(msg.to_dict())
            
            return jsonify({
                'messages': history,
                'total': query.count(),
                'limit': limit,
                'offset': offset
            })
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/chat/delete', methods=['DELETE'])
    def delete_conversation():
        """Delete a conversation"""
        try:
            data = request.get_json()
            conversation_id = data.get('conversation_id')
            
            if not conversation_id:
                return jsonify({'error': 'conversation_id is required'}), 400
            
            client = get_dify_client()
            success = client.delete_conversation(conversation_id)
            
            if success:
                return jsonify({'message': 'Conversation deleted successfully'})
            else:
                return jsonify({'error': 'Failed to delete conversation'}), 500
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/users/online', methods=['GET'])
    def get_online_users():
        """Get online users from database"""
        logger = get_logger('users')
        
        try:
            # Get users who were active in the last 5 minutes
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=5)
            online_users = User.query.filter(
                User.last_seen >= cutoff_time,
                User.is_online == True
            ).all()
            
            users_data = [user.to_dict() for user in online_users]
            logger.debug(f"Retrieved {len(users_data)} online users")
            return jsonify({
                'success': True,
                'users': users_data,
                'count': len(users_data)
            })
            
        except Exception as e:
            logger.error(f"Error getting online users: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'timestamp': time.time(),
            'version': '1.0.0'
        })
    
    @app.route('/api/requests/status', methods=['GET'])
    def get_request_status():
        """Get current Dify request status and statistics"""
        logger = get_logger('requests')
        
        try:
            client = get_dify_client()
            stats = client.get_request_stats()
            
            # Clean up old requests
            client.cleanup_old_requests()
            
            logger.debug(f"Request status: {stats['active_requests']} active requests, {stats['session_pool_size']} sessions in pool")
            
            return jsonify({
                'success': True,
                'stats': stats
            })
            
        except Exception as e:
            logger.error(f"Error getting request status: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/users/visit', methods=['POST'])
    def track_user_visit():
        """Track when a user visits the page"""
        logger = get_logger('users')
        
        try:
            data = request.get_json()
            user_id = data.get('user_id', f'user_{int(time.time())}')
            username = data.get('username', f'用户{hash(user_id) % 1000}')
            emoji = data.get('emoji', '😀')
            
            logger.info(f"User visit tracked: {username} ({user_id})")
            
            # Add or update user in database
            try:
                with app.app_context():
                    user = get_or_create_user(user_id, username, emoji)
                    logger.debug(f"User {username} added/updated in database")
            except Exception as e:
                logger.error(f"Error saving user visit to database: {e}")
                return jsonify({'success': False, 'error': 'Database error'}), 500
            
            return jsonify({
                'success': True,
                'message': 'Visit tracked successfully',
                'user_id': user_id
            })
            
        except Exception as e:
            logger.error(f"Error tracking user visit: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return jsonify({'error': 'Endpoint not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    # Create application
    app = create_app()
    
    # Run development server
    app.run(
        host='0.0.0.0',
        port=9530,
        debug=True,
        threaded=True
    )
