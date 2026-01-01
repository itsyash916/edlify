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
  Send
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type QuizState = "select" | "intro" | "playing" | "result";

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  total_questions: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  hint: string | null;
  difficulty: string;
}

const BASE_QUESTION_TIME = 15;

const calculatePoints = (timeLeft: number, correct: boolean, difficulty: string): number => {
  if (!correct) return -1;
  const difficultyMultiplier = difficulty === "hard" ? 1.5 : difficulty === "easy" ? 0.8 : 1;
  if (timeLeft >= 12) return Math.round(10 * difficultyMultiplier);
  if (timeLeft >= 8) return Math.round(7 * difficultyMultiplier);
  return Math.round(4 * difficultyMultiplier);
};

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
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  
  // Hints
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintAvailable, setHintAvailable] = useState(false);
  const [wrongTryCount, setWrongTryCount] = useState(0);
  
  // Time extension
  const [timeExtensionUsed, setTimeExtensionUsed] = useState(false);
  const [timeExtensions, setTimeExtensions] = useState(0);
  
  // Dialogs
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDoubtDialog, setShowDoubtDialog] = useState(false);
  const [reportIssue, setReportIssue] = useState("");
  const [doubtQuestion, setDoubtQuestion] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtBounty, setDoubtBounty] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  const question = questions[currentQuestion];
  const questionTime = BASE_QUESTION_TIME + (timeExtensionUsed ? 5 : 0);

  // Fetch quizzes on mount
  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (data) setQuizzes(data);
      setLoading(false);
    };
    
    fetchQuizzes();
    
    if (profile) {
      setTimeExtensions(profile.time_extension_count || 0);
    }
  }, [profile]);

  // Fetch questions when quiz is selected
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
      }));
      setQuestions(formattedQuestions);
    }
    setLoading(false);
  };

  // Timer logic with hint availability after 10 seconds
  useEffect(() => {
    if (quizState !== "playing" || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null);
          return questionTime;
        }
        // Make hint available after 10 seconds (5 seconds left)
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
      
      await supabase
        .from("profiles")
        .update({ time_extension_count: timeExtensions - 1 })
        .eq("id", profile?.id);
      
      toast.success("+5 seconds added!");
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
      // Wrong answer - make hint available
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
    
    setAnswers((prev) => [...prev, answerIndex]);
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
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    await updatePoints(totalPoints, "quiz_completion", `Completed quiz: ${selectedQuiz?.name}`);
    
    await supabase
      .from("profiles")
      .update({ quizzes_completed: (profile?.quizzes_completed || 0) + 1 })
      .eq("id", profile?.id);
    
    await refreshProfile();
    setQuizState("result");
  };

  const selectQuiz = async (quiz: Quiz) => {
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
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
    setHintUsed(false);
    setShowHint(false);
    setHintAvailable(false);
    setWrongTryCount(0);
    setTimeExtensionUsed(false);
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
            quizzes.map((quiz, index) => (
              <FadeIn key={quiz.id} delay={index * 0.1}>
                <GlassCard 
                  hover 
                  className="p-4 cursor-pointer"
                  onClick={() => selectQuiz(quiz)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{quiz.name}</h3>
                      <p className="text-sm text-muted-foreground">{quiz.subject}</p>
                      {quiz.description && (
                        <p className="text-xs text-muted-foreground mt-1">{quiz.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{quiz.total_questions} Qs</p>
                      <ArrowRight className="w-5 h-5 text-primary mt-1" />
                    </div>
                  </div>
                </GlassCard>
              </FadeIn>
            ))
          )}
        </div>
      </PageLayout>
    );
  }

  if (quizState === "intro") {
    return (
      <PageLayout title="Quiz" points={profile?.points || 0}>
        <div className="max-w-lg mx-auto">
          <FadeIn>
            <GlassCard className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{selectedQuiz?.name}</h2>
              <p className="text-muted-foreground mb-6">
                {questions.length} questions • {BASE_QUESTION_TIME} seconds each
              </p>
              
              {timeExtensions > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-warning/20 border border-warning/30">
                  <div className="flex items-center justify-center gap-2 text-warning">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      You have {timeExtensions} time extension{timeExtensions > 1 ? "s" : ""} available!
                    </span>
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
            </GlassCard>
          </FadeIn>
        </div>
      </PageLayout>
    );
  }

  if (quizState === "result") {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    
    return (
      <PageLayout title="Results" points={profile?.points || 0}>
        <div className="max-w-lg mx-auto">
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

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                  Home
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => setQuizState("select")}>
                  Play Again
                </Button>
              </div>
            </GlassCard>
          </ScaleIn>
        </div>
      </PageLayout>
    );
  }

  // Playing state
  return (
    <PageLayout showNav={false} showHeader={false}>
      <div className="max-w-lg mx-auto min-h-screen flex flex-col py-6">
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

        {/* Time Extension Button */}
        {timeExtensions > 0 && !timeExtensionUsed && !showResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-warning text-warning hover:bg-warning/10"
              onClick={useTimeExtension}
            >
              <Timer className="w-4 h-4 mr-2" />
              Use +5 Seconds ({timeExtensions} left)
            </Button>
          </motion.div>
        )}

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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
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

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
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
                  Report Error
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
