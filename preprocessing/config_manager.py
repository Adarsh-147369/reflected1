import os
import json
from typing import Any, Dict, Optional

class ConfigManager:
    def __init__(self):
        self.config = {}
        self.config_loaded = True
        self.load_default_config()
        self.load_environment_config()
    
    def load_default_config(self):
        """Load default configuration"""
        self.config = {
            'model': {
                'name': 'all-MiniLM-L6-v2',
                'cache_folder': './models',
                'device': 'cpu'
            },
            'evaluation': {
                'similarity_threshold': 0.5,
                'confidence_threshold': 0.7,
                'timeout_seconds': 30,
                'max_text_length': 10000
            },
            'performance': {
                'enable_monitoring': True,
                'log_slow_requests': True,
                'slow_request_threshold': 2.0
            },
            'logging': {
                'level': 'INFO',
                'enable_structured_logging': True,
                'log_evaluations': True
            },
            'server': {
                'host': '0.0.0.0',
                'port': 5001,
                'debug': False
            },
            'cache': {
                'enable_caching': True,
                'cache_size': 1000,
                'cache_ttl': 3600
            }
        }
    
    def load_environment_config(self):
        """Load configuration from environment variables"""
        env_mappings = {
            'SBERT_MODEL_NAME': ['model', 'name'],
            'SBERT_DEVICE': ['model', 'device'],
            'SBERT_PORT': ['server', 'port'],
            'SBERT_HOST': ['server', 'host'],
            'SBERT_DEBUG': ['server', 'debug'],
            'SBERT_LOG_LEVEL': ['logging', 'level'],
            'SBERT_SIMILARITY_THRESHOLD': ['evaluation', 'similarity_threshold'],
            'SBERT_CONFIDENCE_THRESHOLD': ['evaluation', 'confidence_threshold'],
            'SBERT_TIMEOUT': ['evaluation', 'timeout_seconds']
        }
        
        for env_var, config_path in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                self._set_nested_config(config_path, self._convert_env_value(value))
    
    def load_config_file(self, config_path: str):
        """Load configuration from JSON file"""
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    self._merge_config(self.config, file_config)
        except Exception as e:
            print(f"Warning: Could not load config file {config_path}: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by key (supports dot notation)"""
        keys = key.split('.')
        value = self.config
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key: str, value: Any):
        """Set configuration value by key (supports dot notation)"""
        keys = key.split('.')
        self._set_nested_config(keys, value)
    
    def _set_nested_config(self, keys: list, value: Any):
        """Set nested configuration value"""
        config = self.config
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        
        # Convert string values to appropriate types
        config[keys[-1]] = self._convert_env_value(value)
    
    def _convert_env_value(self, value: str) -> Any:
        """Convert environment variable string to appropriate type"""
        if isinstance(value, str):
            # Boolean conversion
            if value.lower() in ('true', 'false'):
                return value.lower() == 'true'
            
            # Integer conversion
            try:
                if '.' not in value:
                    return int(value)
            except ValueError:
                pass
            
            # Float conversion
            try:
                return float(value)
            except ValueError:
                pass
        
        return value
    
    def _merge_config(self, base: dict, override: dict):
        """Merge override config into base config"""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._merge_config(base[key], value)
            else:
                base[key] = value
    
    def get_all(self) -> Dict[str, Any]:
        """Get all configuration"""
        return self.config.copy()
    
    def get_all_config(self) -> Dict[str, Any]:
        """Get all configuration (alias for compatibility)"""
        return self.get_all()
    
    def validate_config(self) -> tuple[bool, list]:
        """Validate configuration and return (is_valid, errors)"""
        errors = []
        
        # Validate required settings
        required_settings = [
            ('model.name', str),
            ('server.port', int),
            ('evaluation.similarity_threshold', (int, float)),
            ('evaluation.confidence_threshold', (int, float))
        ]
        
        for setting, expected_type in required_settings:
            value = self.get(setting)
            if value is None:
                errors.append(f"Missing required setting: {setting}")
            elif not isinstance(value, expected_type):
                errors.append(f"Invalid type for {setting}: expected {expected_type}, got {type(value)}")
        
        # Validate ranges
        if self.get('server.port', 0) < 1 or self.get('server.port', 0) > 65535:
            errors.append("server.port must be between 1 and 65535")
        
        similarity_threshold = self.get('evaluation.similarity_threshold', 0)
        if not (0 <= similarity_threshold <= 1):
            errors.append("evaluation.similarity_threshold must be between 0 and 1")
        
        confidence_threshold = self.get('evaluation.confidence_threshold', 0)
        if not (0 <= confidence_threshold <= 1):
            errors.append("evaluation.confidence_threshold must be between 0 and 1")
        
        return len(errors) == 0, errors

# Global config manager instance
_config_manager = None

def get_config_manager() -> ConfigManager:
    """Get global config manager instance"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager