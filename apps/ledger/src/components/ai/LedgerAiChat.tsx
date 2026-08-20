'use client';

import React, { useState, useTransition } from 'react';
import { submitAiCommand } from '../../actions/ai-actions';
import { ToolResult } from '../../ai-core/shared/types';

interface LedgerAiChatProps {
  conversationId: string;
}

export function LedgerAiChat({ conversationId }: LedgerAiChatProps) {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ToolResult<any> | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    startTransition(async () => {
      // Clear previous result
      setResult(null);
      
      // Call the Server Action
      const response = await submitAiCommand(message, conversationId);
      
      // Update state with the result
      setResult(response);
      
      // Clear input on success (optional, based on UX preference)
      if (response.success) {
        setMessage('');
      }
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 p-4 border rounded-xl bg-white shadow-sm">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Ledger AI Assistant</h3>
        <p className="text-sm text-gray-500">
          Mükellef sayısı, bakiye sorma ve bildirim gönderme işlemlerini deneyin.
        </p>
      </div>

      {/* Output Area */}
      {result && (
        <div 
          className={`p-4 rounded-lg text-sm ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
        >
          {result.success ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-green-800">Success</span>
              <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto mt-2">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-red-800">Error</span>
              <span>{result.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Örn: Yılmaz inşaat'ın borcu ne?"
          disabled={isPending}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'İşleniyor...' : 'Gönder'}
        </button>
      </form>
    </div>
  );
}
