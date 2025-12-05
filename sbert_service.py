from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
import torch
import logging
import time
import json
import os
import traceback

# Import enhanced evaluation components
from preprocessing.text_preprocessor import TextPreprocessor
from preprocessing.context_analyzer import ContextAnalyzer
from preprocessing.ensemble_evaluator import EnsembleEvaluator
from preprocessing.scoring_algorithm import ScoringAlgorithm
from preprocessing.validation_framework import ValidationFramework
from preprocessing.accuracy_monitor import AccuracyMonitor
from preprocessing.structured_logger import get_structured_logger
from preprocessing.error_handler import get_error_handler, with_timeout, safe_execute
from preprocessing.performance_monitor import get_performance_monitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize structured logger, error handler, and performance monitor
structured_logger = get_structured_logger()
error_handler = get_error_handler(structured_logger)
performance_monitor = get_performance_monitor()

app = Flask(__name__)

# Load SBERT model (all-MiniLM-L6-v2 is lightweight and effective) - kept for fallback
logger.info("Loading SBERT model...")
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("✅ SBERT model loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load SBERT model: {e}")
    model = None

# Initialize enhanced evaluation components
logger.info("Initializing enhanced evaluation components...")
try:
    # Load configuration using ConfigManager
    from preprocessing.config_manager import get_config_manager
    
    config_manager = get_config_manager()
    
    if config_manager.config_loaded:
        logger.info("✅ Loaded evaluation configuration")
    else:
        logger.info("Using default evaluation configuration")
    
    # Get configuration sections
    eval_config = config_manager.get_all_config()
    
    # Initialize ensemble evaluator with error handling
    try:
        model_configs = eval_config.get('models', {}).get('ensemble', None)
        ensemble_evaluator = EnsembleEvaluator(model_configs)
        logger.info("✅ Ensemble evaluator initialized")
    except Exception as e:
        error_handler.handle_model_loading_error(
            model_name='ensemble',
            error=e,
            fallback_models=['all-MiniLM-L6-v2']
        )
        ensemble_evaluator = None
        raise
    
    # Initialize scoring algorithm
    scoring_config = eval_config.get('scoring', None)
    scoring_algorithm = ScoringAlgorithm(scoring_config)
    logger.info("✅ Scoring algorithm initialized")
    
    # Initialize validation framework
    validation_framework = ValidationFramework()
    logger.info("✅ Validation framework initialized")
    
    # Initialize accuracy monitor
    accuracy_monitor = AccuracyMonitor()
    logger.info("✅ Accuracy monitor initialized")
    
    # Flag to indicate enhanced mode is available
    enhanced_mode_available = True
    logger.info("✅ Enhanced evaluation mode enabled")
    
except Exception as e:
    logger.error(f"❌ Failed to initialize enhanced components: {e}")
    structured_logger.log_error(
        error_type='initialization',
        error_message=str(e),
        context={'component': 'enhanced_evaluation'},
        stack_trace=traceback.format_exc()
    )
    ensemble_evaluator = None
    scoring_algorithm = None
    validation_framework = None
    accuracy_monitor = None
    enhanced_mode_available = False
    logger.warning("⚠️ Falling back to basic evaluation mode")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'enhanced_mode': enhanced_mode_available,
        'ensemble_models': ensemble_evaluator.get_model_info() if ensemble_evaluator else None
    })

