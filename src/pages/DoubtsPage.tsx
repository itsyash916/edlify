import { useState } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PointsBadge } from "@/components/ui/badges";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAppStore, getDoubts, Doubt } from "@/lib/store";
import { cn } from "@/lib/utils";
import { 
  Plus,
  MessageCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type DoubtFilter = "all" | "unsolved" | "solved" | "my-doubts";

const DoubtCard = ({ doubt }: { doubt: Doubt }) => {
  const getSubjectColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case "mathematics": return "bg-primary/20 text-primary border-primary/30";
      case "science": return "bg-success/20 text-success border-success/30";
      case "english": return "bg-secondary/20 text-secondary border-secondary/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <GlassCard hover className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center font-medium flex-shrink-0">
          {doubt.userName.charAt(0)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">{doubt.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(doubt.createdAt, { addSuffix: true })}
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
          <span className="text-sm">{doubt.answersCount}</span>
        </div>
      </div>
    </GlassCard>
  );
};

const DoubtsPage = () => {
  const { user } = useAppStore();
  const doubts = getDoubts();
  const [filter, setFilter] = useState<DoubtFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDoubts = doubts.filter(doubt => {
    if (filter === "solved" && !doubt.solved) return false;
    if (filter === "unsolved" && doubt.solved) return false;
    if (filter === "my-doubts" && doubt.userId !== user.id) return false;
    if (searchQuery && !doubt.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <PageLayout title="Doubt Board" points={user.points}>
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
            <Button variant="gradient">
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
        <StaggerContainer staggerDelay={0.1}>
          {filteredDoubts.length > 0 ? (
            filteredDoubts.map((doubt) => (
              <StaggerItem key={doubt.id}>
                <DoubtCard doubt={doubt} />
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
    </PageLayout>
  );
};

export default DoubtsPage;
