import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  useConversations, 
  useDirectMessages, 
  useSendMessage, 
  useContacts, 
  useStartConversation,
  useUnreadCount,
  Conversation,
  TeamMemberContact 
} from '@/hooks/useChat';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

type View = 'conversations' | 'chat' | 'contacts';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('conversations');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<TeamMemberContact | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: currentUser } = useCurrentTeamMember();
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useDirectMessages(selectedConversationId);
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: unreadCount = 0 } = useUnreadCount();
  const sendMessage = useSendMessage();
  const startConversation = useStartConversation();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && view === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, view]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && view === 'chat') {
      inputRef.current.focus();
    }
  }, [isOpen, view]);

  const handleSend = async () => {
    if (!message.trim() || sendMessage.isPending) return;
    
    if (selectedConversationId) {
      sendMessage.mutate({ conversationId: selectedConversationId, content: message });
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversationId(conv.id);
    setSelectedContact(conv.otherParticipant as TeamMemberContact || null);
    setView('chat');
  };

  const handleSelectContact = async (contact: TeamMemberContact) => {
    try {
      const conversationId = await startConversation.mutateAsync(contact.id);
      setSelectedConversationId(conversationId);
      setSelectedContact(contact);
      setView('chat');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleBack = () => {
    setView('conversations');
    setSelectedConversationId(null);
    setSelectedContact(null);
    setMessage('');
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatConversationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isGuest = (role: string) => role === 'guest';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[28rem] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            {view === 'chat' && selectedContact ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback
                      style={{ backgroundColor: selectedContact.color }}
                      className="text-xs text-white"
                    >
                      {selectedContact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{selectedContact.name}</span>
                    {isGuest(selectedContact.role) && (
                      <span className="text-xs opacity-75">Guest</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">Messages</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Conversations List */}
          {view === 'conversations' && (
            <>
              <div className="p-2 border-b">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setView('contacts')}
                >
                  <Users className="h-4 w-4" />
                  New Message
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {conversationsLoading ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No conversations yet
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => handleSelectConversation(conv)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback
                            style={{ backgroundColor: conv.otherParticipant?.color || 'hsl(var(--muted))' }}
                            className="text-sm text-white"
                          >
                            {conv.otherParticipant?.initials || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">
                              {conv.otherParticipant?.name || 'Unknown'}
                            </span>
                            {conv.lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {formatConversationTime(conv.lastMessage.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage?.content || 'No messages'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="ml-2 h-5 min-w-[20px] rounded-full px-1.5">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Contacts List */}
          {view === 'contacts' && (
            <>
              <div className="p-2 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setView('conversations'); setSearchQuery(''); }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {contactsLoading ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No contacts found
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => handleSelectContact(contact)}
                        disabled={startConversation.isPending}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback
                            style={{ backgroundColor: contact.color }}
                            className="text-sm text-white"
                          >
                            {contact.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="font-medium text-sm">{contact.name}</span>
                          {isGuest(contact.role) && (
                            <p className="text-xs text-muted-foreground">Guest</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Chat View */}
          {view === 'chat' && (
            <>
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No messages yet. Say hello!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwnMessage = msg.sender_id === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2',
                            isOwnMessage && 'flex-row-reverse'
                          )}
                        >
                          {!isOwnMessage && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback
                                style={{ backgroundColor: msg.sender?.color || 'hsl(var(--muted))' }}
                                className="text-xs text-white"
                              >
                                {msg.sender?.initials || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              'flex flex-col max-w-[70%]',
                              isOwnMessage && 'items-end'
                            )}
                          >
                            <div
                              className={cn(
                                'rounded-lg px-3 py-2 text-sm',
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p className="break-words">{msg.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {formatMessageTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 border-t bg-muted/30">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessage.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full px-1.5 text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </>
        )}
      </Button>
    </div>
  );
}