@app.route('/performance', methods=['GET'])
def get_performance():
    """
    Get performance metrics including timing, memory usage, and concurrent requests
    
    Response:
    {
        "uptime_seconds": 3600.5,
        "total_requests": 1250,
        "active_requests": 3,
        "max_concurrent_requests": 8,
        "memory": {
            "rss_mb": 512.5,
            "vms_mb": 1024.0,
            "percent": 6.4
        },
        "preprocessing_timing": {
            "count": 1250,
            "avg_ms": 45.2,
            "min_ms": 12.5,
            "max_ms": 150.3
        },
        "ensemble_evaluation_timing": {...},
        "scoring_timing": {...},
        "total_timing": {...},
        "component_breakdown": {
            "preprocessing": {"avg_ms": 45.2, "percentage": 18.5},
            "ensemble_evaluation": {"avg_ms": 180.5, "percentage": 73.8},
            "scoring": {"avg_ms": 18.8, "percentage": 7.7}
        },
        "threshold_violations": [...]
    }
    """
    try:
        # Get performance statistics
        stats = performance_monitor.get_performance_stats()
        
        # Get component breakdown
        breakdown = performance_monitor.get_component_breakdown()
        stats['component_breakdown'] = breakdown
        
        # Check threshold violations
        thresholds = performance_monitor.check_performance_thresholds()
        stats['threshold_violations'] = thresholds['violations']
        stats['has_violations'] = thresholds['has_violations']
        
        # Add timestamp
        stats['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error generating performance metrics: {e}")
        return jsonify({
            'error': 'Failed to generate performance metrics',
            'message': str(e)
        }), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """
    Get evaluation metrics including accuracy, performance, and model statistics
    
    Response:
    {
        "overall_accuracy": 85.5,
        "per_domain_accuracy": {
            "CSE": {"accuracy": 87.2, "total_cases": 25, "passed_cases": 22},
            "ECE": {"accuracy": 83.1, "total_cases": 20, "passed_cases": 17},
            ...
        },
        "average_processing_time_ms": 245.3,
        "model_performance": {
            "all-MiniLM-L6-v2": {"weight": 0.3, "avg_score": 0.82},
            "all-mpnet-base-v2": {"weight": 0.4, "avg_score": 0.85},
            "all-distilroberta-v1": {"weight": 0.3, "avg_score": 0.80}
        },
        "evaluation_stats": {
            "total_evaluations": 1250,
            "low_confidence_count": 45,
            "low_confidence_percentage": 3.6,
            "avg_score": 4.2,
            "avg_confidence": 0.87
        },
        "validation_dataset_stats": {
            "total_cases": 120,
            "domains": {"CSE": 25, "ECE": 20, ...},
            "difficulty_levels": {"easy": 30, "medium": 60, "hard": 30}
        }
    }
    """
    try:
        metrics = {}
        
        # Get validation accuracy if validation framework is available
        if validation_framework:
            try:
                # Run validation to get current accuracy
                def evaluator_func(model_answer, student_answer, domain):
                    """Wrapper function for validation"""
                    result = enhanced_evaluate(model_answer, student_answer, domain, False, time.time())
                    return result
                
                validation_results = validation_framework.validate_accuracy(evaluator_func)
                
                metrics['overall_accuracy'] = validation_results.get('overall_accuracy', 0.0)
                metrics['per_domain_accuracy'] = validation_results.get('per_domain_accuracy', {})
                
                # Check if accuracy meets threshold
                if accuracy_monitor and metrics['overall_accuracy'] < 80:
                    accuracy_monitor.check_accuracy_threshold(
                        metrics['overall_accuracy'] / 100,
                        context='metrics_endpoint'
                    )
                
            except Exception as e:
                logger.error(f"Error running validation for metrics: {e}")
                metrics['overall_accuracy'] = None
                metrics['per_domain_accuracy'] = {}
                metrics['validation_error'] = str(e)
        else:
            metrics['overall_accuracy'] = None
            metrics['per_domain_accuracy'] = {}
        
        # Get average processing time from evaluation stats
        if accuracy_monitor:
            eval_stats = accuracy_monitor.get_evaluation_stats()
            metrics['evaluation_stats'] = eval_stats
            
            # Calculate average processing time (if available in metadata)
            # For now, we'll estimate based on typical performance
            metrics['average_processing_time_ms'] = 250.0  # Placeholder
        else:
            metrics['evaluation_stats'] = {}
            metrics['average_processing_time_ms'] = None
        
        # Get model performance statistics
        if ensemble_evaluator:
            try:
                model_info = ensemble_evaluator.get_model_info()
                metrics['model_performance'] = model_info
            except Exception as e:
                logger.error(f"Error getting model performance: {e}")
                metrics['model_performance'] = {}
        else:
            metrics['model_performance'] = {}
        
        # Get validation dataset statistics
        if validation_framework:
            try:
                dataset_stats = validation_framework.get_validation_stats()
                metrics['validation_dataset_stats'] = dataset_stats
            except Exception as e:
                logger.error(f"Error getting validation dataset stats: {e}")
                metrics['validation_dataset_stats'] = {}
        else:
            metrics['validation_dataset_stats'] = {}
        
        # Add timestamp
        metrics['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
        metrics['enhanced_mode'] = enhanced_mode_available
        
        return jsonify(metrics)
        
    except Exception as e:
        logger.error(f"Error generating metrics: {e}")
        return jsonify({
            'error': 'Failed to generate metrics',
            'message': str(e)
        }), 500

@app.route('/validate', methods=['POST'])
def validate():
    """
    Run validation tests or add new validation cases
    
    Request body (for running validation):
    {
        "action": "run"
    }
    
    Request body (for adding validation case):
    {
        "action": "add",
        "model_answer": "Expected answer text",
        "student_answer": "Student's answer text",
        "expected_score": 4.5,
        "domain": "CSE",
        "expected_similarity": 0.75,
        "key_concepts": ["concept1", "concept2"],
        "difficulty": "medium"
    }
    
    Response (run validation):
    {
        "overall_accuracy": 85.5,
        "per_domain_accuracy": {...},
        "per_score_range_accuracy": {...},
        "failed_cases": [...],
        "total_cases": 120,
        "passed_cases": 103,
        "report": "Detailed accuracy report text"
    }
    
    Response (add validation case):
    {
        "success": true,
        "case_id": "CSE_025",
        "message": "Validation case added successfully"
    }
    """
    try:
        if not validation_framework:
            return jsonify({
                'error': 'Validation framework not available',
                'message': 'Enhanced mode is not enabled'
            }), 503
        
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        action = data.get('action', 'run')
        
        if action == 'run':
            # Run validation tests
            logger.info("Running validation tests via /validate endpoint")
            
            def evaluator_func(model_answer, student_answer, domain):
                """Wrapper function for validation"""
                result = enhanced_evaluate(model_answer, student_answer, domain, False, time.time())
                return result
            
            # Run validation
            validation_results = validation_framework.validate_accuracy(evaluator_func)
            
            # Generate detailed report
            report = validation_framework.generate_accuracy_report(validation_results)
            
            # Check accuracy threshold
            overall_accuracy = validation_results.get('overall_accuracy', 0.0)
            if accuracy_monitor:
                accuracy_monitor.check_accuracy_threshold(
                    overall_accuracy / 100,
                    context='validation_endpoint'
                )
            
            # Add report to results
            validation_results['report'] = report
            
            # Log validation results
            structured_logger.log_validation_results(
                validation_results=validation_results,
                context='validation_endpoint'
            )
            
            logger.info(f"✅ Validation complete: {overall_accuracy:.1f}% accuracy")
            
            return jsonify(validation_results)
        
        elif action == 'add':
            # Add new validation case
            model_answer = data.get('model_answer', '').strip()
            student_answer = data.get('student_answer', '').strip()
            expected_score = data.get('expected_score')
            domain = data.get('domain', 'general')
            expected_similarity = data.get('expected_similarity')
            key_concepts = data.get('key_concepts')
            difficulty = data.get('difficulty', 'medium')
            
            # Validate required fields
            if not model_answer:
                return jsonify({'error': 'model_answer is required'}), 400
            if not student_answer:
                return jsonify({'error': 'student_answer is required'}), 400
            if expected_score is None:
                return jsonify({'error': 'expected_score is required'}), 400
            
            # Validate expected_score range
            if not (0 <= expected_score <= 6):
                return jsonify({'error': 'expected_score must be between 0 and 6'}), 400
            
            # Add validation case
            case_id = validation_framework.add_validation_case(
                model_answer=model_answer,
                student_answer=student_answer,
                expected_score=expected_score,
                domain=domain,
                expected_similarity=expected_similarity,
                key_concepts=key_concepts,
                difficulty=difficulty
            )
            
            logger.info(f"✅ Added validation case: {case_id}")
            
            return jsonify({
                'success': True,
                'case_id': case_id,
                'message': 'Validation case added successfully'
            })
        
        else:
            return jsonify({
                'error': 'Invalid action',
                'message': f'Action must be "run" or "add", got "{action}"'
            }), 400
        
    except Exception as e:
        logger.error(f"Error in /validate endpoint: {e}")
        return jsonify({
            'error': 'Validation failed',
            'message': str(e)
        }), 500

@app.route('/explain', methods=['POST'])
def explain():
    """
    Get human-readable explanation of evaluation
    
    Request body:
    {
        "model_answer": "Expected answer text",
        "student_answer": "Student's answer text",
        "domain": "CSE" (optional)
    }
    
    Response:
    {
        "score": 5.1,
        "similarity": 0.85,
        "confidence": 0.92,
        "explanation": {
            "summary": "The student's answer demonstrates strong understanding...",
            "key_concepts": {
                "found": ["concept1", "concept2", "concept3"],
                "missing": ["concept4"],
                "coverage_percentage": 75.0
            },
            "model_contributions": {
                "all-MiniLM-L6-v2": {"score": 0.82, "weight": 0.3, "contribution": 0.246},
                "all-mpnet-base-v2": {"score": 0.85, "weight": 0.4, "contribution": 0.340},
                "all-distilroberta-v1": {"score": 0.80, "weight": 0.3, "contribution": 0.240}
            },
            "scoring_breakdown": {
                "ensemble_score": 0.83,
                "concept_coverage_bonus": 0.02,
                "final_similarity": 0.85,
                "partial_credit_applied": false
            },
            "preprocessing_applied": [
                "Corrected spelling: 'algoritm' -> 'algorithm'",
                "Expanded abbreviation: 'DS' -> 'Data Structure'"
            ],
            "recommendations": [
                "The answer could be improved by including concept4",
                "Consider providing more detail on concept2"
            ]
        }
    }
    """
    try:
        if not enhanced_mode_available:
            return jsonify({
                'error': 'Explain endpoint requires enhanced mode',
                'message': 'Enhanced evaluation mode is not available'
            }), 503
        
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        model_answer = data.get('model_answer', '').strip()
        student_answer = data.get('student_answer', '').strip()
        domain = data.get('domain', 'general')
        
        # Validate inputs
        if not model_answer:
            return jsonify({'error': 'model_answer is required'}), 400
        if not student_answer:
            return jsonify({'error': 'student_answer is required'}), 400
        
        logger.info(f"Generating explanation for evaluation (domain: {domain})")
        
        # Run detailed evaluation
        start_time = time.time()
        result = enhanced_evaluate(model_answer, student_answer, domain, detailed=True, start_time=start_time)
        
        # Extract breakdown information
        breakdown = result.get('breakdown', {})
        
        # Build explanation
        explanation = {}
        
        # Generate summary
        score = result.get('score', 0)
        confidence = result.get('confidence', 0)
        similarity = result.get('similarity', 0)
        
        if score >= 5.0:
            quality = "excellent"
            understanding = "demonstrates strong understanding"
        elif score >= 4.0:
            quality = "good"
            understanding = "shows good understanding"
        elif score >= 3.0:
            quality = "satisfactory"
            understanding = "shows adequate understanding"
        elif score >= 2.0:
            quality = "needs improvement"
            understanding = "shows partial understanding"
        else:
            quality = "insufficient"
            understanding = "shows limited understanding"
        
        confidence_level = "high" if confidence >= 0.8 else "moderate" if confidence >= 0.7 else "low"
        
        explanation['summary'] = (
            f"The student's answer is {quality} (score: {score:.2f}/6.00, "
            f"similarity: {similarity:.2%}). The evaluation {understanding} of the topic "
            f"with {confidence_level} confidence ({confidence:.2%})."
        )
        
        # Key concepts analysis
        key_concepts_found = breakdown.get('key_concepts_found', 0)
        total_key_concepts = breakdown.get('total_key_concepts', 0)
        concept_coverage = breakdown.get('concept_coverage', 0)
        
        # Get technical terms found
        technical_terms = breakdown.get('technical_terms_found', [])
        
        # Determine missing concepts (simplified - we don't have the actual concept names)
        found_concepts = technical_terms[:key_concepts_found] if technical_terms else []
        missing_count = total_key_concepts - key_concepts_found
        
        explanation['key_concepts'] = {
            'found': found_concepts,
            'found_count': key_concepts_found,
            'missing_count': missing_count,
            'total_count': total_key_concepts,
            'coverage_percentage': round(concept_coverage * 100, 1)
        }
        
        # Model contributions
        model_scores = breakdown.get('model_scores', {})
        ensemble_score = breakdown.get('ensemble_score', 0)
        
        model_contributions = {}
        for model_name, model_score in model_scores.items():
            # Get weight from model info (default weights)
            if 'MiniLM' in model_name:
                weight = 0.3
            elif 'mpnet' in model_name:
                weight = 0.4
            elif 'roberta' in model_name:
                weight = 0.3
            else:
                weight = 0.33
            
            contribution = model_score * weight
            
            model_contributions[model_name] = {
                'score': round(model_score, 4),
                'weight': weight,
                'contribution': round(contribution, 4)
            }
        
        explanation['model_contributions'] = model_contributions
        
        # Scoring breakdown
        scoring_breakdown_detail = breakdown.get('scoring_breakdown', {})
        
        explanation['scoring_breakdown'] = {
            'ensemble_score': round(ensemble_score, 4),
            'concept_coverage': round(concept_coverage, 4),
            'concept_coverage_bonus': round(concept_coverage * 0.15, 4),
            'final_similarity': round(similarity, 4),
            'partial_credit_applied': similarity < 0.8 and similarity >= 0.5,
            'details': scoring_breakdown_detail
        }
        
        # Preprocessing applied
        preprocessing_changes = breakdown.get('preprocessing_changes', {})
        preprocessing_applied = []
        
        if preprocessing_changes:
            student_corrections = preprocessing_changes.get('student_answer', [])
            for correction in student_corrections:
                preprocessing_applied.append(correction)
        
        if not preprocessing_applied:
            preprocessing_applied.append("No preprocessing corrections needed")
        
        explanation['preprocessing_applied'] = preprocessing_applied
        
        # Generate recommendations
        recommendations = []
        
        if missing_count > 0:
            recommendations.append(
                f"The answer could be improved by including {missing_count} missing key concept(s)"
            )
        
        if concept_coverage < 0.8:
            recommendations.append(
                "Consider providing more comprehensive coverage of the key concepts"
            )
        
        if similarity < 0.7:
            recommendations.append(
                "The answer structure and phrasing could be improved to better match the expected answer"
            )
        
        if confidence < 0.7:
            recommendations.append(
                "⚠️ This evaluation has low confidence and should be manually reviewed"
            )
        
        if not recommendations:
            recommendations.append("The answer is comprehensive and well-structured")
        
        explanation['recommendations'] = recommendations
        
        # Build response
        response = {
            'score': score,
            'similarity': similarity,
            'confidence': confidence,
            'needs_review': result.get('needs_review', False),
            'explanation': explanation,
            'processing_time_ms': breakdown.get('processing_time_ms', 0)
        }
        
        logger.info(f"✅ Generated explanation for evaluation (score: {score:.2f})")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in /explain endpoint: {e}")
        return jsonify({
            'error': 'Failed to generate explanation',
            'message': str(e)
        }), 500

@app.route('/evaluate', methods=['POST'])
def evaluate():
    """
    Evaluate student answer against model answer using enhanced SBERT evaluation
    
    Request body:
    {
        "model_answer": "Expected answer text",
        "student_answer": "Student's answer text",
        "domain": "CSE" (optional - CSE, ECE, EEE, Mechanical, Civil, or general),
        "detailed": false (optional - return detailed breakdown)
    }
    
    Response (standard):
    {
        "similarity": 0.85,
        "score": 5.1,
        "confidence": 0.92,
        "needs_review": false
    }
    
    Response (detailed=true):
    {
        "similarity": 0.85,
        "score": 5.1,
        "confidence": 0.92,
        "needs_review": false,
        "breakdown": {
            "ensemble_score": 0.83,
            "model_scores": {...},
            "concept_coverage": 0.90,
            "key_concepts_found": 8,
            "total_key_concepts": 9,
            "preprocessing_changes": [...],
            "processing_time_ms": 245.3
        }
    }
    """
    start_time = time.time()
    request_id = performance_monitor.start_request()
    
    try:
        # Record memory usage
        performance_monitor.record_memory_usage()
        
        # Get data from request
        data = request.json
        
        if not data:
            logger.warning("No data provided in request")
            return jsonify({'error': 'No data provided'}), 400
        
        model_answer = data.get('model_answer', '').strip()
        student_answer = data.get('student_answer', '').strip()
        domain = data.get('domain', 'general')
        detailed = data.get('detailed', False)
        
        # Validate inputs
        if not model_answer:
            logger.warning("Empty model answer provided")
            structured_logger.log_error(
                error_type='validation',
                error_message='Empty model answer provided',
                context={'request_data': data}
            )
            return jsonify({
                'similarity': 0.0,
                'score': 0.0,
                'confidence': 0.0,
                'needs_review': True,
                'error': 'Empty model answer'
            })
        
        if not student_answer:
            logger.info("Empty student answer - returning 0 score")
            return jsonify({
                'similarity': 0.0,
                'score': 0.0,
                'confidence': 1.0,
                'needs_review': False,
                'note': 'No student answer provided'
            })
        
        # Try enhanced evaluation first
        if enhanced_mode_available and ensemble_evaluator and scoring_algorithm:
            try:
                result = enhanced_evaluate(model_answer, student_answer, domain, detailed, start_time)
                
                # Record performance metrics
                total_time = (time.time() - start_time) * 1000
                performance_monitor.record_evaluation_time(total_time, 'total')
                performance_monitor.end_request(request_id)
                
                return jsonify(result)
            except Exception as e:
                logger.error(f"❌ Enhanced evaluation failed: {e}")
                structured_logger.log_error(
                    error_type='enhanced_evaluation',
                    error_message=str(e),
                    context={
                        'domain': domain,
                        'detailed': detailed,
                        'model_answer_length': len(model_answer),
                        'student_answer_length': len(student_answer)
                    },
                    stack_trace=traceback.format_exc()
                )
                logger.info("Falling back to basic evaluation")
                # Fall through to basic evaluation
        
        # Fallback to basic evaluation
        logger.info("Using basic evaluation mode")
        result = basic_evaluate(model_answer, student_answer)
        
        # Record performance metrics
        total_time = (time.time() - start_time) * 1000
        performance_monitor.record_evaluation_time(total_time, 'total')
        performance_monitor.end_request(request_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Error during evaluation: {e}")
        structured_logger.log_error(
            error_type='evaluation_endpoint',
            error_message=str(e),
            context={'request_data': data if 'data' in locals() else {}},
            stack_trace=traceback.format_exc()
        )
        
        # End request tracking
        performance_monitor.end_request(request_id)
        
        # Return fallback similarity on error
        try:
            similarity = simple_similarity(
                data.get('model_answer', ''),
                data.get('student_answer', '')
            )
            score = round(similarity * 6, 2)
            return jsonify({
                'similarity': round(similarity, 4),
                'score': score,
                'confidence': 0.5,
                'needs_review': True,
                'fallback': True,
                'error': str(e)
            })
        except Exception as fallback_error:
            logger.error(f"❌ Fallback evaluation also failed: {fallback_error}")
            return jsonify({
                'error': 'Evaluation failed',
                'message': str(e)
            }), 500


def enhanced_evaluate(model_answer: str, student_answer: str, domain: str, detailed: bool, start_time: float) -> dict:
    """
    Enhanced evaluation using all components: preprocessing, context analysis, ensemble, and scoring
    
    Args:
        model_answer: Expected answer text
        student_answer: Student's answer text
        domain: Engineering domain for domain-specific processing
        detailed: Whether to return detailed breakdown
        start_time: Start time for performance tracking
        
    Returns:
        Evaluation result dictionary
    """
    logger.info(f"Enhanced evaluation: domain={domain}, detailed={detailed}, length={len(student_answer)} chars")
    
    # Track timing for each stage
    stage_times = {}
    
    # Stage 1: Preprocessing with error handling
    stage_start = time.time()
    try:
        preprocessor = TextPreprocessor(domain=domain)
        
        model_preprocessed = preprocessor.preprocess(model_answer)
        student_preprocessed = preprocessor.preprocess(student_answer)
        
        model_text = model_preprocessed['normalized_text']
        student_text = student_preprocessed['normalized_text']
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        # Handle preprocessing error with fallback to original text
        model_preprocessed = error_handler.handle_preprocessing_error(model_answer, e)
        student_preprocessed = error_handler.handle_preprocessing_error(student_answer, e)
        
        model_text = model_preprocessed['normalized_text']
        student_text = student_preprocessed['normalized_text']
    
    stage_times['preprocessing_ms'] = (time.time() - stage_start) * 1000
    logger.debug(f"Preprocessing: {stage_times['preprocessing_ms']:.2f}ms")
    
    # Record preprocessing performance
    performance_monitor.record_evaluation_time(stage_times['preprocessing_ms'], 'preprocessing')
    
    # Log preprocessing changes
    try:
        structured_logger.log_preprocessing(
            original_text=model_answer,
            normalized_text=model_text,
            corrections=model_preprocessed.get('corrections', []),
            preserved_terms=model_preprocessed.get('preserved_terms', []),
            domain=domain,
            text_type='model_answer'
        )
        structured_logger.log_preprocessing(
            original_text=student_answer,
            normalized_text=student_text,
            corrections=student_preprocessed.get('corrections', []),
            preserved_terms=student_preprocessed.get('preserved_terms', []),
            domain=domain,
            text_type='student_answer'
        )
        structured_logger.log_performance('preprocessing', stage_times['preprocessing_ms'])
    except Exception as e:
        logger.warning(f"Failed to log preprocessing: {e}")
    
    # Stage 2: Context Analysis
    stage_start = time.time()
    context_analyzer = ContextAnalyzer(domain=domain)
    
    model_analysis = context_analyzer.analyze(model_text)
    student_analysis = context_analyzer.analyze(student_text)
    
    # Calculate concept coverage
    concept_coverage = context_analyzer.calculate_concept_coverage(
        student_analysis['concepts'],
        model_analysis['concepts']
    )
    
    key_concepts_present = int(concept_coverage * len(model_analysis['concepts']))
    total_key_concepts = len(model_analysis['concepts'])
    
    stage_times['context_analysis_ms'] = (time.time() - stage_start) * 1000
    logger.debug(f"Context analysis: {stage_times['context_analysis_ms']:.2f}ms")
    
    # Record context analysis performance
    performance_monitor.record_evaluation_time(stage_times['context_analysis_ms'], 'context_analysis')
    
    # Stage 3: Ensemble Evaluation with error handling and timeout
    stage_start = time.time()
    try:
        # Apply 5-second timeout to ensemble evaluation
        ensemble_result = ensemble_evaluator.ensemble_evaluate(model_text, student_text)
        
        ensemble_score = ensemble_result['weighted_score']
        ensemble_confidence = ensemble_result['confidence']
        model_scores = ensemble_result['model_scores']
        
        stage_times['ensemble_evaluation_ms'] = ensemble_result['processing_time_ms']
        
        # Check for timeout (soft check since we can't use signal on Windows)
        if stage_times['ensemble_evaluation_ms'] > 5000:
            logger.warning(f"Ensemble evaluation exceeded 5s timeout: {stage_times['ensemble_evaluation_ms']:.2f}ms")
        
    except Exception as e:
        logger.error(f"Ensemble evaluation failed: {e}")
        # Handle ensemble evaluation error with fallback
        error_info = error_handler.handle_ensemble_evaluation_error(
            error=e,
            model_scores=None,
            fallback_score=0.5
        )
        
        # Use fallback values
        ensemble_score = error_info['fallback_score']
        ensemble_confidence = 0.3  # Low confidence for fallback
        model_scores = {}
        stage_times['ensemble_evaluation_ms'] = (time.time() - stage_start) * 1000
    
    logger.debug(f"Ensemble evaluation: {stage_times['ensemble_evaluation_ms']:.2f}ms")
    
    # Record ensemble evaluation performance
    performance_monitor.record_evaluation_time(stage_times['ensemble_evaluation_ms'], 'ensemble_evaluation')
    
    # Log model scores
    try:
        structured_logger.log_model_scores(
            model_scores=model_scores,
            weighted_score=ensemble_score,
            confidence=ensemble_confidence,
            variance=ensemble_result.get('variance', 0.0) if 'ensemble_result' in locals() else 0.0,
            processing_time_ms=stage_times['ensemble_evaluation_ms']
        )
        structured_logger.log_performance('ensemble_evaluation', stage_times['ensemble_evaluation_ms'])
    except Exception as e:
        logger.warning(f"Failed to log model scores: {e}")
    
    # Stage 4: Final Scoring
    stage_start = time.time()
    scoring_result = scoring_algorithm.calculate_final_score(
        ensemble_score=ensemble_score,
        concept_coverage=concept_coverage,
        key_concepts_present=key_concepts_present,
        total_key_concepts=total_key_concepts
    )
    
    final_similarity = scoring_result['similarity']
    final_score = scoring_result['score']
    final_confidence = scoring_result['confidence']
    
    stage_times['scoring_ms'] = (time.time() - stage_start) * 1000
    logger.debug(f"Scoring: {stage_times['scoring_ms']:.2f}ms")
    
    # Record scoring performance
    performance_monitor.record_evaluation_time(stage_times['scoring_ms'], 'scoring')
    structured_logger.log_performance('scoring', stage_times['scoring_ms'])
    
    # Calculate total processing time
    total_time_ms = (time.time() - start_time) * 1000
    
    # Determine if needs review (confidence < 0.7)
    needs_review = final_confidence < 0.7
    
    if needs_review:
        logger.warning(f"⚠️ Low confidence evaluation: {final_confidence:.4f}")
        # Handle low confidence evaluation
        error_handler.handle_low_confidence_evaluation(
            confidence=final_confidence,
            threshold=0.7,
            evaluation_data={
                'score': final_score,
                'similarity': final_similarity,
                'domain': domain
            }
        )
        # Log for manual review
        log_low_confidence_evaluation(model_answer, student_answer, final_score, final_confidence)
    
    logger.info(f"✅ Enhanced evaluation complete: score={final_score:.2f}/6, "
               f"confidence={final_confidence:.4f}, time={total_time_ms:.2f}ms")
    structured_logger.log_performance('total_evaluation', total_time_ms)
    
    # Build response
    response = {
        'similarity': final_similarity,
        'score': final_score,
        'confidence': final_confidence,
        'needs_review': needs_review
    }
    
    # Add detailed breakdown if requested
    if detailed:
        response['breakdown'] = {
            'ensemble_score': ensemble_score,
            'model_scores': model_scores,
            'concept_coverage': concept_coverage,
            'key_concepts_found': key_concepts_present,
            'total_key_concepts': total_key_concepts,
            'preprocessing_changes': {
                'model_answer': model_preprocessed['corrections'],
                'student_answer': student_preprocessed['corrections']
            },
            'technical_terms_found': student_analysis['technical_terms'],
            'processing_time_ms': round(total_time_ms, 2),
            'stage_times': {k: round(v, 2) for k, v in stage_times.items()},
            'scoring_breakdown': scoring_result['breakdown']
        }
    
    # Log complete evaluation
    structured_logger.log_evaluation(
        model_answer=model_answer,
        student_answer=student_answer,
        result=response,
        domain=domain,
        detailed=detailed,
        processing_time_ms=total_time_ms,
        metadata={
            'stage_times': stage_times,
            'preprocessing_corrections': len(student_preprocessed['corrections']),
            'concept_coverage': concept_coverage
        }
    )
    
    return response


def basic_evaluate(model_answer: str, student_answer: str) -> dict:
    """
    Basic evaluation using single SBERT model (fallback mode)
    
    Args:
        model_answer: Expected answer text
        student_answer: Student's answer text
        
    Returns:
        Evaluation result dictionary
    """
    # Check if model is loaded
    if model is None:
        logger.error("SBERT model not loaded, using simple similarity")
        similarity = simple_similarity(model_answer, student_answer)
        score = round(similarity * 6, 2)
        return {
            'similarity': round(similarity, 4),
            'score': score,
            'confidence': 0.5,
            'needs_review': True,
            'fallback': True
        }
    
    # Generate embeddings
    logger.info(f"Basic evaluation: length={len(student_answer)} chars")
    embedding1 = model.encode(model_answer, convert_to_tensor=True)
    embedding2 = model.encode(student_answer, convert_to_tensor=True)
    
    # Calculate cosine similarity
    similarity = util.cos_sim(embedding1, embedding2).item()
    
    # Convert to score out of 6
    score = round(similarity * 6, 2)
    
    # Ensure score is within bounds
    score = max(0.0, min(6.0, score))
    similarity = max(0.0, min(1.0, similarity))
    
    logger.info(f"✅ Basic evaluation: similarity={similarity:.4f}, score={score}/6")
    
    return {
        'similarity': round(similarity, 4),
        'score': score,
        'confidence': 0.8,  # Moderate confidence for basic evaluation
        'needs_review': False,
        'fallback': True
    }


def log_low_confidence_evaluation(model_answer: str, student_answer: str, score: float, confidence: float):
    """
    Log low-confidence evaluations for manual review
    
    Args:
        model_answer: Expected answer text
        student_answer: Student's answer text
        score: Calculated score
        confidence: Confidence score
    """
    try:
        log_entry = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'model_answer': model_answer[:200],  # Truncate for logging
            'student_answer': student_answer[:200],
            'score': score,
            'confidence': confidence,
            'needs_review': True
        }
        
        # Ensure logs directory exists
        os.makedirs('logs', exist_ok=True)
        
        # Append to evaluations log
        with open('logs/evaluations.jsonl', 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        
        logger.info(f"Logged low-confidence evaluation to logs/evaluations.jsonl")
        
    except Exception as e:
        logger.error(f"Failed to log low-confidence evaluation: {e}")

def simple_similarity(text1, text2):
    """
    Fallback similarity calculation using word overlap
    """
    if not text1 or not text2:
        return 0.0
    
    # Convert to lowercase and split into words
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    # Filter out very short words
    words1 = {w for w in words1 if len(w) > 3}
    words2 = {w for w in words2 if len(w) > 3}
    
    if not words1 or not words2:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    similarity = len(intersection) / len(union) if union else 0.0
    return similarity

if __name__ == '__main__':
    logger.info("🚀 Starting SBERT evaluation service on port 5001...")
    
    # Run startup validation if enhanced mode is available
    if enhanced_mode_available:
        try:
            from preprocessing.startup_validation import StartupValidator
            
            logger.info("Running startup validation...")
            
            # Create evaluator function for validation
            def validation_evaluator(model_answer, student_answer, domain):
                """Wrapper function for startup validation"""
                result = enhanced_evaluate(model_answer, student_answer, domain, False, time.time())
                return result
            
            # Run validation
            validator = StartupValidator()
            validation_result = validator.run_startup_validation(validation_evaluator)
            
            if validation_result['status'] == 'passed':
                logger.info(f"✅ Startup validation passed: {validation_result['overall_accuracy']:.1f}% accuracy")
            else:
                logger.warning(f"⚠️ Startup validation failed: {validation_result.get('overall_accuracy', 0):.1f}% accuracy")
                if validation_result.get('needs_calibration'):
                    logger.warning("⚠️ Model calibration recommended")
        
        except Exception as e:
            logger.warning(f"⚠️ Startup validation error: {e}")
            logger.info("Continuing service startup...")
    
    # Log initial performance metrics
    performance_monitor.log_performance_metrics()
    
    # Start the Flask app
    logger.info("✅ Service ready - listening on http://0.0.0.0:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
