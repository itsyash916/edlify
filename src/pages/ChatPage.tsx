import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, 
  MessageCircle, 
  Users, 
  Hash, 
  Plus,
  Search,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Image as ImageIcon,
  ArrowLeft
} from "lucide-react";
import { FadeIn } from "@/components/ui/animations";
import { format } from "date-fns";

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  subject: string | null;
}

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: string;
  created_at: string;
  user?: {
    name: string;
    avatar_url: string | null;
  };
}

interface UserProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_online?: boolean;
}

const ChatPage = () => {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch rooms
  useEffect(() => {
    fetchRooms();
    fetchUsers();
    updatePresence();

    // Set up presence updates
    const presenceInterval = setInterval(updatePresence, 30000);
    return () => clearInterval(presenceInterval);
  }, [profile?.id]);

  // Subscribe to messages
  useEffect(() => {
    if (!selectedRoom) return;

    fetchMessages(selectedRoom.id);

    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Fetch user info for the message
          const { data: userData } = await supabase
            .from("profiles_public")
            .select("name, avatar_url")
            .eq("id", newMsg.user_id)
            .single();
          
          setMessages((prev) => [...prev, { ...newMsg, user: userData || undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updatePresence = async () => {
    if (!profile?.id) return;
    
    await supabase
      .from("user_presence")
      .upsert({
        user_id: profile.id,
        is_online: true,
        last_seen: new Date().toISOString(),
      });
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .in("room_type", ["public", "subject"])
      .order("name");
    
    if (data) {
      setRooms(data);
      if (data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0]);
      }
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles_public")
      .select("id, name, avatar_url")
      .neq("id", profile?.id || "")
      .limit(50);
    
    if (data) setUsers(data as UserProfile[]);
  };

  const fetchMessages = async (roomId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      // Fetch user info for each message
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: usersData } = await supabase
        .from("profiles_public")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const userMap = new Map(usersData?.map((u) => [u.id, u]) || []);
      
      const messagesWithUsers = data.map((m) => ({
        ...m,
        user: userMap.get(m.user_id) || undefined,
      }));
      
      setMessages(messagesWithUsers);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !profile) return;

    const { error } = await supabase.from("chat_messages").insert({
      room_id: selectedRoom.id,
      user_id: profile.id,
      content: newMessage.trim(),
      message_type: "text",
    });

    if (!error) {
      setNewMessage("");
    } else {
      toast.error("Failed to send message");
    }
  };

  const startDM = async (userId: string) => {
    if (!profile) return;

    // Check if DM room already exists
    const { data: existingRooms } = await supabase
      .from("dm_participants")
      .select("room_id")
      .eq("user_id", profile.id);

    if (existingRooms) {
      for (const room of existingRooms) {
        const { data: participant } = await supabase
          .from("dm_participants")
          .select("room_id")
          .eq("room_id", room.room_id)
          .eq("user_id", userId)
          .single();

        if (participant) {
          // Room exists, select it
          const { data: roomData } = await supabase
            .from("chat_rooms")
            .select("*")
            .eq("id", room.room_id)
            .single();
          
          if (roomData) {
            setSelectedRoom(roomData);
            setShowUserList(false);
            return;
          }
        }
      }
    }

    // Create new DM room
    const targetUser = users.find((u) => u.id === userId);
    const { data: newRoom, error } = await supabase
      .from("chat_rooms")
      .insert({
        name: `DM: ${profile.name} & ${targetUser?.name}`,
        room_type: "dm",
        created_by: profile.id,
      })
      .select()
      .single();

    if (newRoom && !error) {
      // Add participants
      await supabase.from("dm_participants").insert([
        { room_id: newRoom.id, user_id: profile.id },
        { room_id: newRoom.id, user_id: userId },
      ]);

      setSelectedRoom(newRoom);
      setShowUserList(false);
    }
  };

  const getRoomIcon = (room: ChatRoom) => {
    if (room.room_type === "dm") return <MessageCircle className="w-4 h-4" />;
    if (room.room_type === "subject") return <Hash className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PageLayout title="Community">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  // Mobile: Show either room list or chat
  if (isMobileView) {
    if (!selectedRoom) {
      return (
        <PageLayout title="Community">
          <FadeIn>
            <div className="space-y-4">
              {/* Room List */}
              <GlassCard className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Chat Rooms
                </h3>
                <div className="space-y-1">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      {getRoomIcon(room)}
                      <span className="font-medium">{room.name}</span>
                    </button>
                  ))}
                </div>
              </GlassCard>

              {/* Start DM */}
              <GlassCard className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Direct Messages
                </h3>
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-3"
                />
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startDM(user.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </GlassCard>
            </div>
          </FadeIn>
        </PageLayout>
      );
    }

    // Mobile Chat View
    return (
      <PageLayout title={selectedRoom.name}>
        <div className="flex flex-col h-[calc(100vh-12rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <button onClick={() => setSelectedRoom(null)} className="p-2 hover:bg-muted rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold">{selectedRoom.name}</h3>
            <div className="flex gap-2">
              <Button size="iconSm" variant="ghost">
                <Phone className="w-4 h-4" />
              </Button>
              <Button size="iconSm" variant="ghost">
                <Video className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isOwn = msg.user_id === profile?.id;
                const showAvatar = idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    {showAvatar && !isOwn ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={msg.user?.avatar_url || undefined} />
                        <AvatarFallback>{msg.user?.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8" />
                    )}
                    <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                      {showAvatar && !isOwn && (
                        <p className="text-xs text-muted-foreground mb-1">{msg.user?.name}</p>
                      )}
                      <div
                        className={`inline-block px-3 py-2 rounded-2xl ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p className="text-2xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Desktop View
  return (
    <PageLayout title="Community">
      <FadeIn>
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <div className="col-span-3">
            <GlassCard className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Chat</h3>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-2 py-1">ROOMS</p>
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        selectedRoom?.id === room.id
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {getRoomIcon(room)}
                      <span className="text-sm truncate">{room.name}</span>
                    </button>
                  ))}
                </div>

                <div className="p-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground px-2 py-1">DIRECT MESSAGES</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setShowUserList(!showUserList)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                </div>
              </ScrollArea>
            </GlassCard>
          </div>

          {/* Main Chat */}
          <div className="col-span-6">
            <GlassCard className="h-full flex flex-col">
              {selectedRoom ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      {getRoomIcon(selectedRoom)}
                      <h3 className="font-semibold">{selectedRoom.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button size="iconSm" variant="ghost">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="iconSm" variant="ghost">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button size="iconSm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg, idx) => {
                        const isOwn = msg.user_id === profile?.id;
                        const showAvatar = idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;
                        
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                          >
                            {showAvatar && !isOwn ? (
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={msg.user?.avatar_url || undefined} />
                                <AvatarFallback>{msg.user?.name?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-10" />
                            )}
                            <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                              {showAvatar && !isOwn && (
                                <p className="text-xs text-muted-foreground mb-1">{msg.user?.name}</p>
                              )}
                              <div
                                className={`inline-block px-4 py-2 rounded-2xl ${
                                  isOwn
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md"
                                }`}
                              >
                                <p>{msg.content}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(msg.created_at), "HH:mm")}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost">
                        <Smile className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <ImageIcon className="w-5 h-5" />
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a room to start chatting
                </div>
              )}
            </GlassCard>
          </div>

          {/* Users Sidebar */}
          <div className="col-span-3">
            <GlassCard className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Users</h3>
              </div>
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startDM(user.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
                      </div>
                      <span className="text-sm truncate">{user.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </div>
      </FadeIn>
    </PageLayout>
  );
};

export default ChatPage;
