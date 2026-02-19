import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Users,
  Settings,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "../../components/ui/Sheet";
import * as XLSX from "xlsx";
import { CandidateTable } from "../../components/Admin/CandidateTable";

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

// Temporary interviewer names list
const INTERVIEWER_NAMES = [
  "Rahul Sharma",
  "Priya Patel",
  "Amit Kumar",
  "Sneha Gupta",
  "Vikram Singh",
  "Anjali Verma",
  "Rajesh Nair",
];

const HRDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [roundModalCandidate, setRoundModalCandidate] = useState(null);
  const [roundDataMap, setRoundDataMap] = useState(new Map());
  const [roundNotes, setRoundNotes] = useState({});
  const [savedRounds, setSavedRounds] = useState({});
  const [interviewers, setInterviewers] = useState({});
  const [droppedRounds, setDroppedRounds] = useState({});

  // Filter sheet state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [roundFilters, setRoundFilters] = useState([]); // Multiple rounds can be selected
  const [roundStatusFilter, setRoundStatusFilter] = useState('all');
  const [r3StatusFilter, setR3StatusFilter] = useState('all');
  const [sortField, setSortField] = useState('newest');
  const [sortDirection, setSortDirection] = useState('desc');
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // 🔥 REAL DATA STATE
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔥 REAL-TIME STATE
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [newDataCount, setNewDataCount] = useState(0);
  const previousCountRef = useRef(0);

  // 🔥 FETCH DATA FROM FINAL API (use provided details endpoint, request many)
  const fetchCandidates = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }

      // Base URL without /api suffix - external API doesn't use /api prefix
      const configured =
        import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        "https://tecnoprismmainbackend.onrender.com";

      const base = configured.replace(/\/+$/g, "").replace(/\/api$/, "");

      // Also fetch from local candidate-details API
      const localApiBase = configured.endsWith("/api")
        ? configured
        : `${configured}/api`;

      // Fetch local registered candidates
      let localCandidates = [];
      try {
        const localRes = await fetch(`${localApiBase}/candidate-details`);
        if (localRes.ok) {
          const localJson = await localRes.json();
          localCandidates = localJson.data || [];
        }
      } catch (localErr) {
        console.warn("Failed to fetch local candidates:", localErr);
      }

      const candidatesUrls = [
        // Primary endpoints (external API structure)
        `${base}/details`,
        `${base}/time-details/all`,
      ];

      let res = null;
      let lastError = null;
      for (const url of candidatesUrls) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            res = r;
            break;
          }
          lastError = new Error(`Status ${r.status} from ${url}`);
        } catch (err) {
          lastError = err;
        }
      }

      // If external API fails, use local candidates only
      let list = [];
      if (res) {
        const json = await res.json();
        list = json.data || json;
      }

      // Merge local candidates into the list
      localCandidates.forEach((localCandidate) => {
        const exists = list.some(
          (item) =>
            (item.email || item["Email Address"] || "").toLowerCase() ===
            localCandidate.email?.toLowerCase(),
        );
        if (!exists) {
          // Transform local candidate to match expected format
          list.push({
            _id: localCandidate._id,
            uniqueId: localCandidate.uniqueId,
            "Full Name": `${localCandidate.firstName} ${localCandidate.lastName}`,
            "Email Address": localCandidate.email,
            "Phone number": localCandidate.phone,
            "Preferred Location": localCandidate.preferredLocation,
            "Are you wiling to relocate?": localCandidate.willingToRelocate,
            "Notice Period": localCandidate.noticePeriod,
            Skills: Array.isArray(localCandidate.skills)
              ? localCandidate.skills.join(", ")
              : localCandidate.skills,
            "Current Designation": localCandidate.currentDesignation,
            "Current CTC": localCandidate.currentCTC,
            "Total Experience (Years)": localCandidate.totalExperience,
            "Experience [GenAI]": localCandidate.experienceLevels?.genai || "",
            "Experience [Python]":
              localCandidate.experienceLevels?.python || "",
            "Experience [RPA]": localCandidate.experienceLevels?.rpa || "",
            Resume: localCandidate.documents?.resume || "",
            Photo: localCandidate.documents?.photo || "",
            "Aadhar Card": localCandidate.documents?.idProof || "",
            Payslip: localCandidate.documents?.payslips || "",
            "Last Breakup": localCandidate.documents?.lastBreakup || "",
            examStatus: localCandidate.examStatus || "not_started",
            score: localCandidate.examScore,
            createdAt: localCandidate.createdAt,
            isLocalRegistration: true,
          });
        }
      });

      // Fetch round 1 quiz segregation data
      const quizUrls = [`${base}/quiz-segregate`];

      let quizRes = null;
      let quizLastErr = null;
      for (const url of quizUrls) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            quizRes = r;
            break;
          }
          quizLastErr = new Error(`Status ${r.status} from ${url}`);
        } catch (err) {
          quizLastErr = err;
        }
      }

      let quizList = [];
      if (quizRes) {
        try {
          const quizJson = await quizRes.json();
          quizList = quizJson.data || quizJson || [];
        } catch (e) {
          quizList = [];
        }
      }

      const quizMap = new Map();
      const quizMapByContact = new Map();
      const quizMapByName = new Map();
      quizList.forEach((q) => {
        const emailKey = (q.Email || q.email || q.Username || q.username || "")
          .toString()
          .toLowerCase();
        const contactKey = (q.Contact || q.contact || q.Phone || q.phone || "")
          .toString()
          .replace(/\D/g, "");
        const nameKey = (q.Name || q.name || "")
          .toString()
          .toLowerCase()
          .trim();
        if (emailKey) {
          quizMap.set(emailKey, q);
        }
        if (contactKey) {
          quizMapByContact.set(contactKey, q);
        }
        if (nameKey) {
          quizMapByName.set(nameKey, q);
        }
      });

      // Try to fetch credentials and merge by email
      const credUrls = [`${base}/user-details/credentials`];

      let credRes = null;
      let credLastErr = null;
      for (const url of credUrls) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            credRes = r;
            break;
          }
          credLastErr = new Error(`Status ${r.status} from ${url}`);
        } catch (err) {
          credLastErr = err;
        }
      }

      let credsList = [];
      if (credRes) {
        try {
          const credJson = await credRes.json();
          credsList = credJson.data || credJson || [];
        } catch (e) {
          // ignore parse error and continue without creds
          credsList = [];
        }
      }

      const credMap = new Map();
      credsList.forEach((c) => {
        const key = (
          c.Username ||
          c.username ||
          c.Email ||
          c.email ||
          c.username
        )
          ?.toString()
          .toLowerCase();
        if (key) credMap.set(key, c);
      });

      // Fetch time-details data (startTime, CompletionTime, TimeTaken)
      let timeDetailsList = [];
      try {
        const timeRes = await fetch(
          "https://tecnoprismmainbackend.onrender.com/time-details/all",
        );
        if (timeRes.ok) {
          const timeJson = await timeRes.json();
          timeDetailsList = timeJson.data || timeJson || [];
        }
      } catch (e) {
        console.warn("Failed to fetch time-details:", e);
      }

      const timeMap = new Map();
      timeDetailsList.forEach((t) => {
        const key = (t.Username || t.username || t.uniqueId || t.email || "")
          .toString()
          .toLowerCase();
        if (key) timeMap.set(key, t);
      });

      // Create formatted list and deduplicate by email
      const seenEmails = new Set();
      const formatted = [];

      list.forEach((item) => {
        const itemEmail = (
          item.email ||
          item["Email Address"] ||
          item["Email address"] ||
          item.Email ||
          item.Username ||
          ""
        )
          .toString()
          .toLowerCase();

        // Skip duplicates based on email
        if (seenEmails.has(itemEmail)) {
          return;
        }
        seenEmails.add(itemEmail);

        const cred = credMap.get(itemEmail) || {};

        // Try to find quiz data by email first, then by phone/contact, then by name
        const itemPhone = (item["Phone number"] || item.phone || "")
          .toString()
          .replace(/\D/g, "");
        const itemName = (item["Full Name"] || item.name || "")
          .toString()
          .toLowerCase()
          .trim();
        let quiz = quizMap.get(itemEmail) || {};
        if (!quiz._id && itemPhone) {
          quiz = quizMapByContact.get(itemPhone) || quiz;
        }
        if (!quiz._id && itemName) {
          quiz = quizMapByName.get(itemName) || quiz;
        }
        const timeData = timeMap.get(itemEmail) || {};

        const password = (
          cred.Password ||
          cred.password ||
          cred.pwd ||
          cred.pass ||
          cred?.userPassword ||
          ""
        ).toString();
        const username = (
          cred.Username ||
          cred.username ||
          cred.userName ||
          cred.name ||
          ""
        ).toString();

        // Use email as unique identifier since we've deduplicated
        const uid =
          item.uniqueId ||
          item._id ||
          itemEmail ||
          Math.random().toString(36).slice(2, 9);

        formatted.push({
          uid, // internal stable id used for keys and selection
          password: password || "",
          username: username || itemEmail || "—",
          name: (
            item["Full Name"] ||
            `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
            item.name ||
            "—"
          ).toString(),
          email:
            (
              item.email ||
              item["Email Address"] ||
              item["Email address"] ||
              item.Email ||
              ""
            ).toString() || "—",
          examStatus: item.examStatus || item.status || "not-started",
          score: item.score ?? null,
          time: item.timeTaken ?? item.time ?? "—",
          location:
            item.location?.city || item.location || item["Location"] || "—",
          preferredLocation:
            item["Preferred Location"] || item.preferredLocation || "—",
          phone: item["Phone number"] || item.phone || "—",
          photo: item["Photo"] || item.photo || "",
          resume: item["Resume"] || item.resume || "",
          aadharCard: item["Aadhar Card"] || item.aadharCard || "",
          payslip: item["Payslip"] || item.payslip || "",
          lastBreakup: item["Last Breakup"] || item.lastBreakup || "",
          skills: item["Skills"] || item.skills || "—",
          currentCTC: item["Current CTC"] || item.currentCTC || "—",
          totalExperience:
            item["Total Experience (Years)"] || item.totalExperience || "—",
          relevantExperience:
            item["Relevant Experience (Years)"] ||
            item.relevantExperience ||
            "—",
          experienceGenAI:
            item["Experience [GenAI]"] || item.experienceGenAI || "—",
          experiencePython:
            item["Experience [Python]"] || item.experiencePython || "—",
          experienceRPA: item["Experience [RPA]"] || item.experienceRPA || "—",
          noticePeriod: item["Notice Period"] || item.noticePeriod || "—",
          willingToRelocate:
            item["Are you wiling to relocate?"] ||
            item.willingToRelocate ||
            "—",
          designation:
            item["Current Designation"] ||
            item["Designation"] ||
            item.designation ||
            "—",
          completionTime:
            timeData.CompletionTime ||
            item["Completion Time"] ||
            item.completionTime ||
            "—",
          startTime:
            timeData.startTime || item["Start Time"] || item.startTime || "—",
          timeTakenInTest:
            timeData.TimeTaken ||
            item["Time taken in Test"] ||
            item.timeTakenInTest ||
            "—",
          quiz,
          raw: item,
          credentials: cred,
          timeDetails: timeData,
        });
      });

      // Track new candidates
      const newCount = formatted.length - previousCountRef.current;
      if (previousCountRef.current > 0 && newCount > 0) {
        setNewDataCount(newCount);
        // Clear the new data notification after 5 seconds
        setTimeout(() => setNewDataCount(0), 5000);
      }
      previousCountRef.current = formatted.length;

      setCandidates(formatted);
      setRoundDataMap(quizMap);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      if (!candidates.length) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const intervalId = setInterval(() => {
      fetchCandidates(false);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, fetchCandidates]);

  // Auto-refresh modal data when modal is open (for real-time collaboration)
  useEffect(() => {
    if (!roundModalOpen || !roundModalCandidate || !autoRefreshEnabled) return;

    const refreshModalData = async () => {
      const freshQuizData = await fetchQuizDataByEmail(
        roundModalCandidate.email,
        roundModalCandidate.name,
        roundModalCandidate.phone,
      );
      if (freshQuizData) {
        setRoundModalCandidate((prev) =>
          prev ? { ...prev, quiz: freshQuizData } : prev,
        );
        setCandidates((prev) =>
          prev.map((c) =>
            c.uid === roundModalCandidate.uid
              ? { ...c, quiz: freshQuizData }
              : c,
          ),
        );
        setRoundNotes((prev) => ({
          ...prev,
          [roundModalCandidate.uid]: {
            round2: getRoundNoteFromQuiz(freshQuizData, "R2"),
            round3: getRoundNoteFromQuiz(freshQuizData, "R3"),
            round4: getRoundNoteFromQuiz(freshQuizData, "R4"),
          },
        }));
      }
    };

    const modalIntervalId = setInterval(
      refreshModalData,
      AUTO_REFRESH_INTERVAL,
    );
    return () => clearInterval(modalIntervalId);
  }, [roundModalOpen, roundModalCandidate?.uid, autoRefreshEnabled]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchCandidates(true);
  };

  // Handle sort field change
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setRoundFilters([]);
    setRoundStatusFilter('all');
    setR3StatusFilter('all');
    setSortField('newest');
    setSortDirection('desc');
  };

  // Toggle round filter (multi-select)
  const toggleRoundFilter = (round) => {
    setRoundFilters(prev => {
      if (prev.includes(round)) {
        const newFilters = prev.filter(r => r !== round);
        // Reset R3 status if R3 is unchecked
        if (round === 'R3') {
          setR3StatusFilter('all');
        }
        return newFilters;
      } else {
        return [...prev, round];
      }
    });
  };

  // Check if any filter is active
  const hasActiveFilters = statusFilter !== 'all' || roundFilters.length > 0 || roundStatusFilter !== 'all' || r3StatusFilter !== 'all' || sortField !== 'newest' || sortDirection !== 'desc';

  const filteredCandidates = candidates.filter((candidate) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      candidate.name.toLowerCase().includes(q) ||
      candidate.email.toLowerCase().includes(q) ||
      (candidate.uid && String(candidate.uid).toLowerCase().includes(q)) ||
      (candidate.username && candidate.username.toLowerCase().includes(q)) ||
      (candidate.displayedId &&
        String(candidate.displayedId).toLowerCase().includes(q)) ||
      (candidate.password &&
        String(candidate.password).toLowerCase().includes(q));

    const matchesFilter =
      filterStatus === "all" || candidate.examStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusStyle = (status) => {
    const base = {
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
    };

    switch (status) {
      case "present":
        return { ...base, background: "#d1fae5", color: "#065f46" };
      case "completed":
        return { ...base, background: "#d1fae5", color: "#065f46" };
      case "in-progress":
        return { ...base, background: "#dbeafe", color: "#1e40af" };
      case "absent":
        return { ...base, background: "#fee2e2", color: "#991b1b" };
      default:
        return { ...base, background: "#f3f4f6", color: "#4b5563" };
    }
  };

  const getAttendanceStatus = (candidate) => {
    const qrValue = candidate?.credentials?.qr;
    if (qrValue === true) return "present";
    if (qrValue === false) return "absent";
    return candidate.examStatus || "not-started";
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  const getRoundNoteFromQuiz = (quiz, apiKey) => {
    if (!quiz || !apiKey) return { rating: "", comments: "" };

    // Try multiple key variations
    const raw =
      quiz[apiKey] || quiz[apiKey.toLowerCase()] || quiz[apiKey.toUpperCase()];

    if (Array.isArray(raw) && raw.length > 0 && raw[0]) {
      const result = {
        rating: raw[0].rating ?? "",
        comments: raw[0].comments ?? raw[0].comment ?? "",
      };
      return result;
    }

    // Handle case where raw is an object directly (not an array)
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return {
        rating: raw.rating ?? "",
        comments: raw.comments ?? raw.comment ?? "",
      };
    }

    return { rating: "", comments: "" };
  };

  // Fetch quiz data by name, contact and email from API
  const fetchQuizDataByEmail = async (email, name = "", contact = "") => {
    if (!email || email === "—" || email === "-") {
      return null;
    }

    const emailToFetch = email.trim().toLowerCase();
    const nameToFetch = name && name !== "—" && name !== "-" ? name.trim() : "";
    const contactToFetch =
      contact && contact !== "—" && contact !== "-"
        ? contact.toString().replace(/\D/g, "")
        : "";

    try {
      // Build query params - only include non-empty values
      const params = new URLSearchParams();
      if (nameToFetch) params.append("name", nameToFetch);
      if (contactToFetch) params.append("contact", contactToFetch);
      params.append("email", emailToFetch);

      const url = `https://tecnoprismmainbackend.onrender.com/quiz-segregate?${params.toString()}`;

      const response = await fetch(url);

      if (response.ok) {
        const json = await response.json();

        if (json.data && json.data.length > 0) {
          return json.data[0];
        }
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch quiz data by email:", e);
      return null;
    }
  };

  // Loading state for modal
  const [modalLoading, setModalLoading] = useState(false);

  const openRoundModal = async (candidate) => {
    setRoundModalCandidate(candidate);
    setRoundModalOpen(true);
    setModalLoading(true);

    // Clear any existing cached round notes for this candidate to force fresh data
    setRoundNotes((prev) => {
      const newNotes = { ...prev };
      delete newNotes[candidate.uid];
      return newNotes;
    });

    try {
      // Try multiple email sources - candidate.email, quiz.Email, raw.email, etc.
      let emailToUse = "";

      // Check various email sources
      if (
        candidate.email &&
        candidate.email !== "—" &&
        candidate.email !== "-"
      ) {
        emailToUse = candidate.email;
      } else if (candidate.quiz?.Email) {
        emailToUse = candidate.quiz.Email;
      } else if (candidate.quiz?.email) {
        emailToUse = candidate.quiz.email;
      } else if (candidate.raw?.email) {
        emailToUse = candidate.raw.email;
      } else if (candidate.raw?.Email) {
        emailToUse = candidate.raw.Email;
      } else if (candidate.raw?.["Email address"]) {
        emailToUse = candidate.raw["Email address"];
      } else if (candidate.username && candidate.username.includes("@")) {
        emailToUse = candidate.username;
      }

      if (!emailToUse) {
        setModalLoading(false);
        return;
      }

      // Fetch fresh quiz data from API
      const freshQuizData = await fetchQuizDataByEmail(
        emailToUse,
        candidate.name,
        candidate.phone,
      );

      if (freshQuizData) {
        // Update the candidate's quiz data with fresh data
        const updatedCandidate = { ...candidate, quiz: freshQuizData };
        setRoundModalCandidate(updatedCandidate);

        // Also update in the main candidates list
        setCandidates((prev) =>
          prev.map((c) =>
            c.uid === candidate.uid ? { ...c, quiz: freshQuizData } : c,
          ),
        );

        // Set round notes from fresh data - always overwrite
        const newRoundNotes = {
          round2: getRoundNoteFromQuiz(freshQuizData, "R2"),
          round3: getRoundNoteFromQuiz(freshQuizData, "R3"),
          round4: getRoundNoteFromQuiz(freshQuizData, "R4"),
        };

        setRoundNotes((prev) => ({
          ...prev,
          [candidate.uid]: newRoundNotes,
        }));
      } else {
        // Fallback to existing data
        const quiz = candidate.quiz || {};
        setRoundNotes((prev) => ({
          ...prev,
          [candidate.uid]: {
            round2: getRoundNoteFromQuiz(quiz, "R2"),
            round3: getRoundNoteFromQuiz(quiz, "R3"),
            round4: getRoundNoteFromQuiz(quiz, "R4"),
          },
        }));
      }
    } catch (e) {
      console.error("Error fetching quiz data:", e);
      // Fallback to existing data
      const quiz = candidate.quiz || {};
      setRoundNotes((prev) => ({
        ...prev,
        [candidate.uid]: {
          round2: getRoundNoteFromQuiz(quiz, "R2"),
          round3: getRoundNoteFromQuiz(quiz, "R3"),
          round4: getRoundNoteFromQuiz(quiz, "R4"),
        },
      }));
    } finally {
      setModalLoading(false);
    }
  };

  const closeRoundModal = () => {
    setRoundModalOpen(false);
    setRoundModalCandidate(null);
  };

  const updateRoundNotes = (uid, roundKey, field, value) => {
    setRoundNotes((prev) => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || {}),
        [roundKey]: {
          ...((prev[uid] || {})[roundKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  const saveRoundNotes = async (roundKey) => {
    try {
      const candidate = roundModalCandidate;
      if (!candidate?.email) {
        setError("Candidate email is missing.");
        return;
      }

      const uid = candidate.uid;
      const notes = roundNotes[uid] || {};
      const quiz = candidate.quiz || {};

      const r2 = notes.round2 || getRoundNoteFromQuiz(quiz, "R2");
      const r3 = notes.round3 || getRoundNoteFromQuiz(quiz, "R3");
      const r4 = notes.round4 || getRoundNoteFromQuiz(quiz, "R4");

      const payload = {
        email: candidate.email,
        R2:
          r2.rating || r2.comments
            ? [
                {
                  rating: String(r2.rating || ""),
                  comments: String(r2.comments || ""),
                },
              ]
            : [],
        R3:
          r3.rating || r3.comments
            ? [
                {
                  rating: String(r3.rating || ""),
                  comments: String(r3.comments || ""),
                },
              ]
            : [],
        R4:
          r4.rating || r4.comments
            ? [
                {
                  rating: String(r4.rating || ""),
                  comments: String(r4.comments || ""),
                },
              ]
            : [],
        Logical: String(quiz.Logical ?? quiz.logical ?? ""),
        GenAI: String(quiz.GenAI ?? quiz.genai ?? ""),
        Python: String(quiz.Python ?? quiz.python ?? ""),
        RPA: String(quiz.RPA ?? quiz.rpa ?? ""),
        Database: String(quiz.Database ?? quiz.database ?? ""),
        Communication: String(quiz.Communication ?? quiz.communication ?? ""),
        "Final Score": String(quiz["Final Score"] ?? quiz.finalScore ?? ""),
      };

      const response = await fetch(
        "https://tecnoprismmainbackend.onrender.com/quiz-segregate/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save round data");
      }

      setError("");

      // Mark this round as saved
      setSavedRounds((prev) => ({
        ...prev,
        [`${uid}-${roundKey}`]: true,
      }));

      // Reset saved status after 3 seconds
      setTimeout(() => {
        setSavedRounds((prev) => ({
          ...prev,
          [`${uid}-${roundKey}`]: false,
        }));
      }, 3000);

      const updatedQuiz = {
        ...quiz,
        R2: payload.R2,
        R3: payload.R3,
        R4: payload.R4,
      };

      setRoundModalCandidate((prev) =>
        prev ? { ...prev, quiz: updatedQuiz } : prev,
      );
      setCandidates((prev) =>
        prev.map((c) => (c.uid === uid ? { ...c, quiz: updatedQuiz } : c)),
      );
    } catch (err) {
      console.error("Failed to save round data:", err);
      setError("Failed to save round data. Please try again.");
    }
  };

  // Calculate stats
  // Count candidates who have completed ALL rounds (R1, R2, R3, R4 status = completed)
  const getAllRoundsCompletedCount = () => {
    return candidates.filter((c) => {
      // Check if R1 is completed (has a score)
      const r1Completed =
        c.quiz?.["Final Score"] && parseInt(c.quiz["Final Score"]) > 0;

      // Check R2, R3, R4 status
      const r2Status = c.quiz?.R2?.[0]?.status?.toLowerCase();
      const r3Status = c.quiz?.R3?.[0]?.status?.toLowerCase();
      const r4Status = c.quiz?.R4?.[0]?.status?.toLowerCase();

      return (
        r1Completed &&
        r2Status === "completed" &&
        r3Status === "completed" &&
        r4Status === "completed"
      );
    }).length;
  };

  // Count candidates with any round marked as 'drop'
  const getDroppedCount = () => {
    return candidates.filter((c) => {
      const r2Status = c.quiz?.R2?.[0]?.status?.toLowerCase();
      const r3Status = c.quiz?.R3?.[0]?.status?.toLowerCase();
      const r4Status = c.quiz?.R4?.[0]?.status?.toLowerCase();

      return r2Status === "drop" || r3Status === "drop" || r4Status === "drop";
    }).length;
  };

  // Count candidates with any round marked as 'rejected'
  const getRejectedCount = () => {
    return candidates.filter((c) => {
      const r2Status = c.quiz?.R2?.[0]?.status?.toLowerCase();
      const r3Status = c.quiz?.R3?.[0]?.status?.toLowerCase();
      const r4Status = c.quiz?.R4?.[0]?.status?.toLowerCase();

      return (
        r2Status === "rejected" ||
        r3Status === "rejected" ||
        r4Status === "rejected"
      );
    }).length;
  };

  const stats = {
    total: candidates.length,
    completed: getAllRoundsCompletedCount(),
    present: candidates.filter((c) => getAttendanceStatus(c) === "present")
      .length,
    absent: candidates.filter((c) => getAttendanceStatus(c) === "absent")
      .length,
    dropped: getDroppedCount(),
    rejected: getRejectedCount(),
  };

  const StatCard = ({ title, value, color }) => (
    <div
      style={{
        flex: "1 1 0",
        minWidth: "140px",
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <p
        style={{
          fontSize: "12px",
          color: "#6b7280",
          fontWeight: "500",
          margin: "0 0 4px 0",
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
      <h2
        style={{ fontSize: "24px", fontWeight: "700", color: color, margin: 0 }}
      >
        {value}
      </h2>
    </div>
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/hr-login";
  };

  // Helper function to get round data from quiz
  const getRoundDataForExcel = (quiz, roundKey) => {
    if (!quiz || !quiz[roundKey])
      return { interviewer: "—", status: "—", rating: "—", comments: "—" };

    const roundData = quiz[roundKey];
    if (Array.isArray(roundData) && roundData.length > 0 && roundData[0]) {
      // For R3, use 'Managerial status' field instead of 'rating'
      const ratingValue =
        roundKey === "R3"
          ? roundData[0]["Managerial status"] || roundData[0].rating || "—"
          : roundData[0].rating || "—";
      return {
        interviewer: roundData[0].interviewer || "—",
        status: roundData[0].status || "—",
        rating: ratingValue,
        comments: roundData[0].comments || "—",
      };
    }
    if (roundData && typeof roundData === "object") {
      // For R3, use 'Managerial status' field instead of 'rating'
      const ratingValue =
        roundKey === "R3"
          ? roundData["Managerial status"] || roundData.rating || "—"
          : roundData.rating || "—";
      return {
        interviewer: roundData.interviewer || "—",
        status: roundData.status || "—",
        rating: ratingValue,
        comments: roundData.comments || "—",
      };
    }
    return { interviewer: "—", status: "—", rating: "—", comments: "—" };
  };

  // Export to Excel - Role based
  const exportToExcel = () => {
    const filteredData = filteredCandidates;
    const userRole = localStorage.getItem("userRole") || "Admin";
    const isAdmin = userRole === "Admin";

    const dataToExport = filteredData.map((c) => {
      const r2Data = getRoundDataForExcel(c.quiz, "R2");
      const r3Data = getRoundDataForExcel(c.quiz, "R3");
      const r4Data = getRoundDataForExcel(c.quiz, "R4");

      // Base data that everyone can see
      const baseData = {
        // Basic Info
        Username: c.username || "—",
        Name: c.name || "—",
        Email: c.email || "—",
        Phone: c.phone || "—",
        Location: c.location || "—",
        "Preferred Location": c.preferredLocation || "—",
        Designation: c.designation || "—",
        // Exam Status
        "Attendance Status": getAttendanceStatus(c) || "—",
        "Exam Status": c.examStatus || "—",
        "Start Time": c.startTime || "—",
        "Completion Time": c.completionTime || "—",
        "Time in Test": c.timeTakenInTest || "—",
        // Professional Details
        Skills: c.skills || "—",
        "Total Experience (Years)": c.totalExperience || "—",
        "Relevant Experience (Years)": c.relevantExperience || "—",
        "Willing to Relocate": c.willingToRelocate || "—",
        // Quiz Scores (Round 1)
        "R1 - Communication": c.quiz?.Communication || "—",
        "R1 - Database": c.quiz?.Database || "—",
        "R1 - GenAI": c.quiz?.GenAI || "—",
        "R1 - Logical": c.quiz?.Logical || "—",
        "R1 - Python": c.quiz?.Python || "—",
        "R1 - RPA": c.quiz?.RPA || "—",
        "R1 - Final Score": c.quiz?.["Final Score"] || "—",
        "R1 - Status":
          (parseInt(c.quiz?.["Final Score"]) || 0) >= 13
            ? "Passed"
            : (parseInt(c.quiz?.["Final Score"]) || 0) > 0
              ? "Dropped"
              : "Not Started",
        // Round 2 (Technical Round)
        "R2 - Interviewer": r2Data.interviewer,
        "R2 - Status": r2Data.status,
        "R2 - Rating": r2Data.rating,
        "R2 - Comments": r2Data.comments,
        // Round 3 (Managerial Round)
        "R3 - Interviewer": r3Data.interviewer,
        "R3 - Status": r3Data.status,
        "R3 - Managerial Status": r3Data.rating,
        "R3 - Comments": r3Data.comments,
        // Round 4 (HR Round)
        "R4 - Interviewer": r4Data.interviewer,
        "R4 - Status": r4Data.status,
        "R4 - Rating": r4Data.rating,
        "R4 - Comments": r4Data.comments,
        // Document Links (Resume is visible to all)
        "Photo Link": c.photo || "—",
        "Resume Link": c.resume || "—",
      };

      // Admin-only sensitive data
      if (isAdmin) {
        return {
          Password: c.password || "—",
          ...baseData,
          "Current CTC": c.currentCTC || "—",
          "Notice Period": c.noticePeriod || "—",
          "Aadhar Card Link": c.aadharCard || "—",
          "Payslip Link": c.payslip || "—",
          "Last Breakup Link": c.lastBreakup || "—",
        };
      }

      // Co-Admin gets restricted data (no sensitive fields)
      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    const statusLabel = filterStatus === "all" ? "all" : filterStatus;
    const roleLabel = isAdmin ? "admin" : "coadmin";
    XLSX.writeFile(
      wb,
      `candidates-${roleLabel}-${statusLabel}-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // Toggle row expansion
  const toggleRowExpansion = (uid) => {
    setExpandedRowId(expandedRowId === uid ? null : uid);
  };

  // Convert Google Drive links to viewable format
  const getViewableImageUrl = (url) => {
    if (!url) return "";

    // Handle Google Drive links
    if (url.includes("drive.google.com")) {
      let fileId = "";

      // Extract file ID from various Google Drive URL formats
      if (url.includes("/open?id=")) {
        fileId = url.split("id=")[1]?.split("&")[0];
      } else if (url.includes("/file/d/")) {
        fileId = url.split("/file/d/")[1]?.split("/")[0];
      } else if (url.includes("id=")) {
        fileId = url.split("id=")[1]?.split("&")[0];
      }

      if (fileId) {
        // Use direct view link for better compatibility across formats
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    return url;
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".svg",
    ];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext));
  };

  const isPdfFile = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes(".pdf");
  };

  const getDownloadUrl = (url) => {
    if (!url) return "";
    if (url.includes("drive.google.com/open?id=")) {
      const fileId = url.split("id=")[1];
      return `https://drive.google.com/file/d/${fileId}/view`;
    }
    return url;
  };

  const SkeletonTable = () => {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 items-center py-4 border-b border-gray-100"
          >
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
          </div>
        ))}
      </div>
    );
  };

  // 🔥 UI (UNCHANGED STRUCTURE)
  return (
    <div className="w-full bg-gray-100 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 text-left">Candidates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track all candidate applications
            </p>
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Search + Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          {/* Search Input */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by ID, Name, Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Entries Per Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-500">entries</span>
          </div>

          {/* Filter Button - Moved to right */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <button
              onClick={() => setFilterSheetOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                hasActiveFilters
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="flex items-center justify-center w-5 h-5 bg-white text-indigo-600 rounded-full text-xs font-bold">
                  {[statusFilter !== 'all', roundFilters.length > 0, roundStatusFilter !== 'all', r3StatusFilter !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>

            <SheetContent side="right" className="w-full sm:w-105 text-left">
              <SheetHeader>
                <SheetTitle>Filter & Sort</SheetTitle>
                <SheetDescription>
                  Refine your candidate list with filters and sorting options.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Attendance Status */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 text-left mb-4">
                    Attendance Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'present', 'absent'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          statusFilter === status
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Round Filter - Multi-select Checkboxes */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 text-left mb-4">
                    Select Rounds
                  </h3>
                  <div className="space-y-3">
                    {['R1', 'R2', 'R3', 'R4'].map((round) => (
                      <div key={round}>
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => toggleRoundFilter(round)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            roundFilters.includes(round)
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 group-hover:border-indigo-400'
                          }`}>
                            {roundFilters.includes(round) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm text-left ${
                            roundFilters.includes(round) ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}>
                            Round {round.slice(1)}
                          </span>
                        </div>

                        {/* R3 Sub-options */}
                        {round === 'R3' && roundFilters.includes('R3') && (
                          <div className="ml-8 mt-3 pl-4 border-l-2 border-indigo-200 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider text-left mb-2">
                              Interview Status
                            </p>
                            {[
                              { value: 'all', label: 'All' },
                              { value: 'GO', label: 'GO' },
                              { value: 'NOGO', label: 'NO GO' },
                              { value: 'HOLD', label: 'HOLD' },
                            ].map(({ value, label }) => (
                              <div
                                key={value}
                                className="flex items-center gap-3 cursor-pointer group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setR3StatusFilter(value);
                                }}
                              >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                  r3StatusFilter === value
                                    ? value === 'GO' 
                                      ? 'bg-green-500 border-green-500'
                                      : value === 'NOGO'
                                        ? 'bg-red-500 border-red-500'
                                        : value === 'HOLD'
                                          ? 'bg-amber-500 border-amber-500'
                                          : 'bg-gray-500 border-gray-500'
                                    : 'border-gray-300 group-hover:border-indigo-400'
                                }`}>
                                  {r3StatusFilter === value && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <span className={`text-sm text-left ${
                                  r3StatusFilter === value ? 'text-gray-900 font-medium' : 'text-gray-600'
                                }`}>
                                  {label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {roundFilters.length === 0 && (
                    <p className="text-xs text-gray-400 mt-2 text-left">No rounds selected - showing all</p>
                  )}
                </div>

                {/* Round Status */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 text-left mb-4">
                    Round Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'dropped', label: 'Dropped' },
                      { value: 'rejected', label: 'Rejected' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setRoundStatusFilter(value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          roundStatusFilter === value
                            ? value === 'completed' 
                              ? 'bg-green-500 text-white'
                              : value === 'in-progress'
                                ? 'bg-amber-500 text-white'
                                : value === 'dropped' || value === 'rejected'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Active Filter Summary */}
                  {(roundFilters.length > 0 || roundStatusFilter !== 'all' || r3StatusFilter !== 'all') && (
                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 border border-indigo-100 text-left">
                      <span className="font-medium">Active: </span>
                      {roundFilters.includes('R3') && r3StatusFilter !== 'all'
                        ? `${roundFilters.map(r => `Round ${r.slice(1)}`).join(', ')} → R3: ${r3StatusFilter === 'NOGO' ? 'NO GO' : r3StatusFilter}`
                        : roundFilters.length > 0 && roundStatusFilter !== 'all' 
                          ? `${roundFilters.map(r => `Round ${r.slice(1)}`).join(', ')} → ${roundStatusFilter.charAt(0).toUpperCase() + roundStatusFilter.slice(1).replace('-', ' ')}`
                          : roundFilters.length > 0 
                            ? `${roundFilters.map(r => `Round ${r.slice(1)}`).join(', ')}`
                            : `All rounds → ${roundStatusFilter.replace('-', ' ')}`
                      }
                    </div>
                  )}
                </div>

                {/* Sort Options */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 text-left mb-4">
                    Sort By
                  </h3>
                  <div className="space-y-1">
                    {[
                      { field: 'newest', label: 'Newest First' },
                      { field: 'name', label: 'Name' },
                      { field: 'email', label: 'Email' },
                      { field: 'score', label: 'Score' },
                      { field: 'status', label: 'Status' },
                    ].map(({ field, label }) => (
                      <button
                        key={field}
                        onClick={() => handleSortChange(field)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                          sortField === field
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span>{label}</span>
                        {sortField === field && (
                          <span className="flex items-center gap-1 text-indigo-600">
                            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SheetFooter>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    <RotateCcw size={16} />
                    Reset All
                  </button>
                )}
                <SheetClose asChild>
                  <button className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all">
                    Apply Filters
                  </button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {loading ? (
                <SkeletonTable />
              ) : (
                <CandidateTable
                  candidates={filteredCandidates}
                  getAttendanceStatus={getAttendanceStatus}
                  getDownloadUrl={getDownloadUrl}
                  userRole={localStorage.getItem("userRole") || "Admin"}
                  onRefresh={() => fetchCandidates(true)}
                  statusFilter={statusFilter}
                  roundFilters={roundFilters}
                  roundStatusFilter={roundStatusFilter}
                  r3StatusFilter={r3StatusFilter}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  entriesPerPage={entriesPerPage}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
