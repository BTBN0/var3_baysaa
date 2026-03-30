import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../context/ChatContext'
import { useWorkspace } from '../../context/WorkspaceContext'

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  )
}

const SUGGESTIONS = [
  'Энэ channel-ийн мессежийг хураангуйлна уу',
  'Код бичихэд туслаарай',
  'Монгол хэлнээс англи руу орчуулна уу',
  'Тайлан бичихэд туслаарай',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}/>
      ))}
    </div>
  )
}

function MessageItem({ msg }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className="w-5 h-5 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 text-white">
            <SparkleIcon />
          </div>
        )}
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {isUser ? 'Та' : 'AI'}
        </span>
      </div>
      <div className={`group relative max-w-[92%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? 'bg-accent text-white rounded-br-sm'
          : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'}`}>
        {msg.content}
        {!isUser && (
          <button onClick={copy}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity
                       w-6 h-6 rounded-lg bg-white dark:bg-dark-600 border border-gray-200 dark:border-white/15
                       flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-accent">
            {copied
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            }
          </button>
        )}
      </div>
    </div>
  )
}

export default function AIPanel({ onClose }) {
  const { activeChannel } = useWorkspace()
  const { activeMessages } = useChat()
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Сайн байна уу! Би Czilla-гийн AI туслагч. #${activeChannel?.name || 'channel'} дотор танд юуг туслах вэ?`,
  }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildSystemPrompt = () => {
    const recentMsgs = (activeMessages || []).slice(-10)
    const chatContext = recentMsgs.length
      ? `\n\nОдоогийн #${activeChannel?.name} channel-ийн сүүлийн мессежүүд:\n` +
        recentMsgs.map(m => `${m.user?.username || 'User'}: ${m.content}`).join('\n')
      : ''
    return `Та Czilla team chat application-ийн AI туслагч. Монгол болон Англи хэлээр хариулна. Товч, тодорхой, хэрэгтэй хариулт өгнө. Markdown ашиглаж болно.${chatContext}`
  }

  const send = async (text) => {
    const userMsg = text || input
    if (!userMsg.trim() || loading) return
    setInput('')
    inputRef.current?.focus()

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Алдаа гарлаа. Дахин оролдоно уу.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Интернэт холболт алдаа гарлаа. Дахин оролдоно уу.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clear = () => setMessages([{
    role: 'assistant',
    content: `Ярилцлага шинэчлэгдлээ. Юуг туслах вэ?`,
  }])

  return (
    <div className="flex flex-col h-full w-72 border-l border-gray-200 dark:border-white/15 bg-white dark:bg-dark-800">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-white/15 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 text-white">
          <SparkleIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">AI Assistant</p>
          <p className="text-[10px] text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
            Claude Sonnet
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} title="Цэвэрлэх"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
          </button>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.map((msg, i) => <MessageItem key={i} msg={msg} />)}
        {loading && (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 px-1">
              <div className="w-5 h-5 rounded-lg bg-accent flex items-center justify-center text-white"><SparkleIcon /></div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">AI</span>
            </div>
            <div className="bg-gray-100 dark:bg-dark-700 rounded-2xl rounded-bl-sm px-3 py-2.5">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="px-3 pb-2 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">Санал болгох</p>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="text-left text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-700
                         border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400
                         hover:bg-accent/8 hover:border-accent/30 hover:text-accent transition-all duration-100 truncate">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1 flex-shrink-0 border-t border-gray-100 dark:border-white/15">
        <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 transition-all duration-150
          ${input ? 'border-accent/50' : 'border-gray-200 dark:border-white/15'}
          bg-gray-50 dark:bg-dark-700`}>
          <textarea ref={inputRef}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none
                       min-h-[20px] max-h-28 leading-5"
            placeholder="AI-аас асуух…"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
              ${input.trim() && !loading
                ? 'bg-accent text-white hover:bg-accent-hover active:scale-95'
                : 'bg-gray-200 dark:bg-dark-600 text-gray-400'}`}>
            {loading
              ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" strokeOpacity=".3"/><path d="M12 3a9 9 0 019 9"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-1.5">Enter — илгээх</p>
      </div>
    </div>
  )
}
