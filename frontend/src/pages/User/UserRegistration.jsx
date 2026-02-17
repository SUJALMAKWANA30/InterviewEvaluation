import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Upload, X, Check, Eye, EyeOff, Link as LinkIcon, Monitor } from "lucide-react";

const BACKEND_API_URL = import.meta.env.VITE_API_URL || "/api";
const API_BASE = BACKEND_API_URL.endsWith("/api")
  ? BACKEND_API_URL
  : `${BACKEND_API_URL}/api`;

export default function UserRegistration() {
  const [formData, setFormData] = useState({
    // Personal Information (Section 1)
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    preferredLocation: "",
    willingToRelocate: "",

    // Professional Details (Section 2)
    positionApplied: "",
    totalExperience: "",
    highestEducation: "",
    skills: [],
    noticePeriod: "",
    currentDesignation: "",
    currentCTC: "",
    experienceLevels: {
      python: "",
      rpa: "",
      genai: "",
    },

    // Authentication (Section 4)
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  // File states (Section 3)
  const [files, setFiles] = useState({
    resume: null,
    idProof: null,
    photo: null,
    payslips: null,
    lastBreakup: null,
  });

  // URL states for document links (Section 3)
  const [fileUrls, setFileUrls] = useState({
    resume: "",
    idProof: "",
    photo: "",
    payslips: "",
    lastBreakup: "",
  });

  // Upload method: "file" or "url"
  const [uploadMethod, setUploadMethod] = useState({
    resume: "file",
    idProof: "file",
    photo: "file",
    payslips: "file",
    lastBreakup: "file",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // File input refs
  const fileInputRefs = {
    resume: useRef(null),
    idProof: useRef(null),
    photo: useRef(null),
    payslips: useRef(null),
    lastBreakup: useRef(null),
  };

  const steps = [
    { id: 1, label: "Personal Info" },
    { id: 2, label: "Professional" },
    { id: 3, label: "Documents" },
    { id: 4, label: "Confirm" },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (sectionErrors[name]) {
      setSectionErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSkillChange = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleExperienceLevelChange = (skill, level) => {
    setFormData((prev) => ({
      ...prev,
      experienceLevels: {
        ...prev.experienceLevels,
        [skill.toLowerCase()]: level,
      },
    }));
  };

  const handleFileChange = (fieldName, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      setFiles((prev) => ({ ...prev, [fieldName]: file }));
      setError("");
    }
  };

  const removeFile = (fieldName) => {
    setFiles((prev) => ({ ...prev, [fieldName]: null }));
    setFileUrls((prev) => ({ ...prev, [fieldName]: "" }));
    if (fileInputRefs[fieldName]?.current) {
      fileInputRefs[fieldName].current.value = "";
    }
  };

  // Section 1 Validation
  const validateSection1 = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    }
    if (!formData.preferredLocation.trim()) {
      errors.preferredLocation = "Preferred location is required";
    }
    if (!formData.willingToRelocate) {
      errors.willingToRelocate = "Please select if you're willing to relocate";
    }

    setSectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Section 2 Validation
  const validateSection2 = () => {
    const errors = {};

    if (!formData.positionApplied.trim()) {
      errors.positionApplied = "Position applied for is required";
    }
    if (!formData.totalExperience.trim()) {
      errors.totalExperience = "Total experience is required";
    }
    if (!formData.highestEducation) {
      errors.highestEducation = "Highest education is required";
    }
    if (!formData.noticePeriod) {
      errors.noticePeriod = "Notice period is required";
    }
    if (formData.skills.length === 0) {
      errors.skills = "Please select at least one skill";
    }
    if (!formData.currentDesignation.trim()) {
      errors.currentDesignation = "Current designation is required";
    }
    if (!formData.currentCTC.trim()) {
      errors.currentCTC = "Current CTC is required";
    }

    // Check if experience levels are selected for all skills
    const allExperienceLevels = Object.values(formData.experienceLevels).every(
      (level) => level !== ""
    );
    if (!allExperienceLevels) {
      errors.experienceLevels = "Please select experience level for all skills";
    }

    setSectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Section 3 Validation
  const validateSection3 = () => {
    const errors = {};
    const urlRegex = /^https?:\/\/.+/i;

    const validateField = (fieldName, label) => {
      if (uploadMethod[fieldName] === "file" && !files[fieldName]) {
        errors[fieldName] = `${label} is required`;
      } else if (uploadMethod[fieldName] === "url" && !fileUrls[fieldName].trim()) {
        errors[fieldName] = `${label} URL is required`;
      } else if (uploadMethod[fieldName] === "url" && !urlRegex.test(fileUrls[fieldName].trim())) {
        errors[fieldName] = "Please enter a valid URL (starting with http:// or https://)";
      }
    };

    validateField("resume", "Resume");
    validateField("idProof", "ID Proof");
    validateField("photo", "Photo");
    validateField("payslips", "Payslips");
    validateField("lastBreakup", "Last breakup document");

    setSectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Section 4 Validation
  const validateSection4 = () => {
    const errors = {};

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!formData.termsAccepted) {
      errors.termsAccepted = "You must accept the terms and conditions";
    }

    setSectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    setError("");
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateSection1();
        break;
      case 2:
        isValid = validateSection2();
        break;
      case 3:
        isValid = validateSection3();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setSectionErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateSection4()) {
      return;
    }

    setLoading(true);

    try {
      // Create FormData for multipart upload
      const submitData = new FormData();

      // Add personal information
      submitData.append("firstName", formData.firstName.trim());
      submitData.append("lastName", formData.lastName.trim());
      submitData.append("email", formData.email.trim().toLowerCase());
      submitData.append("phone", formData.phone.trim());
      if (formData.dateOfBirth) {
        submitData.append("dateOfBirth", formData.dateOfBirth);
      }
      submitData.append("preferredLocation", formData.preferredLocation.trim());
      submitData.append("willingToRelocate", formData.willingToRelocate);

      // Add professional details
      submitData.append("positionApplied", formData.positionApplied.trim());
      submitData.append("totalExperience", formData.totalExperience.trim());
      submitData.append("highestEducation", formData.highestEducation.trim());
      submitData.append("skills", JSON.stringify(formData.skills));
      submitData.append("noticePeriod", formData.noticePeriod);
      submitData.append("currentDesignation", formData.currentDesignation.trim());
      submitData.append("currentCTC", formData.currentCTC.trim());
      submitData.append("experienceLevels", JSON.stringify(formData.experienceLevels));

      // Add authentication
      submitData.append("password", formData.password);
      submitData.append("termsAccepted", formData.termsAccepted);

      // Add files or URLs
      const docFields = ["resume", "idProof", "photo", "payslips", "lastBreakup"];
      const documentUrls = {};
      docFields.forEach((field) => {
        if (uploadMethod[field] === "file" && files[field]) {
          submitData.append(field, files[field]);
        } else if (uploadMethod[field] === "url" && fileUrls[field].trim()) {
          documentUrls[field] = fileUrls[field].trim();
        }
      });
      submitData.append("documentUrls", JSON.stringify(documentUrls));

      const response = await fetch(`${API_BASE}/candidate-details/register`, {
        method: "POST",
        body: submitData,
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful! You can now login.");
        navigate("/user-login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // File upload component with URL option (like Google Forms)
  const FileUploadBox = ({ fieldName, label, description, required = false }) => {
    const method = uploadMethod[fieldName];
    const hasFile = files[fieldName];
    const hasUrl = fileUrls[fieldName].trim();
    const hasValue = (method === "file" && hasFile) || (method === "url" && hasUrl);

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* Toggle between File and URL */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setUploadMethod((prev) => ({ ...prev, [fieldName]: "file" }));
              setFileUrls((prev) => ({ ...prev, [fieldName]: "" }));
              if (sectionErrors[fieldName]) setSectionErrors((prev) => ({ ...prev, [fieldName]: "" }));
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              method === "file"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            <Monitor size={14} />
            Upload from device
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMethod((prev) => ({ ...prev, [fieldName]: "url" }));
              setFiles((prev) => ({ ...prev, [fieldName]: null }));
              if (fileInputRefs[fieldName]?.current) fileInputRefs[fieldName].current.value = "";
              if (sectionErrors[fieldName]) setSectionErrors((prev) => ({ ...prev, [fieldName]: "" }));
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              method === "url"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            <LinkIcon size={14} />
            Paste link / URL
          </button>
        </div>

        {/* File upload mode */}
        {method === "file" && (
          <>
            {hasFile ? (
              <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Check className="text-green-600" size={24} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {files[fieldName].name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(files[fieldName].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(fieldName)}
                    className="rounded-full p-1 hover:bg-red-100"
                  >
                    <X className="text-red-500" size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-xl border-2 border-dashed ${
                  sectionErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300 bg-gray-50"
                } p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors`}
                onClick={() => fileInputRefs[fieldName]?.current?.click()}
              >
                <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-sm font-medium text-gray-900">
                  Drop your file here or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">{description}</p>
                <input
                  ref={fileInputRefs[fieldName]}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(fieldName, e)}
                  className="hidden"
                />
              </div>
            )}
          </>
        )}

        {/* URL input mode */}
        {method === "url" && (
          <>
            {hasUrl ? (
              <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Check className="text-green-600" size={24} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {fileUrls[fieldName]}
                      </p>
                      <p className="text-xs text-gray-500">Link attached</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(fieldName)}
                    className="rounded-full p-1 hover:bg-red-100"
                  >
                    <X className="text-red-500" size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-xl border-2 ${
                  sectionErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
                } p-6`}
              >
                <div className="flex items-center gap-3">
                  <LinkIcon className="text-gray-400 shrink-0" size={20} />
                  <input
                    type="url"
                    placeholder="Paste Google Drive, Dropbox, or any URL here..."
                    value={fileUrls[fieldName]}
                    onChange={(e) => {
                      setFileUrls((prev) => ({ ...prev, [fieldName]: e.target.value }));
                      if (sectionErrors[fieldName]) setSectionErrors((prev) => ({ ...prev, [fieldName]: "" }));
                    }}
                    className="w-full bg-transparent text-sm focus:outline-none placeholder-gray-400"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Paste a link from Google Drive, Dropbox, OneDrive, or any accessible URL
                </p>
              </div>
            )}
          </>
        )}

        {sectionErrors[fieldName] && (
          <p className="mt-2 text-sm text-red-600">{sectionErrors[fieldName]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Title */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-left">
            <h1 className="text-2xl font-semibold text-gray-900">
              Candidate Registration
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete your profile to start your application
            </p>
          </div>

          <div className="sm:mt-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <span className="text-base">←</span>
              Back to home
            </Link>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-10 flex items-center w-full">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1 relative">
              <div className="flex flex-col items-center z-10 w-full">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all
                  ${
                    currentStep > step.id
                      ? "bg-green-500 text-white"
                      : currentStep === step.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                <span className="mt-2 text-xs text-gray-600">{step.label}</span>
              </div>

              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 w-full h-0.5
                  ${currentStep > step.id ? "bg-green-500" : "bg-gray-300"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="mt-12 rounded-xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-8 text-left">
                <h2 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h2>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full h-11 rounded-lg border ${
                        sectionErrors.firstName ? "border-red-300" : "border-gray-300"
                      } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                    />
                    {sectionErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{sectionErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full h-11 rounded-lg border ${
                        sectionErrors.lastName ? "border-red-300" : "border-gray-300"
                      } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                    />
                    {sectionErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{sectionErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.email ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                  />
                  {sectionErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.phone ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                  />
                  {sectionErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.dateOfBirth ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                  />
                  {sectionErrors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.dateOfBirth}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="preferredLocation"
                    value={formData.preferredLocation}
                    onChange={handleInputChange}
                    placeholder="e.g., Bangalore, Mumbai"
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.preferredLocation ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                  />
                  {sectionErrors.preferredLocation && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.preferredLocation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Are you willing to relocate? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-6">
                    {["Yes", "No"].map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="willingToRelocate"
                          value={opt}
                          checked={formData.willingToRelocate === opt}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {sectionErrors.willingToRelocate && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.willingToRelocate}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Professional Details */}
            {currentStep === 2 && (
              <div className="space-y-8 text-left">
                <h2 className="text-lg font-semibold text-gray-900">
                  Professional Details
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Applied For <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="positionApplied"
                    value={formData.positionApplied}
                    onChange={handleInputChange}
                    placeholder="e.g., RPA Developer, Python Developer"
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.positionApplied ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                  />
                  {sectionErrors.positionApplied && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.positionApplied}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="totalExperience"
                    value={formData.totalExperience}
                    onChange={handleInputChange}
                    placeholder="e.g., 2 years"
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.totalExperience ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600`}
                  />
                  {sectionErrors.totalExperience && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.totalExperience}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Highest Education <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="highestEducation"
                    value={formData.highestEducation}
                    onChange={handleInputChange}
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.highestEducation ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600`}
                  >
                    <option value="">Select education</option>
                    <option value="High School">High School</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Bachelor's">Bachelor's Degree</option>
                    <option value="Master's">Master's Degree</option>
                    <option value="PhD">PhD</option>
                  </select>
                  {sectionErrors.highestEducation && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.highestEducation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Skills <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {["GenAI", "Python", "RPA"].map((skill) => (
                      <label
                        key={skill}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(skill)}
                          onChange={() => handleSkillChange(skill)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                  {sectionErrors.skills && (
                    <p className="mt-2 text-sm text-red-600">{sectionErrors.skills}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notice Period <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="noticePeriod"
                    value={formData.noticePeriod}
                    onChange={handleInputChange}
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.noticePeriod ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600`}
                  >
                    <option value="">Select</option>
                    <option value="Immediate">Immediate</option>
                    <option value="30 Days">30 Days</option>
                    <option value="45 Days">45 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="90 Days">90 Days</option>
                  </select>
                  {sectionErrors.noticePeriod && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.noticePeriod}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Experience Level <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full overflow-x-auto">
                  <div className="min-w-175">
                      <table className="w-full table-fixed text-sm border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-1/5 px-4 py-3 text-left font-medium text-gray-700">Skill</th>
                            <th className="w-1/5 px-4 py-3 text-center font-medium text-gray-700">Beginner</th>
                            <th className="w-1/5 px-4 py-3 text-center font-medium text-gray-700">Intermediate</th>
                            <th className="w-1/5 px-4 py-3 text-center font-medium text-gray-700">Expert</th>
                            <th className="w-1/5 px-4 py-3 text-center font-medium text-gray-700">No Experience</th>
                          </tr>
                        </thead>
                        <tbody>
                          {["Python", "RPA", "GenAI"].map((skill) => (
                            <tr key={skill} className="border-t border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 text-left font-medium text-gray-800">{skill}</td>
                              {["Beginner", "Intermediate", "Expert", "No Experience"].map((level) => (
                                <td key={level} className="px-4 py-3 text-center">
                                  <input
                                    type="radio"
                                    name={`exp-${skill}`}
                                    checked={formData.experienceLevels[skill.toLowerCase()] === level}
                                    onChange={() => handleExperienceLevelChange(skill, level)}
                                    className="h-4 w-4 text-blue-600"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {sectionErrors.experienceLevels && (
                    <p className="mt-2 text-sm text-red-600">{sectionErrors.experienceLevels}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="currentDesignation"
                    value={formData.currentDesignation}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Developer"
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.currentDesignation ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600`}
                  />
                  {sectionErrors.currentDesignation && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.currentDesignation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current CTC (LPA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="currentCTC"
                    value={formData.currentCTC}
                    onChange={handleInputChange}
                    placeholder="e.g., 8.5"
                    className={`w-full h-11 rounded-lg border ${
                      sectionErrors.currentCTC ? "border-red-300" : "border-gray-300"
                    } px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600`}
                  />
                  {sectionErrors.currentCTC && (
                    <p className="mt-1 text-sm text-red-600">{sectionErrors.currentCTC}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Document Upload */}
            {currentStep === 3 && (
              <div className="space-y-10 text-left">
                <h2 className="text-lg font-semibold text-gray-900">Document Upload</h2>

                <FileUploadBox
                  fieldName="resume"
                  label="Resume / CV"
                  description="PDF, DOC up to 10MB"
                  required
                />

                <FileUploadBox
                  fieldName="idProof"
                  label="ID Proof (Aadhar/PAN)"
                  description="Passport, Driver License, or National ID - PDF, JPG, PNG up to 10MB"
                  required
                />

                <FileUploadBox
                  fieldName="photo"
                  label="Photo"
                  description="JPG, PNG up to 10MB"
                  required
                />

                <FileUploadBox
                  fieldName="payslips"
                  label="Payslips (Last 3)"
                  description="PDF, DOC up to 10MB"
                  required
                />

                <FileUploadBox
                  fieldName="lastBreakup"
                  label="Last Breakup"
                  description="PDF, DOC up to 10MB"
                  required
                />
              </div>
            )}

            {/* STEP 4: Review & Confirm */}
            {currentStep === 4 && (
              <div className="space-y-8 text-left">
                <h2 className="text-lg font-semibold text-gray-900">Review & Confirm</h2>

                {/* Summary */}
                <div className="rounded-lg bg-gray-50 p-6 space-y-4">
                  <h3 className="font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-500">Full Name</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formData.firstName} {formData.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm font-medium text-gray-900">{formData.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-500">Phone</span>
                      <span className="text-sm font-medium text-gray-900">{formData.phone}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-500">Location</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formData.preferredLocation || "Not specified"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-900 mt-6 mb-4">Professional Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-500">Notice Period</span>
                      <span className="text-sm font-medium text-gray-900">{formData.noticePeriod}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-500">Skills</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formData.skills.join(", ") || "None selected"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-900 mt-6 mb-4">Documents Uploaded</h3>
                  <div className="grid gap-2">
                    {Object.entries(files).map(([key, file]) => (
                      file && (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <Check className="text-green-500" size={16} />
                          <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                          <span className="text-gray-600">{file.name}</span>
                        </div>
                      )
                    ))}
                    {Object.entries(fileUrls).map(([key, url]) => (
                      url && (
                        <div key={`url-${key}`} className="flex items-center gap-2 text-sm">
                          <LinkIcon className="text-blue-500" size={16} />
                          <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                          <span className="text-gray-600 truncate max-w-xs">{url}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-6">
                  <h3 className="font-medium text-gray-900">Create Password</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full h-11 rounded-lg border ${
                          sectionErrors.password ? "border-red-300" : "border-gray-300"
                        } px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {sectionErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{sectionErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full h-11 rounded-lg border ${
                          sectionErrors.confirmPassword ? "border-red-300" : "border-gray-300"
                        } px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {sectionErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{sectionErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <label className="text-sm text-gray-600 leading-relaxed">
                    I agree to the terms and conditions and consent to location-based verification
                    during the assessment process.
                  </label>
                </div>
                {sectionErrors.termsAccepted && (
                  <p className="text-sm text-red-600">{sectionErrors.termsAccepted}</p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-12 flex items-center justify-between">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={handleBack}
                className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              >
                Back
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Registration"}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
