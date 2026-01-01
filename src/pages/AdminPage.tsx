import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit2,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
  difficulty: string;
}

interface Quiz {
  id: string;
  name: string;
  description: string;
  subject: string;
  total_questions: number;
  is_active: boolean;
  created_at: string;
}

const AdminPage = () => {
  const { profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  
  // Quiz form
  const [quizName, setQuizName] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizSubject, setQuizSubject] = useState("Mathematics");
  
  // Questions
  const [questions, setQuestions] = useState<QuestionForm[]>([{
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    hint: "",
    difficulty: "medium",
  }]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data && !error) {
      setQuizzes(data);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hint: "",
      difficulty: "medium",
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleCreateQuiz = async () => {
    if (!quizName.trim()) {
      toast.error("Please enter a quiz name");
      return;
    }

    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      toast.error("Please fill in all questions and options");
      return;
    }

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          name: quizName,
          description: quizDescription,
          subject: quizSubject,
          total_questions: questions.length,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions
      const { error: questionsError } = await supabase
        .from("questions")
        .insert(
          questions.map(q => ({
            quiz_id: quiz.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correctAnswer,
            hint: q.hint || null,
            difficulty: q.difficulty,
          }))
        );

      if (questionsError) throw questionsError;

      toast.success("Quiz created successfully!");
      resetForm();
      fetchQuizzes();
    } catch (error: any) {
      toast.error(error.message || "Failed to create quiz");
    }
  };

  const resetForm = () => {
    setQuizName("");
    setQuizDescription("");
    setQuizSubject("Mathematics");
    setQuestions([{
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hint: "",
      difficulty: "medium",
    }]);
    setShowCreateQuiz(false);
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId);

    if (!error) {
      toast.success("Quiz deleted");
      fetchQuizzes();
    } else {
      toast.error("Failed to delete quiz");
    }
  };

  const toggleQuizActive = async (quizId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("quizzes")
      .update({ is_active: !isActive })
      .eq("id", quizId);

    if (!error) {
      toast.success(isActive ? "Quiz deactivated" : "Quiz activated");
      fetchQuizzes();
    }
  };

  if (loading) {
    return (
      <PageLayout title="Admin Panel" showPoints={false}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PageLayout title="Admin Panel" showPoints={false}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Quiz Management</h2>
              <p className="text-muted-foreground">Create and manage quizzes</p>
            </div>
            <Button
              variant={showCreateQuiz ? "outline" : "gradient"}
              onClick={() => setShowCreateQuiz(!showCreateQuiz)}
            >
              {showCreateQuiz ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </>
              )}
            </Button>
          </div>
        </FadeIn>

        {/* Create Quiz Form */}
        {showCreateQuiz && (
          <FadeIn>
            <GlassCard className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">New Quiz</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Quiz Name</Label>
                  <Input
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    placeholder="e.g., Chapter 1 - Algebra"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Subject</Label>
                  <select
                    value={quizSubject}
                    onChange={(e) => setQuizSubject(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-card border border-border focus:outline-none focus:border-primary"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="Social Science">Social Science</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Brief description of the quiz..."
                  className="mt-1.5"
                />
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Questions ({questions.length})</h4>
                  <Button variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </div>

                {questions.map((q, qIndex) => (
                  <GlassCard key={qIndex} className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Label>Question {qIndex + 1}</Label>
                        <Textarea
                          value={q.question}
                          onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                          placeholder="Enter your question..."
                          className="mt-1.5"
                        />
                      </div>
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctAnswer === oIndex}
                            onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                            className="w-4 h-4 accent-primary"
                          />
                          <Input
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Hint (optional)</Label>
                        <Input
                          value={q.hint}
                          onChange={(e) => updateQuestion(qIndex, "hint", e.target.value)}
                          placeholder="Hint for struggling students..."
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <select
                          value={q.difficulty}
                          onChange={(e) => updateQuestion(qIndex, "difficulty", e.target.value)}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-card border border-border focus:outline-none focus:border-primary"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              <Button variant="gradient" size="lg" onClick={handleCreateQuiz} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
            </GlassCard>
          </FadeIn>
        )}

        {/* Existing Quizzes */}
        <FadeIn delay={0.1}>
          <h3 className="text-lg font-semibold mb-3">Existing Quizzes</h3>
          {quizzes.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No quizzes yet</p>
              <p className="text-sm text-muted-foreground">Create your first quiz to get started</p>
            </GlassCard>
          ) : (
            <StaggerContainer staggerDelay={0.05} className="space-y-3">
              {quizzes.map((quiz) => (
                <StaggerItem key={quiz.id}>
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${quiz.is_active ? "bg-success/20" : "bg-muted"}`}>
                          <BookOpen className={`w-5 h-5 ${quiz.is_active ? "text-success" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{quiz.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {quiz.subject} • {quiz.total_questions} questions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuizActive(quiz.id, quiz.is_active)}
                        >
                          {quiz.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => deleteQuiz(quiz.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </FadeIn>

        {/* Reports Section */}
        <FadeIn delay={0.2}>
          <h3 className="text-lg font-semibold mb-3">Question Reports</h3>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">Question reports will appear here when users report issues</p>
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default AdminPage;
