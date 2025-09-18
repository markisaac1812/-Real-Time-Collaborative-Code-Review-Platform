export const analyzeCode = (code, language) => {
    const analysis = {
      lineCount: 0,
      characterCount: 0,
      complexity: 1,
      estimatedReviewTime: 5, // minutes
      issues: [],
      suggestions: []
    };
  
    if (!code) return analysis;
  
    // Basic metrics
    analysis.characterCount = code.length;
    analysis.lineCount = code.split('\n').length;
    
    // Calculate complexity
    analysis.complexity = calculateCodeComplexity(code, language);
    
    // Estimate review time (rough calculation)
    analysis.estimatedReviewTime = Math.max(
      Math.ceil(analysis.lineCount / 10), // 10 lines per minute base
      5 // minimum 5 minutes
    );
  
    // Language-specific analysis
    switch (language) {
      case 'javascript':
        analysis.issues.push(...analyzeJavaScript(code));
        break;
      case 'python':
        analysis.issues.push(...analyzePython(code));
        break;
      default:
        analysis.issues.push(...analyzeGeneric(code));
    }
  
    return analysis;
  };
  
  const analyzeJavaScript = (code) => {
    const issues = [];
    
    // Check for console.log (should be removed in production)
    if (code.includes('console.log')) {
      issues.push({
        type: 'warning',
        message: 'Console.log statements found - consider removing for production',
        line: null
      });
    }
  
    // Check for var usage (prefer let/const)
    if (code.match(/\bvar\s+\w+/)) {
      issues.push({
        type: 'info',
        message: 'Consider using let/const instead of var',
        line: null
      });
    }
  
    // Check for function complexity
    const functionMatches = code.match(/function\s+\w+[\s\S]*?(?=\n\s*function|\n\s*const|\n\s*let|\n\s*var|$)/g);
    if (functionMatches) {
      functionMatches.forEach((func, index) => {
        const lines = func.split('\n').length;
        if (lines > 50) {
          issues.push({
            type: 'warning',
            message: `Function ${index + 1} is quite long (${lines} lines) - consider breaking it down`,
            line: null
          });
        }
      });
    }
  
    return issues;
  };
  
  const analyzePython = (code) => {
    const issues = [];
    
    // Check for print statements
    if (code.includes('print(')) {
      issues.push({
        type: 'info',
        message: 'Print statements found - consider using logging for production code',
        line: null
      });
    }
  
    // Check for global variables
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (line.match(/^[A-Z_][A-Z0-9_]*\s*=/) && !line.includes('def ') && !line.includes('class ')) {
        issues.push({
          type: 'info',
          message: 'Global variable detected - consider encapsulating in a class or function',
          line: index + 1
        });
      }
    });
  
    return issues;
  };
  
  const analyzeGeneric = (code) => {
    const issues = [];
    
    // Check for very long lines
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 120) {
        issues.push({
          type: 'info',
          message: 'Line exceeds 120 characters - consider breaking it down',
          line: index + 1
        });
      }
    });
  
    // Check for TODO/FIXME comments
    if (code.match(/TODO|FIXME|XXX/i)) {
      issues.push({
        type: 'info',
        message: 'TODO/FIXME comments found - don\'t forget to address them',
        line: null
      });
    }
  
    return issues;
  };