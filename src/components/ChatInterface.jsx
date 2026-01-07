import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, Loader2, Database, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { checkOllamaConnection, listModels, chatWithOllama } from '../utils/ollama';
import { PYTHON_ANALYSIS_PROMPT, getPromptMetadata } from '../utils/analysisTools';
import { runPython, initPyodide } from '../utils/pythonRunner';
import Plotly from 'plotly.js-dist-min';

export default function ChatInterface({ data, onClose, visible, currency }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

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

    // Live Timer Effect
    useEffect(() => {
        let interval;
        if (isLoading) {
            const start = performance.now();
            interval = setInterval(() => {
                setElapsedTime(((performance.now() - start) / 1000).toFixed(1));
            }, 100);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    const initializeOllama = async () => {
        setIsLoading(true);
        try {
            const connected = await checkOllamaConnection();
            setIsConnected(connected);

            if (connected) {
                setConnectionError(null);
                const availableModels = await listModels();
                setModels(availableModels);
                if (availableModels.length > 0) {
                    const preferred = availableModels.find(m => m.includes('coder') || m.includes('llama3')) || availableModels[0];
                    setSelectedModel(preferred);
                }

                // Proactively init Pyodide
                try {
                    await initPyodide();
                } catch (e) {
                    console.error("Failed to init Pyodide:", e);
                }
            } else {
                setConnectionError("Could not connect to Ollama. Make sure it's running.");
            }
        } catch (error) {
            console.error("Chat initialization failed:", error);
            setIsConnected(false);
            setConnectionError("Initialization failed. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !selectedModel) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const startTime = performance.now();
            // 1. Gather Metadata
            const metadata = getPromptMetadata(data);
            const dateContext = data && data.length > 0
                ? `Date Range: ${new Date(Math.min(...data.map(d => new Date(d.Date)))).toISOString().split('T')[0]} to ${new Date(Math.max(...data.map(d => new Date(d.Date)))).toISOString().split('T')[0]}`
                : "";

            // Build column info with types
            const columnInfo = metadata.columns.map(col =>
                `${col}: ${metadata.columnTypes[col] || 'unknown'}`
            ).join(', ');

            // Build category mapping string
            const mappingStr = Object.entries(metadata.categoryMapping)
                .map(([orig, mapped]) => `${orig} → ${mapped}`)
                .join(', ');

            const metadataStr = `
COLUMNS: ${columnInfo}
${dateContext}

SPECIFIC CATEGORIES (search in Category column): ${metadata.uniqueCategories.join(', ')}
BROAD GROUPS (search in NewCategory column): ${metadata.uniqueNewCategories.join(', ')}

MAPPINGS (for context): ${mappingStr}
            `;

            // 2. Execute Analysis (Attempt Backend First)
            const analysisResult = await runPython(null, data, {
                prompt: currentInput,
                metadata: metadataStr,
                currency: currency,
                model: selectedModel
            });

            let { result, fig, code, backend } = analysisResult;

            if (!backend) {
                // Fallback Logic: Get Code from LLM First
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Backend offline. Running in-browser (slower)...",
                    isSystem: true
                }]);

                const systemPrompt = PYTHON_ANALYSIS_PROMPT
                    .replace('{{metadata}}', metadataStr)
                    .replace('{{prompt}}', currentInput);

                const response = await chatWithOllama(selectedModel, [
                    { role: 'system', content: systemPrompt },
                    ...messages.filter(m => m.role !== 'system'),
                    userMessage
                ], false);

                code = response.content.trim();
                const pythonMatch = code.match(/```python\s*([\s\S]*?)```/);
                const genericMatch = code.match(/```\s*([\s\S]*?)```/);
                code = pythonMatch ? pythonMatch[1].trim() : (genericMatch ? genericMatch[1].trim() : code.replace(/```python/g, '').replace(/```/g, '').trim());

                const localResult = await runPython(code, data);
                result = localResult.result;
                fig = localResult.fig;
            }

            // 3. Final Summary (only if not already summarized by backend)
            let finalContent = result;
            if (!backend && result && result !== 'None' && result.length < 500) {
                const summaryPrompt = `Summarize the result in one natural sentence in the same language as the user's question.
CRITICAL: YOU MUST USE THE EXACT NUMBER FROM THE RESULT. DO NOT CHANGE, ROUND, OR ADD DIGITS.
Currency: ${currency}`;

                const summaryResponse = await chatWithOllama(selectedModel, [
                    { role: 'system', content: summaryPrompt },
                    { role: 'user', content: `Question: ${currentInput}\nResult: ${result}` }
                ], false);
                finalContent = summaryResponse.content;
            }

            const endTime = performance.now();
            const durationSec = ((endTime - startTime) / 1000).toFixed(1);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: finalContent || (fig ? "I've generated a visualization for you." : "Analysis complete."),
                fig: fig ? JSON.parse(fig) : null,
                code: code,
                executionTime: durationSec
            }]);

        } catch (error) {
            console.error(error);
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-500' :
                            msg.isSystem ? 'bg-slate-700 text-slate-400' :
                                'bg-primary/20 text-primary'}`}>
                            {msg.role === 'user' ? <User size={14} /> : msg.isSystem ? <Database size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.isError ? 'bg-red-500/10 text-red-200 border border-red-500/20' :
                            msg.role === 'user' ? 'bg-indigo-600 text-white' :
                                msg.isSystem ? 'bg-slate-800/50 text-slate-400 italic' :
                                    'bg-slate-800 text-slate-200'
                            }`}>
                            {msg.content}

                            {msg.fig && (
                                <div className="mt-4 bg-white rounded-lg p-2 overflow-hidden">
                                    <PlotlyChart data={msg.fig} />
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                                {msg.code && (
                                    <details className="opacity-50 text-[10px]">
                                        <summary className="cursor-pointer hover:underline">View Logic</summary>
                                        <pre className="mt-1 p-2 bg-black/40 rounded overflow-x-auto">
                                            {msg.code}
                                        </pre>
                                    </details>
                                )}

                                {msg.executionTime && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
                                        <Clock size={10} />
                                        <span>{msg.executionTime}s</span>
                                    </div>
                                )}
                            </div>
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
                            <span className="text-xs text-slate-400">Thinking ({elapsedTime}s)...</span>
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

function PlotlyChart({ data }) {
    const containerRef = useRef(null);
    useEffect(() => {
        if (containerRef.current && data) {
            Plotly.newPlot(containerRef.current, data.data, {
                ...data.layout,
                autosize: true,
                margin: { l: 40, r: 20, t: 40, b: 40 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#333' }
            }, { responsive: true, displayModeBar: true });
        }
    }, [data]);

    return <div ref={containerRef} className="w-full h-64" />;
}
