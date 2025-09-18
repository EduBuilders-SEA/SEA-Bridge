'use client';

import { seaLionOllama } from '@/lib/ollama/sea-lion-client';
import { useState } from 'react';

export function TranslationTest() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    const tests = [
      { text: 'hello world', target: 'Vietnamese' },
      { text: 'this is bad', target: 'Thai' },
      { text: 'good morning teacher', target: 'Malay' },
      { text: 'see you tomorrow', target: 'Indonesian' }
    ];

    const newResults: string[] = [];
    
    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await seaLionOllama.translateMessage(test.text, test.target);
        const duration = Date.now() - startTime;
        
        const resultText = `✅ "${test.text}" → ${test.target}: "${result}" (${duration}ms)`;
        newResults.push(resultText);
        setResults([...newResults]);
        
        console.log(resultText);
      } catch (error) {
        const errorText = `❌ "${test.text}" → ${test.target}: FAILED`;
        newResults.push(errorText);
        setResults([...newResults]);
        console.error(errorText, error);
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl">
      <h2 className="text-xl font-bold mb-4">🧪 SEA-LION Translation Test</h2>
      
      <button
        onClick={runTest}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4 disabled:opacity-50"
      >
        {isLoading ? '🔄 Testing...' : '🚀 Run Clean Translation Test'}
      </button>
      
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded font-mono text-sm ${
              result.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {result}
          </div>
        ))}
      </div>
      
      {results.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Expected Results:</strong> Clean, concise translations without meta-commentary like 
            "I can help you translate..." or "The translation is...". Just pure translations!
          </p>
        </div>
      )}
    </div>
  );
}