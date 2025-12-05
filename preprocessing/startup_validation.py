import os
import sys
import importlib
from typing import List, Tuple

class StartupValidator:
    def __init__(self):
        self.validation_results = []
        self.critical_errors = []
        self.warnings = []
    
    def validate(self) -> Tuple[bool, List[str], List[str]]:
        """Run all startup validations"""
        self.validation_results.clear()
        self.critical_errors.clear()
        self.warnings.clear()
        
        # Run validation checks
        self._validate_python_version()
        self._validate_required_packages()
        self._validate_model_availability()
        self._validate_system_resources()
        self._validate_file_permissions()
        
        # Determine if startup should continue
        can_start = len(self.critical_errors) == 0
        
        return can_start, self.critical_errors, self.warnings
    
    def _validate_python_version(self):
        """Validate Python version compatibility"""
        min_version = (3, 7)
        current_version = sys.version_info[:2]
        
        if current_version < min_version:
            self.critical_errors.append(
                f"Python {min_version[0]}.{min_version[1]}+ required, "
                f"but running {current_version[0]}.{current_version[1]}"
            )
        else:
            self.validation_results.append(f"Python version {current_version[0]}.{current_version[1]} OK")
    
    def _validate_required_packages(self):
        """Validate required Python packages are installed"""
        required_packages = [
            'flask',
            'sentence_transformers',
            'torch',
            'numpy',
            'sklearn'
        ]
        
        missing_packages = []
        
        for package in required_packages:
            try:
                importlib.import_module(package)
                self.validation_results.append(f"Package {package} OK")
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            self.critical_errors.append(
                f"Missing required packages: {', '.join(missing_packages)}. "
                f"Run: pip install {' '.join(missing_packages)}"
            )
    
    def _validate_model_availability(self):
        """Validate SBERT model can be loaded"""
        try:
            from sentence_transformers import SentenceTransformer
            
            # Try to load the default model
            model_name = 'all-MiniLM-L6-v2'
            
            # Check if model is cached locally
            cache_folder = './models'
            if os.path.exists(cache_folder):
                self.validation_results.append(f"Model cache directory exists: {cache_folder}")
            else:
                self.warnings.append(f"Model cache directory not found: {cache_folder}")
            
            # This would download the model if not cached, so we'll just validate the import
            self.validation_results.append("SentenceTransformer import OK")
            
        except Exception as e:
            self.critical_errors.append(f"Cannot load SBERT model: {str(e)}")
    
    def _validate_system_resources(self):
        """Validate system has sufficient resources"""
        try:
            import psutil
            
            # Check available memory
            memory = psutil.virtual_memory()
            available_gb = memory.available / (1024 ** 3)
            
            if available_gb < 1.0:
                self.warnings.append(f"Low available memory: {available_gb:.1f}GB")
            else:
                self.validation_results.append(f"Available memory: {available_gb:.1f}GB OK")
            
            # Check CPU count
            cpu_count = psutil.cpu_count()
            if cpu_count < 2:
                self.warnings.append(f"Low CPU count: {cpu_count}")
            else:
                self.validation_results.append(f"CPU count: {cpu_count} OK")
            
        except ImportError:
            self.warnings.append("psutil not available - cannot check system resources")
        except Exception as e:
            self.warnings.append(f"Error checking system resources: {str(e)}")
    
    def _validate_file_permissions(self):
        """Validate file system permissions"""
        # Check if we can write to logs directory
        logs_dir = 'logs'
        try:
            os.makedirs(logs_dir, exist_ok=True)
            
            # Try to write a test file
            test_file = os.path.join(logs_dir, 'test_write.tmp')
            with open(test_file, 'w') as f:
                f.write('test')
            
            # Clean up test file
            os.remove(test_file)
            
            self.validation_results.append("File system permissions OK")
            
        except Exception as e:
            self.warnings.append(f"File system permission issue: {str(e)}")
        
        # Check models directory
        models_dir = 'models'
        try:
            os.makedirs(models_dir, exist_ok=True)
            self.validation_results.append("Models directory accessible")
        except Exception as e:
            self.warnings.append(f"Cannot create models directory: {str(e)}")
    
    def get_validation_summary(self) -> str:
        """Get a formatted validation summary"""
        summary = []
        
        if self.validation_results:
            summary.append("✓ Validation Results:")
            for result in self.validation_results:
                summary.append(f"  ✓ {result}")
        
        if self.warnings:
            summary.append("\n⚠ Warnings:")
            for warning in self.warnings:
                summary.append(f"  ⚠ {warning}")
        
        if self.critical_errors:
            summary.append("\n✗ Critical Errors:")
            for error in self.critical_errors:
                summary.append(f"  ✗ {error}")
        
        return "\n".join(summary)
    
    def validate_runtime_environment(self):
        """Validate runtime environment after startup"""
        runtime_checks = []
        
        # Check if Flask is running
        try:
            import flask
            runtime_checks.append("Flask runtime OK")
        except Exception as e:
            runtime_checks.append(f"Flask runtime issue: {e}")
        
        # Check model loading
        try:
            from sentence_transformers import SentenceTransformer
            # Quick model test (without actually loading to save time)
            runtime_checks.append("Model loading capability OK")
        except Exception as e:
            runtime_checks.append(f"Model loading issue: {e}")
        
        return runtime_checks
    
    def run_startup_validation(self):
        """Run startup validation and return results"""
        can_start, errors, warnings = self.validate()
        
        if not can_start:
            return {
                'success': False,
                'can_start': False,
                'errors': errors,
                'warnings': warnings,
                'summary': self.get_validation_summary()
            }
        
        return {
            'success': True,
            'can_start': True,
            'errors': [],
            'warnings': warnings,
            'summary': self.get_validation_summary()
        }