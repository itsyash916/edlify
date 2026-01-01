import { useState, useCallback } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  points: number;
  streak: number;
  totalStudyMinutes: number;
  quizzesCompleted: number;
  doubtsAnswered: number;
  badges: string[];
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string;
  points: number;
  streak: number;
  rankChange?: "up" | "down" | "same";
}

export interface Doubt {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  question: string;
  imageUrl?: string;
  bounty: number;
  subject: string;
  createdAt: Date;
  answersCount: number;
  solved: boolean;
}

// Mock user data
const mockUser: User = {
  id: "user-1",
  email: "student@edlify.com",
  name: "Aryan Kumar",
  avatarUrl: "",
  points: 2450,
  streak: 7,
  totalStudyMinutes: 1240,
  quizzesCompleted: 45,
  doubtsAnswered: 12,
  badges: ["speed-demon", "consistent-learner", "early-bird"],
  createdAt: new Date("2024-01-15"),
};

// Mock questions
const mockQuestions: QuizQuestion[] = [
  {
    id: "q1",
    subject: "Mathematics",
    chapter: "Quadratic Equations",
    question: "If the roots of the equation x² - 5x + k = 0 are α and β such that α - β = 1, then find the value of k.",
    options: ["4", "5", "6", "7"],
    correctAnswer: 2,
    difficulty: "medium",
  },
  {
    id: "q2",
    subject: "Science",
    chapter: "Chemical Reactions",
    question: "Which of the following is an example of a double displacement reaction?",
    options: [
      "2H₂ + O₂ → 2H₂O",
      "AgNO₃ + NaCl → AgCl + NaNO₃",
      "2Mg + O₂ → 2MgO",
      "CaCO₃ → CaO + CO₂"
    ],
    correctAnswer: 1,
    difficulty: "easy",
  },
  {
    id: "q3",
    subject: "Mathematics",
    chapter: "Arithmetic Progressions",
    question: "The 10th term of the AP 2, 7, 12, ... is:",
    options: ["45", "47", "49", "52"],
    correctAnswer: 1,
    difficulty: "easy",
  },
  {
    id: "q4",
    subject: "Science",
    chapter: "Electricity",
    question: "A wire of resistance 12Ω is bent to form a circle. The effective resistance between two points on any diameter is:",
    options: ["3Ω", "6Ω", "12Ω", "24Ω"],
    correctAnswer: 0,
    difficulty: "hard",
  },
  {
    id: "q5",
    subject: "English",
    chapter: "Grammar",
    question: "Choose the correct form: Neither of the students ____ present.",
    options: ["are", "were", "was", "have been"],
    correctAnswer: 2,
    difficulty: "medium",
  },
];

// Mock leaderboard
const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: "u1", name: "Priya Sharma", avatarUrl: "", points: 5240, streak: 21, rankChange: "same" },
  { rank: 2, userId: "u2", name: "Rahul Verma", avatarUrl: "", points: 4890, streak: 15, rankChange: "up" },
  { rank: 3, userId: "u3", name: "Ananya Gupta", avatarUrl: "", points: 4520, streak: 18, rankChange: "down" },
  { rank: 4, userId: "u4", name: "Vikram Singh", avatarUrl: "", points: 3980, streak: 12, rankChange: "up" },
  { rank: 5, userId: "user-1", name: "Aryan Kumar", avatarUrl: "", points: 2450, streak: 7, rankChange: "up" },
  { rank: 6, userId: "u5", name: "Sneha Reddy", avatarUrl: "", points: 2340, streak: 9, rankChange: "down" },
  { rank: 7, userId: "u6", name: "Aditya Joshi", avatarUrl: "", points: 2180, streak: 5, rankChange: "same" },
  { rank: 8, userId: "u7", name: "Kavya Nair", avatarUrl: "", points: 1950, streak: 11, rankChange: "up" },
  { rank: 9, userId: "u8", name: "Rohan Patel", avatarUrl: "", points: 1820, streak: 4, rankChange: "down" },
  { rank: 10, userId: "u9", name: "Meera Iyer", avatarUrl: "", points: 1650, streak: 8, rankChange: "same" },
];

// Mock doubts
const mockDoubts: Doubt[] = [
  {
    id: "d1",
    userId: "u2",
    userName: "Rahul Verma",
    userAvatar: "",
    question: "How do I solve quadratic equations using the completing the square method? I always get confused with the steps.",
    bounty: 500,
    subject: "Mathematics",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    answersCount: 3,
    solved: false,
  },
  {
    id: "d2",
    userId: "u3",
    userName: "Ananya Gupta",
    userAvatar: "",
    question: "What's the difference between ionic and covalent bonds? Can someone explain with examples?",
    bounty: 100,
    subject: "Science",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    answersCount: 7,
    solved: true,
  },
  {
    id: "d3",
    userId: "u5",
    userName: "Sneha Reddy",
    userAvatar: "",
    question: "Can anyone explain the poem 'The Ball Poem' by John Berryman? What is the central theme?",
    bounty: 1000,
    subject: "English",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    answersCount: 1,
    solved: false,
  },
];

export const useAppStore = () => {
  const [user, setUser] = useState<User>(mockUser);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const updatePoints = useCallback((points: number) => {
    setUser(prev => ({ ...prev, points: prev.points + points }));
  }, []);

  const updateStreak = useCallback((streak: number) => {
    setUser(prev => ({ ...prev, streak }));
  }, []);

  const addStudyMinutes = useCallback((minutes: number) => {
    setUser(prev => ({ ...prev, totalStudyMinutes: prev.totalStudyMinutes + minutes }));
  }, []);

  return {
    user,
    isAuthenticated,
    updatePoints,
    updateStreak,
    addStudyMinutes,
  };
};

export const getQuestions = () => mockQuestions;
export const getLeaderboard = () => mockLeaderboard;
export const getDoubts = () => mockDoubts;
