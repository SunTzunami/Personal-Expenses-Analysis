
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, Loader2, Database, AlertCircle, RefreshCw } from 'lucide-react';
import { checkOllamaConnection, listModels, chatWithOllama } from '../utils/ollama';
import { TOOL_DEFINITIONS, executeTool } from '../utils/analysisTools';

export default function ChatInterface({ data, onClose, visible }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (visible) {
            initializeOllama();
        }
    }, [visible]);

    const initializeOllama = async () => {
        setIsLoading(true);
        const connected = await checkOllamaConnection();
        setIsConnected(connected);

        if (connected) {
            setConnectionError(null);
            const availableModels = await listModels();
            setModels(availableModels);
            if (availableModels.length > 0) {
                // Prefer llama3 or mistral if available, else first one
                const preferred = availableModels.find(m => m.includes('llama3') || m.includes('mistral')) || availableModels[0];
                setSelectedModel(preferred);
            }
        } else {
            setConnectionError("Could not connect to Ollama. Make sure it's running.");
        }
        setIsLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim() || !selectedModel) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // 1. Initial System Prompt with Tools
            const systemPrompt = `You are a professional financial data analyst. 
You are helping the user analyze their personal expenses.
${TOOL_DEFINITIONS}

CRITICAL: 
- If a question requires calculations or data lookups, you MUST use a tool.
- When calling a tool, your entire response must be ONLY the JSON object.
- Do not explain that you are calling a tool.
- If the user asks a general question, answer normally.`;

            const initialMessages = [
                { role: 'system', content: systemPrompt },
                ...messages,
                userMessage
            ];

            // 2. Chat with Ollama
            let response = await chatWithOllama(selectedModel, initialMessages, false);

            // 3. Check for Tool Call
            let assistantMessage = response;
            try {
                // Improved Heuristic to find JSON (handling markdown and chatter)
                const content = assistantMessage.content.trim();
                const jsonMatch = content.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    let toolCall;
                    try {
                        toolCall = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        // Try cleaning up if model was chatty around the JSON
                        const cleaned = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
                        toolCall = JSON.parse(cleaned);
                    }

                    if (toolCall.tool && toolCall.args) {
                        // It's a tool call!
                        setMessages(prev => [...prev, { role: 'assistant', content: "Analyzing data...", isToolCall: true }]);

                        // Execute Tool
                        const result = executeTool(toolCall.tool, toolCall.args, data);

                        // Send Result back to LLM
                        const toolOutputMessage = {
                            role: 'system',
                            content: `Tool '${toolCall.tool}' Output: ${JSON.stringify(result, null, 2)}. \n\nNow answer the user's question based on this data.`
                        };

                        const followUpMessages = [...initialMessages, assistantMessage, toolOutputMessage];

                        // Get final answer
                        response = await chatWithOllama(selectedModel, followUpMessages, true, (chunk) => {
                            // Optional: Handle streaming updates here if we want to show typing effect for final answer
                        });
                        assistantMessage = response;
                    }
                }
            } catch (e) {
                // Not a JSON or failed to parse, just treat as normal text
                console.log("No valid tool call found or parse error", e);
            }

            setMessages(prev => [...prev, { ...assistantMessage, role: 'assistant' }]);

        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}`, isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 glass-panel border-l border-white/10 z-50 flex flex-col shadow-2xl bg-slate-900/95 backdrop-blur-xl"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <Bot className="text-primary" />
                    <h2 className="font-semibold text-white">AI Assistant</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Connection / Model Status */}
            <div className="p-2 bg-slate-800/30 text-xs flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2 px-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-slate-400">{isConnected ? 'Ollama Online' : 'Offline'}</span>
                </div>

                {isConnected && (
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-300 outline-none focus:border-primary max-w-[150px]"
                    >
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {!isConnected && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 text-center p-4">
                        <AlertCircle size={32} className="text-red-400 mb-2" />
                        <p>{connectionError || "Local LLM service not sound."}</p>
                        <button onClick={initializeOllama} className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>
                )}

                {messages.length === 0 && isConnected && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                        <Bot size={48} className="opacity-20" />
                        <p className="text-sm">Ask questions about your expenses!</p>
                        <div className="grid grid-cols-1 gap-2 w-full">
                            {["Most expensive month?", "Total spent on Food?", "Compare last 2 years"].map(q => (
                                <button key={q} onClick={() => setInput(q)} className="text-xs p-2 bg-slate-800/50 rounded hover:bg-slate-700 text-left transition text-slate-400 hover:text-primary">
                                    "{q}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={i}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-500' : msg.isToolCall ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                            {msg.role === 'user' ? <User size={14} /> : msg.isToolCall ? <Database size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.isError ? 'bg-red-500/10 text-red-200 border border-red-500/20' :
                            msg.role === 'user' ? 'bg-indigo-600 text-white' :
                                msg.isToolCall ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20 italic' :
                                    'bg-slate-800 text-slate-200'
                            }`}>
                            {msg.content}
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                            <Bot size={14} />
                        </div>
                        <div className="bg-slate-800 p-3 rounded-2xl flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                            <span className="text-xs text-slate-400">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/50 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        disabled={!isConnected || isLoading}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none text-white placeholder-slate-500 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!isConnected || isLoading || !input.trim()}
                        className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
