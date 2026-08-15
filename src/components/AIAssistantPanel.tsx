/**
 * AI assistant panel component
 */

import { MessageCircle, Send } from 'lucide-react'

export function AIAssistantPanel(): JSX.Element {
  return (
    <aside className="hidden flex-col border-l border-slate-200 bg-white lg:flex lg:w-80">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-brand-100 p-2">
            <MessageCircle className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Assistant</h3>
            <p className="text-xs text-slate-500">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Chat area - placeholder */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="rounded-lg bg-slate-50 p-4 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">
            AI-powered editing assistance is coming soon
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Connect your AI service in settings to get started
          </p>
        </div>
      </div>

      {/* Input area - disabled */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Chat with AI..."
            disabled
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-400 placeholder-slate-400 focus:outline-none"
          />
          <button
            disabled
            className="rounded-lg bg-slate-300 p-2 text-slate-500"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
