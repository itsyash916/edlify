import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimerRing, LinearProgress } from "@/components/ui/progress";
import { AnimatedPoints } from "@/components/ui/badges";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Play, 
  AlertTriangle, 
  HelpCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Trophy,
  Zap,
  Target,
  Lightbulb,
  Timer,
  Loader2,
  Send,
  Gift,
  SkipForward,
  RotateCcw,
  PieChart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

type QuizState = "select" | "intro" | "playing" | "result";

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  total_questions: number;
  banner_url?: string | null;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  hint: string | null;
  difficulty: string;
  image_url?: string | null;
}

interface QuestionResult {
  question: Question;
  userAnswer: number | null;
  isCorrect: boolean;
}

const BASE_QUESTION_TIME = 15;

const calculatePoints = (timeLeft: number, correct: boolean, difficulty: string): number => {
  if (!correct) return -1;
  const difficultyMultiplier = difficulty === "hard" ? 1.5 : difficulty === "easy" ? 0.8 : 1;
  if (timeLeft >= 12) return Math.round(10 * difficultyMultiplier);
  if (timeLeft >= 8) return Math.round(7 * difficultyMultiplier);
  return Math.round(4 * difficultyMultiplier);
};

const MYSTERY_GIFTS = [
  { type: "points", value: 500, label: "500 Bonus Points!", icon: "💰" },
  { type: "points", value: 250, label: "250 Bonus Points!", icon: "💎" },
  { type: "animated_avatar", value: 3, label: "Animated Avatar (3 days)!", icon: "✨" },
  { type: "crown", value: 3, label: "Profile Crown (3 days)!", icon: "👑" },
  { type: "time_extension", value: 3, label: "3 Time Extensions!", icon: "⏰" },
  { type: "skip_question", value: 2, label: "2 Skip Question Uses!", icon: "⏭️" },
];

