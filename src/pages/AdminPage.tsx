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
  Loader2,
  Calendar,
  Clock,
  Skull,
  FileText,
  Sparkles
} from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
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
  is_important: boolean;
}

interface Quiz {
  id: string;
  name: string;
  description: string;
  subject: string;
  total_questions: number;
  is_active: boolean;
  created_at: string;
  scheduled_at: string | null;
  banner_url: string | null;
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
  const [quizBannerUrl, setQuizBannerUrl] = useState("");
  const [publishOption, setPublishOption] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Questions
  const [questions, setQuestions] = useState<QuestionForm[]>([{
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    hint: "",
    difficulty: "medium",
    image_url: "",
    is_important: false,
  }]);
  
  // Creation mode dialog
  const [showCreationModeDialog, setShowCreationModeDialog] = useState(false);
  const [creationMode, setCreationMode] = useState<"normal" | "autoparse">("normal");
  const [autoParseText, setAutoParseText] = useState("");

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
      is_important: false,
    }]);
  };
  
  // Auto-parse quiz text
  const parseAutoQuizText = (text: string): QuestionForm[] => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];
    
    const totalQuestions = parseInt(lines[0]);
    if (isNaN(totalQuestions)) {
      toast.error("First line should be the total number of questions");
      return [];
    }
    
    const parsedQuestions: QuestionForm[] = [];
    let lineIndex = 1;
    
    for (let q = 0; q < totalQuestions && lineIndex < lines.length; q++) {
      try {
        const questionText = lines[lineIndex++] || "";
        const optionA = lines[lineIndex++] || "";
        const optionB = lines[lineIndex++] || "";
        const optionC = lines[lineIndex++] || "";
        const optionD = lines[lineIndex++] || "";
        const correctLetter = (lines[lineIndex++] || "A").toUpperCase();
        const hint = lines[lineIndex++] || "";
        const difficulty = (lines[lineIndex++] || "medium").toLowerCase();
        const isImportant = (lines[lineIndex++] || "no").toLowerCase() === "yes";
        const hasImage = (lines[lineIndex++] || "no").toLowerCase() === "yes";
        const imageUrl = hasImage ? (lines[lineIndex++] || "") : "";
        if (!hasImage) lineIndex--; // Don't skip extra line if no image
        lineIndex++; // Move to next question
        
        const correctAnswer = ["A", "B", "C", "D"].indexOf(correctLetter);
        
        parsedQuestions.push({
          question: questionText,
          options: [optionA, optionB, optionC, optionD],
          correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
          hint: hint,
          difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
          image_url: imageUrl === "null" ? "" : imageUrl,
          is_important: isImportant,
        });
      } catch (e) {
        console.error("Error parsing question", q + 1, e);
      }
    }
    
    return parsedQuestions;
  };
  
  const handleAutoParseQuiz = () => {
    const parsed = parseAutoQuizText(autoParseText);
    if (parsed.length === 0) {
      toast.error("Could not parse any questions. Check the format.");
      return;
    }
    setQuestions(parsed);
    setCreationMode("normal");
    setAutoParseText("");
    toast.success(`Parsed ${parsed.length} questions successfully!`);
  };
  
  const openCreationModeDialog = () => {
    setShowCreationModeDialog(true);
  };
  
  const handleCreationModeSelect = (mode: "normal" | "autoparse") => {
    setShowCreationModeDialog(false);
    if (mode === "normal") {
      setShowCreateQuiz(true);
      setCreationMode("normal");
    } else {
      setShowCreateQuiz(true);
      setCreationMode("autoparse");
    }
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

  // Convert IST to UTC for storage
  const getScheduledAtUTC = () => {
    if (publishOption === "now" || !scheduledDate || !scheduledTime) {
      return null;
    }
    // Create datetime in IST (GMT+5:30) and convert to UTC
    const istDateTime = new Date(`${scheduledDate}T${scheduledTime}:00+05:30`);
    return istDateTime.toISOString();
  };

  // Convert UTC to IST for display
  const formatToIST = (utcString: string | null) => {
    if (!utcString) return null;
    const date = new Date(utcString);
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
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

    if (publishOption === "schedule" && (!scheduledDate || !scheduledTime)) {
      toast.error("Please select a date and time for scheduling");
      return;
    }

    try {
      const scheduledAt = getScheduledAtUTC();
      
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          name: quizName,
          description: quizDescription,
          subject: quizSubject,
          total_questions: questions.length,
          created_by: profile?.id,
          banner_url: quizBannerUrl || null,
          scheduled_at: scheduledAt,
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
            is_important: q.is_important,
          }))
        );

      if (questionsError) throw questionsError;

      toast.success(scheduledAt ? `Quiz scheduled for ${formatToIST(scheduledAt)} IST` : "Quiz created successfully!");
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
    setQuizBannerUrl(quiz.banner_url || "");
    
    // Set scheduling fields
    if (quiz.scheduled_at) {
      setPublishOption("schedule");
      const istDate = new Date(quiz.scheduled_at);
      const istOffset = istDate.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(", ")[0];
      const istTime = istDate.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
      setScheduledDate(istOffset);
      setScheduledTime(istTime);
    } else {
      setPublishOption("now");
      setScheduledDate("");
      setScheduledTime("");
    }
    
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
        is_important: (q as any).is_important || false,
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

    if (publishOption === "schedule" && (!scheduledDate || !scheduledTime)) {
      toast.error("Please select a date and time for scheduling");
      return;
    }

    try {
      const scheduledAt = getScheduledAtUTC();
      
      // Update quiz
      await supabase
        .from("quizzes")
        .update({
          name: quizName,
          description: quizDescription,
          subject: quizSubject,
          total_questions: questions.length,
          banner_url: quizBannerUrl || null,
          scheduled_at: scheduledAt,
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
            is_important: q.is_important,
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
    setQuizBannerUrl("");
    setPublishOption("now");
    setScheduledDate("");
    setScheduledTime("");
    setQuestions([{
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hint: "",
      difficulty: "medium",
      image_url: "",
      is_important: false,
    }]);
    setShowCreateQuiz(false);
    setEditingQuiz(null);
    setCreationMode("normal");
    setAutoParseText("");
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
                      openCreationModeDialog();
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
              
              {/* Creation Mode Dialog */}
              <Dialog open={showCreationModeDialog} onOpenChange={setShowCreationModeDialog}>
                <DialogContent className="glass-card max-w-md">
                  <DialogHeader>
                    <DialogTitle>Choose Creation Mode</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 mt-4">
                    <GlassCard 
                      hover 
                      className="p-4 cursor-pointer"
                      onClick={() => handleCreationModeSelect("normal")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/20">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Normal Mode</h4>
                          <p className="text-sm text-muted-foreground">Add questions one by one with full control</p>
                        </div>
                      </div>
                    </GlassCard>
                    <GlassCard 
                      hover 
                      className="p-4 cursor-pointer"
                      onClick={() => handleCreationModeSelect("autoparse")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-warning/20">
                          <Sparkles className="w-6 h-6 text-warning" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Auto-Parse Mode</h4>
                          <p className="text-sm text-muted-foreground">Paste formatted text and auto-parse questions</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </DialogContent>
              </Dialog>

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

                  {/* Banner Upload */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Quiz Banner (optional)
                    </Label>
                    <div className="mt-2">
                      <ImageUpload
                        currentUrl={quizBannerUrl}
                        onUpload={setQuizBannerUrl}
                        folder="quiz-banners"
                        aspectRatio="wide"
                      />
                    </div>
                  </div>

                  {/* Publish Options */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Publish Options
                    </Label>
                    
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="publishOption"
                          value="now"
                          checked={publishOption === "now"}
                          onChange={() => setPublishOption("now")}
                          className="w-4 h-4 accent-primary"
                        />
                        <span>Post Now</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="publishOption"
                          value="schedule"
                          checked={publishOption === "schedule"}
                          onChange={() => setPublishOption("schedule")}
                          className="w-4 h-4 accent-primary"
                        />
                        <span>Schedule for Later</span>
                      </label>
                    </div>

                    {publishOption === "schedule" && (
                      <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl bg-muted/50 border border-border">
                        <div>
                          <Label className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date (IST)
                          </Label>
                          <Input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Time (IST)
                          </Label>
                          <Input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="mt-1.5"
                          />
                        </div>
                        <p className="md:col-span-2 text-xs text-muted-foreground">
                          Timezone: Indian Standard Time (GMT+5:30)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Questions */}
                  <div className="space-y-4">
                    {creationMode === "autoparse" && !editingQuiz ? (
                      <>
                        {/* Auto-Parse Mode */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-warning" />
                              Auto-Parse Questions
                            </h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCreationMode("normal")}
                            >
                              Switch to Normal
                            </Button>
                          </div>
                          
                          <div className="p-4 rounded-xl bg-muted/50 border border-border">
                            <p className="text-sm text-muted-foreground mb-3">
                              Paste your quiz text in the following format:
                            </p>
                            <pre className="text-xs bg-card p-3 rounded-lg overflow-x-auto mb-3 text-muted-foreground">
{`25 (total questions)
What is the capital of India? (question)
New Delhi (option A)
Mumbai (option B)
Kolkata (option C)
Chennai (option D)
A (correct answer)
Read geography chapter 1 (hint)
easy (difficulty: easy/medium/hard)
yes (is important: yes/no)
no (has image: yes/no)
null (image URL if has image is yes)`}
                            </pre>
                          </div>
                          
                          <Textarea
                            value={autoParseText}
                            onChange={(e) => setAutoParseText(e.target.value)}
                            placeholder="Paste your formatted quiz text here..."
                            className="min-h-[300px] font-mono text-sm"
                          />
                          
                          <Button 
                            variant="gradient" 
                            onClick={handleAutoParseQuiz}
                            disabled={!autoParseText.trim()}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Parse Questions
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Normal Mode */}
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Questions ({questions.length})</h4>
                          <div className="flex gap-2">
                            {!editingQuiz && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCreationMode("autoparse")}
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                Auto-Parse
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={addQuestion}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Question
                            </Button>
                          </div>
                        </div>

                        {questions.map((q, qIndex) => (
                          <GlassCard key={qIndex} className={`p-4 space-y-4 ${q.is_important ? 'border-destructive/50' : ''}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Label>Question {qIndex + 1}</Label>
                                  {q.is_important && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                                      <Skull className="w-3 h-3" />
                                      Important
                                    </span>
                                  )}
                                </div>
                                <Textarea
                                  value={q.question}
                                  onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                                  placeholder="Enter your question..."
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

                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <Label>Hint (optional)</Label>
                                <Input
                                  value={q.hint}
                                  onChange={(e) => updateQuestion(qIndex, "hint", e.target.value)}
                                  placeholder="Hint for students..."
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
                              <div>
                                <Label className="flex items-center gap-1">
                                  <Skull className="w-4 h-4 text-destructive" />
                                  Important
                                </Label>
                                <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={q.is_important}
                                    onChange={(e) => updateQuestion(qIndex, "is_important", e.target.checked)}
                                    className="w-4 h-4 accent-destructive"
                                  />
                                  <span className="text-sm">Exam Mein Ayega</span>
                                </label>
                              </div>
                            </div>
                          </GlassCard>
                        ))}
                      </>
                    )}
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
                    {quizzes.map((quiz) => {
                      const isScheduled = quiz.scheduled_at && new Date(quiz.scheduled_at) > new Date();
                      const scheduledTimeIST = quiz.scheduled_at 
                        ? new Date(quiz.scheduled_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                        : null;
                      
                      return (
                        <StaggerItem key={quiz.id}>
                          <GlassCard className="p-4">
                            {/* Banner preview if exists */}
                            {quiz.banner_url && (
                              <div className="mb-3 rounded-lg overflow-hidden aspect-[16/9] max-h-32">
                                <img 
                                  src={quiz.banner_url} 
                                  alt={quiz.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                  isScheduled ? "bg-warning/20" : quiz.is_active ? "bg-success/20" : "bg-muted"
                                }`}>
                                  {isScheduled ? (
                                    <Clock className={`w-5 h-5 text-warning`} />
                                  ) : (
                                    <BookOpen className={`w-5 h-5 ${quiz.is_active ? "text-success" : "text-muted-foreground"}`} />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium flex items-center gap-2">
                                    {quiz.name}
                                    {isScheduled && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                                        Scheduled
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {quiz.subject} • {quiz.total_questions} questions
                                    {scheduledTimeIST && isScheduled && (
                                      <span className="ml-1">• Posts on {scheduledTimeIST} IST</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {isScheduled && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/quiz?preview=${quiz.id}`)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Preview
                                  </Button>
                                )}
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
                      );
                    })}
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
