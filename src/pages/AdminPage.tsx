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
  X,
  Users,
  Zap,
  Image,
  Check,
  Eye,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestionForm {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
  difficulty: string;
  image_url: string;
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

interface QuestionReport {
  id: string;
  question_id: string;
  user_id: string;
  issue: string;
  status: string;
  created_at: string;
  question_text?: string;
  user_name?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  points: number;
  avatar_url: string | null;
}

const AdminPage = () => {
  const { profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pointsToAdjust, setPointsToAdjust] = useState("");
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  
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
    image_url: "",
  }]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    fetchQuizzes();
    fetchReports();
    fetchUsers();
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

  const fetchReports = async () => {
    const { data } = await supabase
      .from("question_reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      // Fetch question and user details for each report
      const reportsWithDetails = await Promise.all(data.map(async (report) => {
        const { data: questionData } = await supabase
          .from("questions")
          .select("question")
          .eq("id", report.question_id)
          .single();
        
        const { data: userData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", report.user_id)
          .single();
        
        return {
          ...report,
          question_text: questionData?.question || "Unknown question",
          user_name: userData?.name || "Unknown user",
        };
      }));
      
      setReports(reportsWithDetails);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, points, avatar_url")
      .order("points", { ascending: false });
    
    if (data) setUsers(data);
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hint: "",
      difficulty: "medium",
      image_url: "",
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
            image_url: q.image_url || null,
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

  const handleEditQuiz = async (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizName(quiz.name);
    setQuizDescription(quiz.description || "");
    setQuizSubject(quiz.subject);
    
    // Fetch existing questions
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quiz.id);
    
    if (existingQuestions) {
      setQuestions(existingQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options as string[],
        correctAnswer: q.correct_answer,
        hint: q.hint || "",
        difficulty: q.difficulty,
        image_url: (q as any).image_url || "",
      })));
    }
    
    setShowCreateQuiz(true);
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz || !quizName.trim()) {
      toast.error("Please enter a quiz name");
      return;
    }

    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      toast.error("Please fill in all questions and options");
      return;
    }

    try {
      // Update quiz
      await supabase
        .from("quizzes")
        .update({
          name: quizName,
          description: quizDescription,
          subject: quizSubject,
          total_questions: questions.length,
        })
        .eq("id", editingQuiz.id);

      // Delete old questions and insert new ones
      await supabase
        .from("questions")
        .delete()
        .eq("quiz_id", editingQuiz.id);

      await supabase
        .from("questions")
        .insert(
          questions.map(q => ({
            quiz_id: editingQuiz.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correctAnswer,
            hint: q.hint || null,
            difficulty: q.difficulty,
            image_url: q.image_url || null,
          }))
        );

      toast.success("Quiz updated successfully!");
      resetForm();
      fetchQuizzes();
    } catch (error: any) {
      toast.error(error.message || "Failed to update quiz");
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
      image_url: "",
    }]);
    setShowCreateQuiz(false);
    setEditingQuiz(null);
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

  const resolveReport = async (reportId: string) => {
    await supabase
      .from("question_reports")
      .update({ status: "resolved" })
      .eq("id", reportId);
    
    toast.success("Report marked as resolved");
    fetchReports();
  };

  const adjustUserPoints = async (isAdd: boolean) => {
    if (!selectedUser || !pointsToAdjust) return;
    
    const amount = parseInt(pointsToAdjust);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setAdjustingPoints(true);
    
    const newPoints = isAdd 
      ? selectedUser.points + amount 
      : Math.max(0, selectedUser.points - amount);
    
    await supabase
      .from("profiles")
      .update({ points: newPoints })
      .eq("id", selectedUser.id);
    
    await supabase
      .from("point_transactions")
      .insert({
        user_id: selectedUser.id,
        amount: isAdd ? amount : -amount,
        transaction_type: "admin_adjustment",
        description: `Admin ${isAdd ? "added" : "removed"} ${amount} points`,
      });
    
    toast.success(`${isAdd ? "Added" : "Removed"} ${amount} points ${isAdd ? "to" : "from"} ${selectedUser.name}`);
    setSelectedUser(null);
    setPointsToAdjust("");
    fetchUsers();
    setAdjustingPoints(false);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

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
        <FadeIn>
          <Tabs defaultValue="quizzes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Quiz Management</h2>
                  <p className="text-muted-foreground">Create and manage quizzes</p>
                </div>
                <Button
                  variant={showCreateQuiz ? "outline" : "gradient"}
                  onClick={() => {
                    if (showCreateQuiz) {
                      resetForm();
                    } else {
                      setShowCreateQuiz(true);
                    }
                  }}
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

              {/* Create/Edit Quiz Form */}
              {showCreateQuiz && (
                <GlassCard className="p-6 space-y-6">
                  <h3 className="text-lg font-semibold">
                    {editingQuiz ? "Edit Quiz" : "New Quiz"}
                  </h3>
                  
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

                        {/* Image URL */}
                        <div>
                          <Label className="flex items-center gap-2">
                            <Image className="w-4 h-4" />
                            Image URL (optional)
                          </Label>
                          <Input
                            value={q.image_url}
                            onChange={(e) => updateQuestion(qIndex, "image_url", e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="mt-1.5"
                          />
                          {q.image_url && (
                            <img 
                              src={q.image_url} 
                              alt="Preview" 
                              className="mt-2 h-24 rounded-lg object-contain bg-muted/50"
                            />
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

                  <Button 
                    variant="gradient" 
                    size="lg" 
                    onClick={editingQuiz ? handleUpdateQuiz : handleCreateQuiz} 
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingQuiz ? "Update Quiz" : "Create Quiz"}
                  </Button>
                </GlassCard>
              )}

              {/* Existing Quizzes */}
              <div>
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
                          <div className="flex items-center justify-between flex-wrap gap-3">
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
                                onClick={() => handleEditQuiz(quiz)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
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
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Question Reports</h2>
                <p className="text-muted-foreground">Review reported questions</p>
              </div>

              {reports.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No reports yet</p>
                  <p className="text-sm text-muted-foreground">Question reports will appear here</p>
                </GlassCard>
              ) : (
                <StaggerContainer staggerDelay={0.05} className="space-y-3">
                  {reports.map((report) => (
                    <StaggerItem key={report.id}>
                      <GlassCard className={`p-4 ${report.status === "resolved" ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                report.status === "resolved" 
                                  ? "bg-success/20 text-success" 
                                  : "bg-warning/20 text-warning"
                              }`}>
                                {report.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                by {report.user_name}
                              </span>
                            </div>
                            <p className="font-medium text-sm mb-1">{report.question_text}</p>
                            <p className="text-sm text-muted-foreground">{report.issue}</p>
                          </div>
                          {report.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveReport(report.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </GlassCard>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-muted-foreground">Manage user points</p>
              </div>

              <div className="relative">
                <Input
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="pl-10"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>

              <StaggerContainer staggerDelay={0.03} className="space-y-2">
                {filteredUsers.map((user) => (
                  <StaggerItem key={user.id}>
                    <GlassCard 
                      hover 
                      className="p-4 cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20">
                          <Zap className="w-4 h-4 text-primary" />
                          <span className="font-bold">{user.points.toLocaleString()}</span>
                        </div>
                      </div>
                    </GlassCard>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>

      {/* User Points Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Adjust Points for {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedUser?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-lg">
                  {selectedUser?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current: {selectedUser?.points.toLocaleString()} points
                </p>
              </div>
            </div>
            
            <div>
              <Label>Points Amount</Label>
              <Input
                type="number"
                value={pointsToAdjust}
                onChange={(e) => setPointsToAdjust(e.target.value)}
                placeholder="Enter amount..."
                className="mt-1.5"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="border-success text-success hover:bg-success/10"
                onClick={() => adjustUserPoints(true)}
                disabled={adjustingPoints}
              >
                {adjustingPoints ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Points
              </Button>
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => adjustUserPoints(false)}
                disabled={adjustingPoints}
              >
                {adjustingPoints ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Remove Points
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AdminPage;
