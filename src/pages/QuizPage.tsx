import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { TimerRing, LinearProgress } from "@/components/ui/progress";
import { AnimatedPoints } from "@/components/ui/badges";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { useAppStore, getQuestions, QuizQuestion } from "@/lib/store";
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
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type QuizState = "intro" | "playing" | "result";

const QUESTION_TIME = 15;

const calculatePoints = (timeLeft: number, correct: boolean): number => {
  if (!correct) return -1;
  if (timeLeft >= 12) return 10; // 0-3 sec response
  if (timeLeft >= 8) return 7;   // 4-7 sec response
  return 4;                       // 8-15 sec response
};

const QuizPage = () => {
  const { user, updatePoints } = useAppStore();
  const navigate = useNavigate();
  const questions = getQuestions();
  
  const [quizState, setQuizState] = useState<QuizState>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const question = questions[currentQuestion];

  // Timer logic
  useEffect(() => {
    if (quizState !== "playing" || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null);
          return QUESTION_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, showResult, currentQuestion]);

  const handleAnswer = useCallback((answerIndex: number | null) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const isCorrect = answerIndex === question.correctAnswer;
    const points = answerIndex === null ? 0 : calculatePoints(timeLeft, isCorrect);
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    if (points !== 0) {
      setTotalPoints((prev) => prev + points);
      setLastPoints(points);
      setShowPointsAnimation(true);
      setTimeout(() => setShowPointsAnimation(false), 600);
    }
    
    setAnswers((prev) => [...prev, answerIndex]);
  }, [showResult, question, timeLeft]);

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(QUESTION_TIME);
    } else {
      updatePoints(totalPoints);
      setQuizState("result");
    }
  };

  const startQuiz = () => {
    setQuizState("playing");
    setCurrentQuestion(0);
    setTimeLeft(QUESTION_TIME);
    setScore(0);
    setTotalPoints(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  if (quizState === "intro") {
    return (
      <PageLayout title="Quiz" points={user.points}>
        <div className="max-w-lg mx-auto">
          <FadeIn>
            <GlassCard className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Quick Quiz</h2>
              <p className="text-muted-foreground mb-6">
                {questions.length} questions • 15 seconds each
              </p>
              
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
              >
                <Play className="w-5 h-5 mr-2" />
                Start Quiz
              </Button>
            </GlassCard>
          </FadeIn>
        </div>
      </PageLayout>
    );
  }

  if (quizState === "result") {
    const accuracy = Math.round((score / questions.length) * 100);
    
    return (
      <PageLayout title="Results" points={user.points}>
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
                <Button variant="gradient" className="flex-1" onClick={startQuiz}>
                  Play Again
                </Button>
              </div>
            </GlassCard>
          </ScaleIn>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showNav={false} showHeader={false}>
      <div className="max-w-lg mx-auto min-h-screen flex flex-col py-6">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Question {currentQuestion + 1}/{questions.length}</p>
              <p className="text-xs text-primary font-medium">{question.subject}</p>
            </div>
            <div className="relative">
              <TimerRing 
                timeLeft={timeLeft} 
                totalTime={QUESTION_TIME} 
                size={70}
                urgent
              />
              <AnimatedPoints points={lastPoints} show={showPointsAnimation} positive={lastPoints > 0} />
            </div>
          </div>
        </FadeIn>

        {/* Progress */}
        <LinearProgress 
          value={currentQuestion + 1} 
          max={questions.length} 
          className="mb-6"
          height="sm"
        />

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
              <p className="text-lg font-medium leading-relaxed">{question.question}</p>
            </GlassCard>

            {/* Options */}
            <div className="space-y-3 flex-1">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correctAnswer;
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
                <Button variant="ghost" size="sm" className="flex-1">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Error
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Ask Doubt
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </PageLayout>
  );
};

export default QuizPage;