const QuizPage = () => {
  const { profile, updatePoints, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [quizState, setQuizState] = useState<QuizState>("select");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BASE_QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  
  // Hints
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintAvailable, setHintAvailable] = useState(false);
  const [wrongTryCount, setWrongTryCount] = useState(0);
  
  // Time extension
  const [timeExtensionUsed, setTimeExtensionUsed] = useState(false);
  const [timeExtensions, setTimeExtensions] = useState(0);
  
  // Skip and second chance
  const [skipCount, setSkipCount] = useState(0);
  const [secondChanceCount, setSecondChanceCount] = useState(0);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  
  // Mystery gift
  const [showMysteryGift, setShowMysteryGift] = useState(false);
  const [mysteryGiftOpened, setMysteryGiftOpened] = useState(false);
  const [selectedGift, setSelectedGift] = useState<typeof MYSTERY_GIFTS[0] | null>(null);
  
  // Dialogs
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDoubtDialog, setShowDoubtDialog] = useState(false);
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportIssue, setReportIssue] = useState("");
  const [doubtQuestion, setDoubtQuestion] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtBounty, setDoubtBounty] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  const question = questions[currentQuestion];
  const questionTime = BASE_QUESTION_TIME + (timeExtensionUsed ? 5 : 0);

  // State for completed quizzes
  const [completedQuizzes, setCompletedQuizzes] = useState<Map<string, any>>(new Map());
  const [viewingCompletion, setViewingCompletion] = useState<any>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (data) setQuizzes(data);
      
      // Fetch completed quizzes for this user
      if (profile?.id) {
        const { data: completions } = await supabase
          .from("quiz_completions")
          .select("*")
          .eq("user_id", profile.id);
        
        if (completions) {
          const completionMap = new Map();
          completions.forEach(c => completionMap.set(c.quiz_id, c));
          setCompletedQuizzes(completionMap);
        }
      }
      
      setLoading(false);
    };
    
    fetchQuizzes();
    
    if (profile) {
      setTimeExtensions(profile.time_extension_count || 0);
      setSkipCount((profile as any).skip_question_count || 0);
      setSecondChanceCount((profile as any).second_chance_count || 0);
    }
  }, [profile]);

  const fetchQuestions = async (quizId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId);
    
    if (data) {
      const formattedQuestions: Question[] = data.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options as string[],
        correct_answer: q.correct_answer,
        hint: q.hint,
        difficulty: q.difficulty,
        image_url: (q as any).image_url,
      }));
      setQuestions(formattedQuestions);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (quizState !== "playing" || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null);
          return questionTime;
        }
        if (prev <= 5 && !hintUsed && question?.hint) {
          setHintAvailable(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, showResult, currentQuestion, questionTime, hintUsed, question]);

  const useHint = () => {
    if (!hintUsed && question?.hint) {
      setHintUsed(true);
      setShowHint(true);
      setTimeout(() => setShowHint(false), 5000);
    }
  };

  const useTimeExtension = async () => {
    if (timeExtensions > 0 && !timeExtensionUsed) {
      setTimeExtensionUsed(true);
      setTimeLeft(prev => prev + 5);
      setTimeExtensions(prev => prev - 1);
      
      // Use atomic powerup function to prevent race conditions
      await supabase.rpc('use_powerup_atomic', {
        _user_id: profile?.id,
        _powerup_type: 'time_extension'
      });
      
      toast.success("+5 seconds added!");
    }
  };

  const useSkipQuestion = async () => {
    if (skipCount > 0 && !showResult) {
      setSkipCount(prev => prev - 1);
      
      // Use atomic powerup function to prevent race conditions
      await supabase.rpc('use_powerup_atomic', {
        _user_id: profile?.id,
        _powerup_type: 'skip_question'
      });
      
      // Record as skipped (no points lost)
      setQuestionResults(prev => [...prev, {
        question: question!,
        userAnswer: null,
        isCorrect: false,
      }]);
      
      toast.info("Question skipped!");
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimeLeft(questionTime);
        setHintUsed(false);
        setShowHint(false);
        setHintAvailable(false);
        setWrongTryCount(0);
        setTimeExtensionUsed(false);
        setSecondChanceUsed(false);
      } else {
        finishQuiz();
      }
    }
  };

  const useSecondChance = async () => {
    if (secondChanceCount > 0 && showResult && selectedAnswer !== question?.correct_answer && !secondChanceUsed) {
      setSecondChanceUsed(true);
      setSecondChanceCount(prev => prev - 1);
      setShowResult(false);
      setSelectedAnswer(null);
      setTimeLeft(10); // Give 10 more seconds
      
      // Use atomic powerup function to prevent race conditions
      await supabase.rpc('use_powerup_atomic', {
        _user_id: profile?.id,
        _powerup_type: 'second_chance'
      });
      
      // Remove the last result since we're retrying
      setQuestionResults(prev => prev.slice(0, -1));
      
      toast.info("Second chance! Try again!");
    }
  };

  const handleAnswer = useCallback((answerIndex: number | null) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const isCorrect = answerIndex === question?.correct_answer;
    const points = answerIndex === null ? 0 : calculatePoints(timeLeft, isCorrect, question?.difficulty || "medium");
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    } else if (answerIndex !== null && !hintUsed && question?.hint) {
      setWrongTryCount(prev => prev + 1);
      if (wrongTryCount === 0) {
        setHintAvailable(true);
      }
    }
    
    if (points !== 0) {
      setTotalPoints((prev) => prev + points);
      setLastPoints(points);
      setShowPointsAnimation(true);
      setTimeout(() => setShowPointsAnimation(false), 600);
    }
    
    setQuestionResults(prev => [...prev, {
      question: question!,
      userAnswer: answerIndex,
      isCorrect,
    }]);
  }, [showResult, question, timeLeft, hintUsed, wrongTryCount]);

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(questionTime);
      setHintUsed(false);
      setShowHint(false);
      setHintAvailable(false);
      setWrongTryCount(0);
      setTimeExtensionUsed(false);
      setSecondChanceUsed(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    await updatePoints(totalPoints, "quiz_completion", `Completed quiz: ${selectedQuiz?.name}`);
    
    // Use atomic function to update quizzes completed
    await supabase.rpc('increment_quizzes_completed_atomic', {
      _user_id: profile?.id,
      _points_earned: 0 // Points already awarded via updatePoints
    });
    
    // Save quiz completion
    if (selectedQuiz && profile?.id) {
      await supabase
        .from("quiz_completions")
        .insert([{
          user_id: profile.id,
          quiz_id: selectedQuiz.id,
          score: score,
          total_questions: questions.length,
          points_earned: totalPoints,
          question_results: JSON.parse(JSON.stringify(questionResults)),
        }]);
    }
    
    await refreshProfile();
    
    // Check for perfect score - show mystery gift
    if (score === questions.length && questions.length > 0) {
      const randomGift = MYSTERY_GIFTS[Math.floor(Math.random() * MYSTERY_GIFTS.length)];
      setSelectedGift(randomGift);
      setShowMysteryGift(true);
    } else {
      setQuizState("result");
    }
  };

  const openMysteryGift = async () => {
    if (!selectedGift || !profile?.id) return;
    
    setMysteryGiftOpened(true);
    
    // Apply the gift
    if (selectedGift.type === "points") {
      await updatePoints(selectedGift.value, "mystery_gift", `Mystery gift: ${selectedGift.label}`);
    } else if (selectedGift.type === "time_extension") {
      await supabase
        .from("profiles")
        .update({ time_extension_count: (profile.time_extension_count || 0) + selectedGift.value })
        .eq("id", profile.id);
    } else if (selectedGift.type === "skip_question") {
      await supabase
        .from("profiles")
        .update({ skip_question_count: ((profile as any).skip_question_count || 0) + selectedGift.value } as any)
        .eq("id", profile.id);
    } else if (selectedGift.type === "animated_avatar") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedGift.value);
      await supabase
        .from("profiles")
        .update({ 
          animated_avatar_enabled: true,
          animated_avatar_expires_at: expiresAt.toISOString()
        } as any)
        .eq("id", profile.id);
    } else if (selectedGift.type === "crown") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedGift.value);
      await supabase
        .from("profiles")
        .update({ 
          profile_frame: "crown",
          accent_expires_at: expiresAt.toISOString()
        })
        .eq("id", profile.id);
    }
    
    toast.success(selectedGift.label);
    await refreshProfile();
    
    setTimeout(() => {
      setShowMysteryGift(false);
      setQuizState("result");
    }, 2000);
  };

  const selectQuiz = async (quiz: Quiz) => {
    // Check if already completed - show results dialog
    const completion = completedQuizzes.get(quiz.id);
    if (completion) {
      setViewingCompletion(completion);
      setSelectedQuiz(quiz);
      // Fetch questions to show in report
      await fetchQuestions(quiz.id);
      return;
    }
    
    setSelectedQuiz(quiz);
    await fetchQuestions(quiz.id);
    setQuizState("intro");
  };

  const startQuiz = () => {
    setQuizState("playing");
    setCurrentQuestion(0);
    setTimeLeft(questionTime);
    setScore(0);
    setTotalPoints(0);
    setQuestionResults([]);
    setSelectedAnswer(null);
    setShowResult(false);
    setHintUsed(false);
    setShowHint(false);
    setHintAvailable(false);
    setWrongTryCount(0);
    setTimeExtensionUsed(false);
    setSecondChanceUsed(false);
  };

  const reportQuestion = async () => {
    if (!reportIssue.trim() || !question?.id || !profile?.id) return;
    
    setSubmitting(true);
    const { error } = await supabase
      .from("question_reports")
      .insert({
        question_id: question.id,
        user_id: profile.id,
        issue: reportIssue.trim(),
      });
    
    if (!error) {
      toast.success("Report submitted! Thank you for helping improve our quizzes.");
      setShowReportDialog(false);
      setReportIssue("");
    } else {
      toast.error("Failed to submit report");
    }
    setSubmitting(false);
  };

  const askDoubt = async () => {
    if (!doubtQuestion.trim() || !doubtSubject || !profile?.id) return;
    
    const bountyAmount = parseInt(doubtBounty);
    if (bountyAmount > (profile?.points || 0)) {
      toast.error("Not enough points for this bounty!");
      return;
    }
    
    setSubmitting(true);
    const { error } = await supabase
      .from("doubts")
      .insert({
        user_id: profile.id,
        question: doubtQuestion.trim(),
        subject: doubtSubject,
        bounty: bountyAmount,
      });
    
    if (!error) {
      await updatePoints(-bountyAmount, "doubt_bounty", "Posted a doubt with bounty");
      toast.success("Doubt posted! Check the Doubt Board for answers.");
      setShowDoubtDialog(false);
      setDoubtQuestion("");
      setDoubtSubject("");
      setDoubtBounty("100");
    } else {
      toast.error("Failed to post doubt");
    }
    setSubmitting(false);
  };

  // Report Card Chart Data
  const chartData = [
    { name: "Correct", value: score, color: "hsl(160 84% 39%)" },
    { name: "Wrong", value: questions.length - score, color: "hsl(0 84% 60%)" },
  ];

  if (loading) {
    return (
      <PageLayout title="Quiz" points={profile?.points || 0}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  // Quiz selection screen
  if (quizState === "select") {
    return (
      <PageLayout title="Select Quiz" points={profile?.points || 0}>
        <div className="max-w-lg mx-auto space-y-4">
          <FadeIn>
            <p className="text-muted-foreground mb-4">Choose a quiz to start:</p>
          </FadeIn>
          
          {/* Power-ups display */}
          {(skipCount > 0 || secondChanceCount > 0) && (
            <FadeIn>
              <GlassCard className="p-3 flex items-center gap-4">
                {skipCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <SkipForward className="w-4 h-4 text-primary" />
                    <span>{skipCount} Skips</span>
                  </div>
                )}
                {secondChanceCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <RotateCcw className="w-4 h-4 text-warning" />
                    <span>{secondChanceCount} Retries</span>
                  </div>
                )}
              </GlassCard>
            </FadeIn>
          )}
          
          {quizzes.length === 0 ? (
            <FadeIn>
              <GlassCard className="p-8 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No quizzes available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for new quizzes!
                </p>
              </GlassCard>
            </FadeIn>
          ) : (
            quizzes.map((quiz, index) => {
              const isCompleted = completedQuizzes.has(quiz.id);
              return (
                <FadeIn key={quiz.id} delay={index * 0.1}>
                  <GlassCard 
                    hover 
                    className={`overflow-hidden cursor-pointer ${isCompleted ? 'border-success/30' : ''}`}
                    onClick={() => selectQuiz(quiz)}
                  >
                    {/* Quiz Banner */}
                    {quiz.banner_url && (
                      <div className="aspect-[16/9] max-h-32 overflow-hidden">
                        <img 
                          src={quiz.banner_url} 
                          alt={quiz.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{quiz.name}</h3>
                            {isCompleted && (
                              <CheckCircle className="w-4 h-4 text-success" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{quiz.subject}</p>
                          {quiz.description && (
                            <p className="text-xs text-muted-foreground mt-1">{quiz.description}</p>
                          )}
                          {isCompleted && (
                            <p className="text-xs text-success mt-1">Completed • Tap to view results</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{quiz.total_questions} Qs</p>
                          {isCompleted ? (
                            <PieChart className="w-5 h-5 text-success mt-1" />
                          ) : (
                            <ArrowRight className="w-5 h-5 text-primary mt-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })
          )}
        </div>
        
        {/* Completed Quiz Results Dialog */}
        <Dialog open={!!viewingCompletion} onOpenChange={() => setViewingCompletion(null)}>
          <DialogContent className="glass-card max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quiz Results: {selectedQuiz?.name}</DialogTitle>
            </DialogHeader>
            {viewingCompletion && (
              <div className="space-y-6 mt-4">
                {/* Score Summary */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-success/20 to-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-success" />
                  </div>
                  <div className="text-3xl font-bold text-gradient-primary mb-1">
                    {viewingCompletion.points_earned > 0 ? "+" : ""}{viewingCompletion.points_earned}
                  </div>
                  <p className="text-sm text-muted-foreground">Points earned</p>
                </div>
                
                {/* Pie Chart */}
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={[
                          { name: "Correct", value: viewingCompletion.score, color: "hsl(160 84% 39%)" },
                          { name: "Wrong", value: viewingCompletion.total_questions - viewingCompletion.score, color: "hsl(0 84% 60%)" },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="hsl(160 84% 39%)" />
                        <Cell fill="hsl(0 84% 60%)" />
                      </Pie>
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-success/20">
                    <p className="text-xl font-bold text-success">{viewingCompletion.score}</p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/20">
                    <p className="text-xl font-bold text-destructive">{viewingCompletion.total_questions - viewingCompletion.score}</p>
                    <p className="text-xs text-muted-foreground">Wrong</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/20">
                    <p className="text-xl font-bold text-primary">
                      {viewingCompletion.total_questions > 0 
                        ? Math.round((viewingCompletion.score / viewingCompletion.total_questions) * 100) 
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                </div>
                
                {/* Question Results */}
                {viewingCompletion.question_results && viewingCompletion.question_results.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Question Breakdown:</h4>
                    {(viewingCompletion.question_results as any[]).map((result: any, index: number) => (
                      <GlassCard 
                        key={index} 
                        className={`p-3 ${result.isCorrect ? 'border-success/30' : 'border-destructive/30'}`}
                      >
                        <div className="flex items-start gap-2">
                          {result.isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{result.question?.question}</p>
                            {!result.isCorrect && result.question && (
                              <div className="mt-1 text-xs space-y-0.5">
                                <p className="text-destructive">
                                  Your answer: {result.userAnswer !== null ? result.question.options?.[result.userAnswer] : "No answer"}
                                </p>
                                <p className="text-success">
                                  Correct: {result.question.options?.[result.question.correct_answer]}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center">
                  Completed on {new Date(viewingCompletion.completed_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    );
  }

  if (quizState === "intro") {
    return (
      <PageLayout title="Quiz" points={profile?.points || 0}>
        <div className="max-w-lg mx-auto">
          <FadeIn>
            <GlassCard className="overflow-hidden text-center">
              {/* Quiz Banner */}
              {selectedQuiz?.banner_url && (
                <div className="aspect-[16/9] max-h-48 overflow-hidden">
                  <img 
                    src={selectedQuiz.banner_url} 
                    alt={selectedQuiz.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                {!selectedQuiz?.banner_url && (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-10 h-10 text-primary" />
                  </div>
                )}
                <h2 className="text-2xl font-bold mb-2">{selectedQuiz?.name}</h2>
                <p className="text-muted-foreground mb-6">
                  {questions.length} questions • {BASE_QUESTION_TIME} seconds each
                </p>
              
                {(timeExtensions > 0 || skipCount > 0 || secondChanceCount > 0) && (
                  <div className="mb-4 p-3 rounded-xl bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">Your Power-ups:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {timeExtensions > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs">
                          <Timer className="w-3 h-3" /> {timeExtensions} Time Boosts
                        </span>
                      )}
                      {skipCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs">
                          <SkipForward className="w-3 h-3" /> {skipCount} Skips
                        </span>
                      )}
                      {secondChanceCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/20 text-secondary text-xs">
                          <RotateCcw className="w-3 h-3" /> {secondChanceCount} Retries
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xl font-bold text-primary">+10</p>
                    <p className="text-2xs text-muted-foreground">Fast answer</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xl font-bold text-success">+4</p>
                    <p className="text-2xs text-muted-foreground">Correct</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xl font-bold text-destructive">-1</p>
                    <p className="text-2xs text-muted-foreground">Wrong</p>
                  </div>
                </div>

                <Button 
                  variant="gradient" 
                  size="xl" 
                  className="w-full"
                  onClick={startQuiz}
                  disabled={questions.length === 0}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Quiz
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => setQuizState("select")}
                >
                  Choose Different Quiz
                </Button>
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </PageLayout>
    );
  }

  // Mystery Gift Modal
  if (showMysteryGift) {
    return (
      <PageLayout showNav={false} showHeader={false}>
        <div className="min-h-screen flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={!mysteryGiftOpened ? { 
                scale: [1, 1.1, 1],
                rotate: [-5, 5, -5]
              } : {}}
              transition={{ duration: 0.5, repeat: mysteryGiftOpened ? 0 : Infinity }}
              className="relative inline-block mb-6"
            >
              {!mysteryGiftOpened ? (
                <div 
                  className="w-40 h-40 rounded-2xl bg-gradient-to-br from-warning via-secondary to-primary flex items-center justify-center cursor-pointer shadow-[0_0_50px_hsl(38_92%_50%_/_0.5)]"
                  onClick={openMysteryGift}
                >
                  <Gift className="w-20 h-20 text-white" />
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-40 h-40 rounded-2xl bg-gradient-to-br from-success to-primary flex items-center justify-center shadow-[0_0_50px_hsl(160_84%_39%_/_0.5)]"
                >
                  <span className="text-6xl">{selectedGift?.icon}</span>
                </motion.div>
              )}
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2">
              {mysteryGiftOpened ? selectedGift?.label : "🎉 Perfect Score! 🎉"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {mysteryGiftOpened ? "Congratulations!" : "Tap the gift to reveal your reward!"}
            </p>
            
            {!mysteryGiftOpened && (
              <Button variant="gradient" size="lg" onClick={openMysteryGift}>
                <Gift className="w-5 h-5 mr-2" />
                Open Gift
              </Button>
            )}
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  if (quizState === "result") {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const wrongQuestions = questionResults.filter(r => !r.isCorrect);
    
    return (
      <PageLayout title="Results" points={profile?.points || 0}>
        <div className="max-w-lg mx-auto space-y-6">
          <ScaleIn>
            <GlassCard className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-success/20 to-primary/20 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-success" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
              
              <div className="my-8">
                <div className="text-5xl font-bold text-gradient-primary mb-2">
                  {totalPoints > 0 ? "+" : ""}{totalPoints}
                </div>
                <p className="text-muted-foreground">Points earned</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-muted/50">
                  <Target className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xl font-bold">{score}/{questions.length}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <CheckCircle className="w-5 h-5 text-success mx-auto mb-2" />
                  <p className="text-xl font-bold">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                  Home
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => setQuizState("select")}>
                  Play Again
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setShowReportCard(true)}
              >
                <PieChart className="w-4 h-4 mr-2" />
                View Report Card
              </Button>
            </GlassCard>
          </ScaleIn>
        </div>
        
        {/* Report Card Dialog */}
        <Dialog open={showReportCard} onOpenChange={setShowReportCard}>
          <DialogContent className="glass-card max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quiz Report Card</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Pie Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-success/20">
                  <p className="text-xl font-bold text-success">{score}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/20">
                  <p className="text-xl font-bold text-destructive">{questions.length - score}</p>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/20">
                  <p className="text-xl font-bold text-primary">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
              </div>
              
              {/* Wrong Questions Review */}
              {wrongQuestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-destructive">Questions to Review:</h4>
                  {wrongQuestions.map((result, index) => (
                    <GlassCard key={index} className="p-4 border-destructive/30">
                      <p className="font-medium text-sm mb-2">{result.question.question}</p>
                      <div className="space-y-1 text-xs">
                        <p className="text-destructive">
                          Your answer: {result.userAnswer !== null ? result.question.options[result.userAnswer] : "No answer"}
                        </p>
                        <p className="text-success">
                          Correct: {result.question.options[result.question.correct_answer]}
                        </p>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    );
  }

  // Playing state
  return (
    <PageLayout showNav={false} showHeader={false}>
      <div className="max-w-lg mx-auto min-h-screen flex flex-col py-6 px-4">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Question {currentQuestion + 1}/{questions.length}</p>
              <p className="text-xs text-primary font-medium">{selectedQuiz?.subject}</p>
            </div>
            <div className="relative">
              <TimerRing 
                timeLeft={timeLeft} 
                totalTime={questionTime} 
                size={70}
                urgent
              />
              <AnimatedPoints points={lastPoints} show={showPointsAnimation} positive={lastPoints > 0} />
            </div>
          </div>
        </FadeIn>

        {/* Power-up Buttons */}
        <div className="flex gap-2 mb-4">
          {timeExtensions > 0 && !timeExtensionUsed && !showResult && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-warning text-warning hover:bg-warning/10 text-xs"
                onClick={useTimeExtension}
              >
                <Timer className="w-3 h-3 mr-1" />
                +5s ({timeExtensions})
              </Button>
            </motion.div>
          )}
          {skipCount > 0 && !showResult && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-primary text-primary hover:bg-primary/10 text-xs"
                onClick={useSkipQuestion}
              >
                <SkipForward className="w-3 h-3 mr-1" />
                Skip ({skipCount})
              </Button>
            </motion.div>
          )}
        </div>

        {/* Progress */}
        <LinearProgress 
          value={currentQuestion + 1} 
          max={questions.length} 
          className="mb-6"
          height="sm"
        />

        {/* Hint Display */}
        <AnimatePresence>
          {showHint && question?.hint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <GlassCard className="p-4 border-warning/30 bg-warning/10">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-warning flex-shrink-0" />
                  <p className="text-sm">{question.hint}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <GlassCard className="p-5 mb-6">
              <p className="text-lg font-medium leading-relaxed">{question?.question}</p>
              {question?.image_url && (
                <img 
                  src={question.image_url} 
                  alt="Question" 
                  className="mt-4 rounded-xl max-h-48 w-full object-contain bg-muted/50"
                />
              )}
            </GlassCard>

            {/* Options */}
            <div className="space-y-3 flex-1">
              {question?.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correct_answer;
                const showCorrect = showResult && isCorrect;
                const showWrong = showResult && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={index}
                    whileTap={!showResult ? { scale: 0.98 } : {}}
                    onClick={() => !showResult && handleAnswer(index)}
                    disabled={showResult}
                    className={cn(
                      "w-full p-4 rounded-xl text-left transition-all duration-200",
                      "border backdrop-blur-sm",
                      !showResult && "hover:bg-card/80 hover:border-primary/50 active:scale-[0.98]",
                      !showResult && !isSelected && "bg-card/50 border-border/50",
                      showCorrect && "bg-success/20 border-success text-success-foreground",
                      showWrong && "bg-destructive/20 border-destructive",
                      isSelected && !showResult && "bg-primary/20 border-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                        "bg-muted/50",
                        showCorrect && "bg-success text-success-foreground",
                        showWrong && "bg-destructive text-destructive-foreground"
                      )}>
                        {showCorrect ? <CheckCircle className="w-5 h-5" /> : 
                         showWrong ? <XCircle className="w-5 h-5" /> :
                         String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 font-medium">{option}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {/* Hint Button */}
              {!showResult && hintAvailable && !hintUsed && question?.hint && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button 
                    variant="outline" 
                    className="w-full border-warning text-warning hover:bg-warning/10"
                    onClick={useHint}
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Show Hint
                  </Button>
                </motion.div>
              )}

              {/* Second Chance Button */}
              {showResult && selectedAnswer !== question?.correct_answer && secondChanceCount > 0 && !secondChanceUsed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button 
                    variant="outline" 
                    className="w-full border-secondary text-secondary hover:bg-secondary/10"
                    onClick={useSecondChance}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Use Second Chance ({secondChanceCount} left)
                  </Button>
                </motion.div>
              )}

              {showResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button 
                    variant="gradient" 
                    size="lg" 
                    className="w-full"
                    onClick={nextQuestion}
                  >
                    {currentQuestion < questions.length - 1 ? (
                      <>
                        Next Question
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      "See Results"
                    )}
                  </Button>
                </motion.div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setShowReportDialog(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setShowDoubtDialog(true)}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Ask Doubt
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Report Question Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Report Question Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What's wrong with this question?</Label>
              <Textarea
                value={reportIssue}
                onChange={(e) => setReportIssue(e.target.value)}
                placeholder="Describe the issue (incorrect answer, typo, unclear question, etc.)"
                className="mt-1.5"
              />
            </div>
            <Button 
              variant="gradient" 
              className="w-full"
              onClick={reportQuestion}
              disabled={!reportIssue.trim() || submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ask Doubt Dialog */}
      <Dialog open={showDoubtDialog} onOpenChange={setShowDoubtDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Ask a Doubt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Your Question</Label>
              <Textarea
                value={doubtQuestion}
                onChange={(e) => setDoubtQuestion(e.target.value)}
                placeholder="Describe your doubt in detail..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={doubtSubject} onValueChange={setDoubtSubject}>
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
              <Label>Bounty Points (will be deducted from your balance)</Label>
              <Select value={doubtBounty} onValueChange={setDoubtBounty}>
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
              onClick={askDoubt}
              disabled={!doubtQuestion.trim() || !doubtSubject || submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Post Doubt ({doubtBounty} pts)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default QuizPage;
