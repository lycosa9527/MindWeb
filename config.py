"""
Configuration settings for MindWeb Flask Application
Author: lycosa9527 - Made by MindSpring Team
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///mindweb.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Dify API settings
    DIFY_API_KEY = os.environ.get('DIFY_API_KEY')
    DIFY_API_URL = os.environ.get('DIFY_API_URL', 'https://api.dify.ai/v1')
    DIFY_TIMEOUT = int(os.environ.get('DIFY_TIMEOUT', '30'))
    
    # Response settings
    STREAMING_CHUNK_SIZE = 1024
    MAX_RESPONSE_SIZE = 1024 * 1024  # 1MB
    
    # Chat settings
    CHAT_MESSAGE_LIMIT = 100
    CHAT_HISTORY_RETENTION = 24  # hours
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    @classmethod
    def validate_config(cls):
        """Validate required configuration"""
        if not cls.DIFY_API_KEY:
            raise ValueError("DIFY_API_KEY environment variable is required")
        return True

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DIFY_API_KEY = 'test-api-key'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
