import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PointsBadge } from "@/components/ui/badges";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Plus,
  MessageCircle,
  CheckCircle,
  Clock,
  Search,
  Zap,
  Send,
  Loader2,
  Trash2,
  Shield
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DoubtFilter = "all" | "unsolved" | "solved" | "my-doubts";

interface Doubt {
  id: string;
  user_id: string;
  question: string;
  bounty: number;
  subject: string;
  created_at: string;
  solved: boolean;
  user_name?: string;
  answers_count?: number;
}

interface Answer {
  id: string;
  answer: string;
  user_id: string;
  user_name: string;
  is_accepted: boolean;
  created_at: string;
}

const DoubtCard = ({ doubt, currentUserId, onViewAnswers }: { 
  doubt: Doubt; 
  currentUserId?: string;
  onViewAnswers: (doubt: Doubt) => void;
}) => {
  const getSubjectColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case "mathematics": return "bg-primary/20 text-primary border-primary/30";
      case "science": return "bg-success/20 text-success border-success/30";
      case "english": return "bg-secondary/20 text-secondary border-secondary/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <GlassCard hover className="p-4 cursor-pointer" onClick={() => onViewAnswers(doubt)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center font-medium flex-shrink-0">
          {doubt.user_name?.charAt(0) || "?"}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">
              {doubt.user_name || "Anonymous"}
              {doubt.user_id === currentUserId && (
                <span className="text-xs text-primary ml-1">(You)</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {doubt.question}
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border",
              getSubjectColor(doubt.subject)
            )}>
              {doubt.subject}
            </span>
            
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium border border-warning/30">
              <Zap className="w-3 h-3" />
              {doubt.bounty}
            </div>
            
            {doubt.solved ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-medium border border-success/30">
                <CheckCircle className="w-3 h-3" />
                Solved
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
                <Clock className="w-3 h-3" />
                Open
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">{doubt.answers_count || 0}</span>
        </div>
      </div>
    </GlassCard>
  );
};

