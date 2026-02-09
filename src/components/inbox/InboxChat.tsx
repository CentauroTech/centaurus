import { useState, useRef, useEffect } from 'react';
import { Send, Search, Users, MessageSquare } from 'lucide-react';
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
  Conversation,
  TeamMemberContact,
} from '@/hooks/useChat';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

export function InboxChat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<{ name: string; initials: string; color: string } | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: currentUser } = useCurrentTeamMember();
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useDirectMessages(selectedConversationId);
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const sendMessage = useSendMessage();
  const startConversation = useStartConversation();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when conversation selected
  useEffect(() => {
    if (selectedConversationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConversationId]);

  const handleSend = async () => {
    if (!message.trim() || sendMessage.isPending || !selectedConversationId) return;
    sendMessage.mutate({ conversationId: selectedConversationId, content: message });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversationId(conv.id);
    setSelectedContact(conv.otherParticipant || null);
    setShowContacts(false);
  };

  const handleSelectContact = async (contact: TeamMemberContact) => {
    try {
      const conversationId = await startConversation.mutateAsync(contact.id);
      setSelectedConversationId(conversationId);
      setSelectedContact({ name: contact.name, initials: contact.initials, color: contact.color });
      setShowContacts(false);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
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

  const sidebarList = showContacts ? null : conversations;

  return (
    <div className="flex border rounded-lg h-[calc(100vh-16rem)] min-h-[400px] overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className="w-72 md:w-80 border-r flex flex-col shrink-0">
        {/* Sidebar header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              {showContacts ? 'New Message' : 'Conversations'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowContacts(!showContacts); setSearchQuery(''); }}
              className="h-8 gap-1.5 text-xs"
            >
              {showContacts ? (
                <>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Back
                </>
              ) : (
                <>
                  <Users className="h-3.5 w-3.5" />
                  New
                </>
              )}
            </Button>
          </div>
          {showContacts && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <ScrollArea className="flex-1">
          <div className="p-1.5">
            {showContacts ? (
              // Contacts list
              contactsLoading ? (
                <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>
              ) : filteredContacts.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No contacts found</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors text-left"
                    onClick={() => handleSelectContact(contact)}
                    disabled={startConversation.isPending}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback
                        style={{ backgroundColor: contact.color }}
                        className="text-xs text-white"
                      >
                        {contact.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      {contact.role === 'guest' && (
                        <p className="text-xs text-muted-foreground">Guest</p>
                      )}
                    </div>
                  </button>
                ))
              )
            ) : (
              // Conversations list
              conversationsLoading ? (
                <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No conversations</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowContacts(true)}
                    className="mt-1"
                  >
                    Start a new message
                  </Button>
                </div>
              ) : (
                conversations.map((conv) => {
                  const participant = conv.otherParticipant;
                  if (!participant) return null;
                  const isSelected = conv.id === selectedConversationId;

                  return (
                    <button
                      key={conv.id}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-md transition-colors text-left',
                        isSelected
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted',
                        conv.unreadCount > 0 && !isSelected && 'bg-primary/5'
                      )}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback
                          style={{ backgroundColor: participant.color }}
                          className="text-xs text-white"
                        >
                          {participant.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn('text-sm truncate', conv.unreadCount > 0 && 'font-semibold')}>
                            {participant.name}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {formatConversationTime(conv.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage?.content || 'No messages'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="ml-2 h-4 min-w-[16px] rounded-full px-1 text-[10px] shrink-0">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversationId && selectedContact ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  style={{ backgroundColor: selectedContact.color }}
                  className="text-xs text-white"
                >
                  {selectedContact.initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{selectedContact.name}</span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {messagesLoading ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</p>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex gap-2', isOwn && 'flex-row-reverse')}
                      >
                        {!isOwn && (
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback
                              style={{ backgroundColor: msg.sender?.color || 'hsl(var(--muted))' }}
                              className="text-[10px] text-white"
                            >
                              {msg.sender?.initials || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm',
                              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}
                          >
                            <p className="break-words">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Input */}
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
