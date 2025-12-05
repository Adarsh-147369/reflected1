class ContextAnalyzer:
    def __init__(self, domain=None):
        self.domain = domain or 'general'
        self.technical_keywords = {
            'CSE': ['algorithm', 'code', 'function', 'variable', 'loop', 'array', 'database', 'network', 'software', 'programming'],
            'ECE': ['circuit', 'signal', 'frequency', 'voltage', 'current', 'transistor', 'amplifier', 'digital', 'analog'],
            'EEE': ['power', 'motor', 'generator', 'transformer', 'electrical', 'energy', 'voltage', 'current'],
            'Mechanical': ['force', 'motion', 'energy', 'heat', 'machine', 'engine', 'thermodynamics', 'mechanics'],
            'Civil': ['structure', 'concrete', 'steel', 'building', 'construction', 'foundation', 'beam', 'load'],
            'programming': ['code', 'function', 'variable', 'algorithm', 'loop', 'array'],
            'mathematics': ['equation', 'formula', 'calculate', 'solve', 'theorem'],
            'science': ['experiment', 'hypothesis', 'theory', 'analysis', 'research']
        }
    
    def analyze(self, text):
        """Analyze text context and return metadata with concepts"""
        if not text:
            return {
                'context': 'general',
                'complexity': 'low',
                'domain': 'general',
                'concepts': [],
                'technical_terms': [],
                'word_count': 0,
                'technical_score': 0
            }
        
        text_lower = text.lower()
        words = text.split()
        
        # Determine domain
        domain_scores = {}
        found_terms = []
        
        for domain, keywords in self.technical_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += 1
                    found_terms.append(keyword)
            domain_scores[domain] = score
        
        detected_domain = max(domain_scores, key=domain_scores.get) if max(domain_scores.values()) > 0 else 'general'
        
        # Determine complexity based on text length and technical terms
        complexity = 'low'
        if len(words) > 50:
            complexity = 'medium'
        if len(words) > 100 or sum(domain_scores.values()) > 3:
            complexity = 'high'
        
        # Extract concepts (unique technical terms found)
        concepts = list(set(found_terms))
        
        return {
            'context': detected_domain,
            'complexity': complexity,
            'domain': detected_domain,
            'concepts': concepts,
            'technical_terms': found_terms,
            'word_count': len(words),
            'technical_score': sum(domain_scores.values())
        }
    
    def calculate_concept_coverage(self, student_concepts, model_concepts):
        """Calculate what percentage of model concepts are present in student answer"""
        if not model_concepts:
            return 1.0
        
        student_set = set(student_concepts)
        model_set = set(model_concepts)
        
        if not model_set:
            return 1.0
        
        matched = len(student_set.intersection(model_set))
        coverage = matched / len(model_set)
        
        return coverage
    
    def get_context_weight(self, context_info):
        """Get weight multiplier based on context"""
        complexity_weights = {
            'low': 1.0,
            'medium': 1.1,
            'high': 1.2
        }
        return complexity_weights.get(context_info.get('complexity', 'low'), 1.0)