const DoubtsPage = () => {
  const { profile, updatePoints, isAdmin } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [filter, setFilter] = useState<DoubtFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingDoubtId, setDeletingDoubtId] = useState<string | null>(null);
  
  // New doubt dialog
  const [showNewDoubtDialog, setShowNewDoubtDialog] = useState(false);
  const [newDoubtQuestion, setNewDoubtQuestion] = useState("");
  const [newDoubtSubject, setNewDoubtSubject] = useState("");
  const [newDoubtBounty, setNewDoubtBounty] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  
  // View doubt dialog
  const [selectedDoubt, setSelectedDoubt] = useState<Doubt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState("");
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  const fetchDoubts = async () => {
    setLoading(true);
    
    // Fetch doubts
    const { data: doubtsData } = await supabase
      .from("doubts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (doubtsData) {
      // Filter out solved doubts older than 1 hour (auto-cleanup display)
      const now = new Date();
      const visibleDoubts = doubtsData.filter(d => {
        if (!d.solved) return true;
        const solvedTime = new Date(d.created_at);
        // Assuming solved recently, we check if solved state is true
        // For display purposes, hide solved doubts older than 1 hour
        // The actual deletion would require a cron/scheduled job
        return differenceInHours(now, solvedTime) < 24; // Keep visible for 24 hours for context
      });
      
      // Fetch all profiles for user names using public view (no email exposure)
      const userIds = [...new Set(visibleDoubts.map(d => d.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles_public")
        .select("id, name")
        .in("id", userIds);
      
      const profileMap = new Map(profilesData?.map(p => [p.id, p.name]) || []);
      
      // Fetch answer counts for each doubt
      const doubtsWithDetails = await Promise.all(visibleDoubts.map(async (d) => {
        const { count } = await supabase
          .from("doubt_answers")
          .select("*", { count: "exact", head: true })
          .eq("doubt_id", d.id);
        
        return {
          ...d,
          user_name: profileMap.get(d.user_id) || "Anonymous",
          answers_count: count || 0,
        };
      }));
      
      setDoubts(doubtsWithDetails);
    }
    setLoading(false);
  };

  // Admin delete doubt function
  const deleteDoubt = async (doubtId: string) => {
    if (!isAdmin) return;
    
    setDeletingDoubtId(doubtId);
    
    // First delete all answers for this doubt
    await supabase
      .from("doubt_answers")
      .delete()
      .eq("doubt_id", doubtId);
    
    // Then delete the doubt
    const { error } = await supabase
      .from("doubts")
      .delete()
      .eq("id", doubtId);
    
    if (!error) {
      toast.success("Doubt deleted successfully");
      setSelectedDoubt(null);
      fetchDoubts();
    } else {
      toast.error("Failed to delete doubt");
    }
    setDeletingDoubtId(null);
  };

  useEffect(() => {
    fetchDoubts();
  }, []);

  const filteredDoubts = doubts.filter(doubt => {
    if (filter === "solved" && !doubt.solved) return false;
    if (filter === "unsolved" && doubt.solved) return false;
    if (filter === "my-doubts" && doubt.user_id !== profile?.id) return false;
    if (searchQuery && !doubt.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const createDoubt = async () => {
    if (!newDoubtQuestion.trim() || !newDoubtSubject || !profile?.id) return;
    
    const bountyAmount = parseInt(newDoubtBounty);
    if (bountyAmount > (profile?.points || 0)) {
      toast.error("Not enough points for this bounty!");
      return;
    }
    
    setSubmitting(true);
    const { error } = await supabase
      .from("doubts")
      .insert({
        user_id: profile.id,
        question: newDoubtQuestion.trim(),
        subject: newDoubtSubject,
        bounty: bountyAmount,
      });
    
    if (!error) {
      await updatePoints(-bountyAmount, "doubt_bounty", "Posted a doubt with bounty");
      toast.success("Doubt posted successfully!");
      setShowNewDoubtDialog(false);
      setNewDoubtQuestion("");
      setNewDoubtSubject("");
      setNewDoubtBounty("100");
      fetchDoubts();
    } else {
      toast.error("Failed to post doubt");
    }
    setSubmitting(false);
  };

  const viewDoubtAnswers = async (doubt: Doubt) => {
    setSelectedDoubt(doubt);
    setLoadingAnswers(true);
    setAnswers([]);
    
    // Fetch answers with user profiles
    const { data: answersData } = await supabase
      .from("doubt_answers")
      .select("*")
      .eq("doubt_id", doubt.id)
      .order("created_at", { ascending: true });
    
    if (answersData && answersData.length > 0) {
      // Fetch profile names for all answer authors using public view
      const answerUserIds = [...new Set(answersData.map(a => a.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles_public")
        .select("id, name")
        .in("id", answerUserIds);
      
      const profileMap = new Map(profilesData?.map(p => [p.id, p.name]) || []);
      
      const formattedAnswers: Answer[] = answersData.map(a => ({
        id: a.id,
        answer: a.answer,
        user_id: a.user_id,
        user_name: profileMap.get(a.user_id) || "Anonymous",
        is_accepted: a.is_accepted,
        created_at: a.created_at,
      }));
      
      setAnswers(formattedAnswers);
    }
    setLoadingAnswers(false);
  };

  const submitAnswer = async () => {
    if (!newAnswer.trim() || !selectedDoubt || !profile?.id) return;
    
    setSubmitting(true);
    const { error } = await supabase
      .from("doubt_answers")
      .insert({
        doubt_id: selectedDoubt.id,
        user_id: profile.id,
        answer: newAnswer.trim(),
      });
    
    if (!error) {
      toast.success("Answer submitted!");
      setNewAnswer("");
      viewDoubtAnswers(selectedDoubt);
    } else {
      toast.error("Failed to submit answer");
    }
    setSubmitting(false);
  };

  const acceptAnswer = async (answerId: string, answerUserId: string) => {
    if (!selectedDoubt || selectedDoubt.user_id !== profile?.id) return;
    
    // Mark answer as accepted
    await supabase
      .from("doubt_answers")
      .update({ is_accepted: true })
      .eq("id", answerId);
    
    // Mark doubt as solved
    await supabase
      .from("doubts")
      .update({ solved: true })
      .eq("id", selectedDoubt.id);
    
    // Award bounty to answerer using atomic function to prevent race conditions
    await supabase.rpc('increment_doubts_answered_atomic', {
      _user_id: answerUserId,
      _bounty: selectedDoubt.bounty
    });
    
    // Record the transaction
    await supabase
      .from("point_transactions")
      .insert({
        user_id: answerUserId,
        amount: selectedDoubt.bounty,
        transaction_type: "doubt_answer_accepted",
        description: `Bounty received for accepted answer`,
      });
    
    toast.success("Answer accepted! Bounty awarded.");
    setSelectedDoubt(null);
    fetchDoubts();
  };

  return (
    <PageLayout title="Doubt Board" points={profile?.points || 0}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header Actions */}
        <FadeIn>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search doubts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/80 border border-border/50 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <Button variant="gradient" onClick={() => setShowNewDoubtDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Ask
            </Button>
          </div>
        </FadeIn>

        {/* Info Card */}
        <FadeIn delay={0.1}>
          <GlassCard className="p-4 border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Zap className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="font-medium text-sm">Earn points by helping!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Answer doubts and win bounty points when your answer is accepted.
                </p>
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.15}>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 overflow-x-auto">
            {(["all", "unsolved", "solved", "my-doubts"] as DoubtFilter[]).map((f) => (
              <motion.button
                key={f}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-shrink-0 py-2 px-4 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap",
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.replace("-", " ")}
              </motion.button>
            ))}
          </div>
        </FadeIn>

        {/* Doubts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <StaggerContainer staggerDelay={0.1}>
            {filteredDoubts.length > 0 ? (
              filteredDoubts.map((doubt) => (
                <StaggerItem key={doubt.id}>
                  <DoubtCard 
                    doubt={doubt} 
                    currentUserId={profile?.id}
                    onViewAnswers={viewDoubtAnswers}
                  />
                </StaggerItem>
              ))
            ) : (
              <FadeIn>
                <GlassCard className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No doubts found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to ask a question!
                  </p>
                </GlassCard>
              </FadeIn>
            )}
          </StaggerContainer>
        )}

        {/* Bounty Info */}
        <FadeIn delay={0.3}>
          <GlassCard className="p-4">
            <h4 className="font-semibold mb-3">Bounty Tiers</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <PointsBadge points={100} size="sm" className="mx-auto mb-1" />
                <p className="text-2xs text-muted-foreground">Quick Q</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <PointsBadge points={500} size="sm" className="mx-auto mb-1" />
                <p className="text-2xs text-muted-foreground">Standard</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <PointsBadge points={1000} size="sm" className="mx-auto mb-1" />
                <p className="text-2xs text-muted-foreground">Complex</p>
              </div>
            </div>
          </GlassCard>
        </FadeIn>
      </div>

      {/* New Doubt Dialog */}
      <Dialog open={showNewDoubtDialog} onOpenChange={setShowNewDoubtDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Ask a Doubt</DialogTitle>
            <DialogDescription>
              Post your question and set a bounty to get help from the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Your Question</Label>
              <Textarea
                value={newDoubtQuestion}
                onChange={(e) => setNewDoubtQuestion(e.target.value)}
                placeholder="Describe your doubt in detail..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={newDoubtSubject} onValueChange={setNewDoubtSubject}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Social Studies">Social Studies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bounty Points</Label>
              <Select value={newDoubtBounty} onValueChange={setNewDoubtBounty}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 points</SelectItem>
                  <SelectItem value="250">250 points</SelectItem>
                  <SelectItem value="500">500 points</SelectItem>
                  <SelectItem value="1000">1000 points</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                You have {profile?.points || 0} points available
              </p>
            </div>
            <Button 
              variant="gradient" 
              className="w-full"
              onClick={createDoubt}
              disabled={!newDoubtQuestion.trim() || !newDoubtSubject || submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Post Doubt ({newDoubtBounty} pts)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Doubt Dialog */}
      <Dialog open={!!selectedDoubt} onOpenChange={() => setSelectedDoubt(null)}>
        <DialogContent className="glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doubt Details</DialogTitle>
            <DialogDescription>
              View the question and answers from the community.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoubt && (
            <div className="space-y-4 mt-4">
              {/* Question */}
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedDoubt.user_name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
                      {selectedDoubt.bounty} pts bounty
                    </span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDoubt(selectedDoubt.id)}
                      disabled={deletingDoubtId === selectedDoubt.id}
                    >
                      {deletingDoubtId === selectedDoubt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-sm">{selectedDoubt.question}</p>
              </div>
              
              {/* Answers */}
              <div>
                <h4 className="font-semibold mb-3">Answers ({answers.length})</h4>
                
                {loadingAnswers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : answers.length > 0 ? (
                  <div className="space-y-3">
                    {answers.map((answer) => (
                      <div 
                        key={answer.id} 
                        className={`p-3 rounded-xl ${answer.is_accepted ? "bg-success/10 border border-success/30" : "bg-muted/30"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{answer.user_name}</span>
                          {answer.is_accepted && (
                            <span className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle className="w-3 h-3" />
                              Accepted
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{answer.answer}</p>
                        
                        {/* Accept button for doubt owner */}
                        {!selectedDoubt.solved && 
                         selectedDoubt.user_id === profile?.id && 
                         answer.user_id !== profile?.id && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => acceptAnswer(answer.id, answer.user_id)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Accept Answer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No answers yet. Be the first to help!
                  </p>
                )}
              </div>
              
              {/* Submit Answer */}
              {!selectedDoubt.solved && selectedDoubt.user_id !== profile?.id && (
                <div className="pt-4 border-t">
                  <Label>Your Answer</Label>
                  <Textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Write your answer..."
                    className="mt-1.5"
                  />
                  <Button 
                    variant="gradient" 
                    className="w-full mt-3"
                    onClick={submitAnswer}
                    disabled={!newAnswer.trim() || submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit Answer
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default DoubtsPage;
