import { steps, type Event } from '../flow';
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
export type Message = { id: number; role: 'user' | 'assistant' | 'system'; text: string; at?: number; interrupted?: boolean };
const Context = createContext<{ messages: Message[]; replayVisit?: string; replaySequence: number; replayStep: (visit: string) => void; update: (role: Message['role'], text: string, fresh?: boolean, interrupted?: boolean) => void } | null>(null);
export function ConversationProvider({ children, events = [] }: { children: ReactNode; events?: Event[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const sequence = useRef(0);
  const seenTransitions = useRef(new Set<number>());
  useEffect(() => {
    const changes = events.filter(event => event.from && event.to && !seenTransitions.current.has(event.id));
    if (!changes.length) return;
    changes.forEach(event => seenTransitions.current.add(event.id));
    setMessages(previous => [...previous, ...changes.map(event => ({ id: -event.id, role: 'system' as const, at: event.at, text: `${steps[event.from!].title} → ${steps[event.to!].title}`, }))]);
  }, [events]);
  const [replay, setReplay] = useState({ visit: undefined as string | undefined, sequence: 0 });
  function replayStep(visit: string) { setReplay(previous => ({ visit, sequence: previous.visit === visit ? previous.sequence + 1 : 1 })); }
  function update(role: Message['role'], text: string, fresh = false, interrupted = false) {
    if (!text.trim()) return;
    const id = ++sequence.current;
    setMessages(previous => {
      const last = previous.at(-1);
      return !fresh && last?.role === role ? [...previous.slice(0, -1), { ...last, text: role === 'user' ? `${last.text.trim()} ${text.trim()}` : text, interrupted }] : [...previous, { id, role, text, interrupted }];
    });
  }
  return <Context.Provider value={{ messages, update, replayVisit: replay.visit, replaySequence: replay.sequence, replayStep }}>{children}</Context.Provider>;
}
export function useConversation() { const context = useContext(Context); if (!context) throw new Error('ConversationProvider missing'); return context; }
export function Conversation({ compact = false, emptyText }: { compact?: boolean; emptyText?: string }) {
  const { messages } = useConversation();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' }); }, [messages]);
  const dialogue = compact ? messages.filter(message => message.role !== 'system') : messages;
  const latest = dialogue.at(-1);
  let partner = -1;
  for (let i = dialogue.length - 2; i >= 0; i--) { if (dialogue[i].role !== latest?.role) { partner = i; break; } }
  const visible = compact && latest ? partner >= 0 ? [dialogue[partner], latest] : [latest] : messages;
  if (!messages.length) return emptyText ? <p className="[.assistant-stage.in-sidebar>&]:hidden py-0 px-3 text-[length:14px] leading-[1.8] text-[#355660] whitespace-pre-wrap [.controls-expanded>&]:hidden">{emptyText}</p> : null;
  return <section className={`my-0 mx-auto gap-4 flex flex-col w-full ${compact ? 'conversation-preview gap-2.5 text-left max-w-[560px] [.controls-expanded>&]:hidden' : ''}`} role="log" aria-label="Conversazione con Nido" aria-live="polite" aria-relevant="additions text">
    {visible.map(message => <article key={message.id} className={`
      conversation-message py-3.5 px-4 border border-solid border-[rgb(220,_229,_235)] max-w-[94%] rounded-[14px]
      bg-[#fff] text-[#294b59] leading-[1.8] text-[length:13px] [&_small]:text-[length:10px] [&_small]:font-[650]
      [&_small]:tracking-[.7px] [&_small]:text-[#53777a] [&_p]:mx-0 [&_p]:whitespace-pre-wrap [&_p]:mt-1.5 [&_p]:mb-0
      [&_p]:[overflow-wrap:anywhere] [.conversation-preview_&]:py-2.5 [.conversation-preview_&]:px-3.5
      max-[1100px]:py-2.5 max-[1100px]:px-3 max-[1100px]:text-[length:12px]
    ${message.role === 'user' ? 'from-user [.conversation-message&]:border-[#cadfda] [.conversation-message&]:[align-self:flex-end] [.conversation-message&]:bg-[#e2eeeb]' : message.role === 'system' ? `
      from-system [.conversation-message&]:py-2.5 [.conversation-message&]:px-1
      [.conversation-message&]:[border-top:1px_solid_rgb(220,_229,_235)]
      [.conversation-message&]:[border-right:0px_none_currentColor]
      [.conversation-message&]:[border-bottom:1px_solid_rgb(220,_229,_235)]
      [.conversation-message&]:[border-left:0px_none_currentColor] [.conversation-message&]:bg-[transparent]
      [.conversation-message&]:rounded-none [.conversation-message&]:text-[#53727d] [.conversation-message&_p]:mx-0
      [.conversation-message&_p]:text-[length:11px] [.conversation-message&_p]:leading-[1.5]
      [.conversation-message&_p]:mt-1 [.conversation-message&_p]:mb-0 [.conversation-message&_time]:[float:right]
      [.conversation-message&_time]:text-[length:10px] [.conversation-message&_time]:text-[#728c9c]
    ` : 'from-assistant'}`}><small>{message.role === 'user' ? 'Tu' : message.role === 'system' ? 'Cambio di step' : 'Nido'}{message.interrupted ? ' - interrotto' : ''}</small>{message.at && <time dateTime={new Date(message.at).toISOString()}>{new Date(message.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>}<p>{message.text}</p></article>)}
    <div ref={end} />
  </section>;
}
