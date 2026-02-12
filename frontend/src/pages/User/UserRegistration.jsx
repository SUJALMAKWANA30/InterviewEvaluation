import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, AlertCircle } from "lucide-react";
const BACKEND_API_URL = import.meta.env.VITE_API_URL || "/api";
const API_BASE = BACKEND_API_URL.endsWith("/api")
  ? BACKEND_API_URL
  : `${BACKEND_API_URL}/api`;

export default function UserRegistration() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredLocation: "",
    relocate: "",
    noticePeriod: "",
    totalExperience: "",
    currentDesignation: "",
    currentCTC: "",
    skills: [],
    password: "",
    confirmPassword: "",
  });

  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, label: "Personal Info" },
    { id: 2, label: "Professional" },
    { id: 3, label: "Documents" },
    { id: 4, label: "Confirm" },
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
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

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Title */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left Side - Title */}
          <div className="text-left">
            <h1 className="text-2xl font-semibold text-gray-900">
              Candidate Registration
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete your profile to start your application
            </p>
          </div>

          {/* Right Side - Back Link */}
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
              {/* Circle + Label */}
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

              {/* Connector Line */}
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

          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="space-y-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900">
                Personal Information
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Location
                </label>
                <input
                  type="text"
                  name="preferredLocation"
                  value={formData.preferredLocation}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Are you willing to relocate?
                </label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="radio"
                        name="relocate"
                        value={opt}
                        onChange={handleInputChange}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900">
                Professional Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Applied For
                </label>
                <input
                  type="text"
                  placeholder="Select position"
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="text"
                  placeholder="Select experience"
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Highest Education
                </label>
                <input
                  type="text"
                  placeholder="Select education"
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Skills
                </label>

                <div className="space-y-2">
                  {["GenAI", "Python", "RPA"].map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input type="checkbox" />
                      {skill}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice Period
                </label>
                <select
                  name="noticePeriod"
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select</option>
                  <option>Immediate</option>
                  <option>30 Days</option>
                  <option>45 Days</option>
                  <option>60 Days</option>
                  <option>90 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Experience Level
                </label>

                <div className="w-full overflow-x-auto">
                  <div className="min-w-175">
                    <table className="w-full table-fixed text-sm border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-1/4 px-4 py-3 text-left font-medium text-gray-700">
                            Skill
                          </th>
                          <th className="w-1/6 px-4 py-3 text-center font-medium text-gray-700">
                            Beginner
                          </th>
                          <th className="w-1/6 px-4 py-3 text-center font-medium text-gray-700">
                            Intermediate
                          </th>
                          <th className="w-1/6 px-4 py-3 text-center font-medium text-gray-700">
                            Expert
                          </th>
                          <th className="w-1/6 px-4 py-3 text-center font-medium text-gray-700">
                            No Experience
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {["Python", "RPA", "GenAI"].map((skill) => (
                          <tr
                            key={skill}
                            className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-left font-medium text-gray-800">
                              {skill}
                            </td>

                            {[1, 2, 3, 4].map((i) => (
                              <td
                                key={i}
                                className="px-4 py-3 text-center align-middle"
                              >
                                <input
                                  type="radio"
                                  name={skill}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Designation
                </label>
                <input
                  type="text"
                  name="currentDesignation"
                  value={formData.currentDesignation}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current CTC (LPA)
                </label>
                <input
                  type="text"
                  name="currentCTC"
                  value={formData.currentCTC}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-10 text-left">
              <h2 className="text-lg font-semibold text-gray-900">
                Document Upload
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Resume / CV
                </label>

                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Drop your file here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, DOC up to 10MB
                  </p>
                  <button className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                    Choose File
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ID Proof
                </label>

                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Upload ID document
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Passport, Driver License, or National ID
                  </p>
                  <button className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                    Choose File
                  </button>
                </div>
              </div>

              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Photo
                </label>
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Drop your file here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, JPG, PNG up to 10MB
                  </p>
                  <button className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                    Choose File
                  </button>
                </div>
              </div>

              {/* Payslips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payslips (Last 3)
                </label>
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Drop your file here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, DOC up to 10MB
                  </p>
                  <button className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                    Choose File
                  </button>
                </div>
              </div>

              {/* Last Breakup */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Last Breakup
                </label>
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Drop your file here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, DOC up to 10MB
                  </p>
                  <button className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                    Choose File
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900">
                Review & Confirm
              </h2>

              <div className="rounded-lg bg-gray-50 p-6 space-y-4">
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-sm text-gray-500">Full Name</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formData.firstName} {formData.lastName}
                  </span>
                </div>

                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formData.email}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formData.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <label className="text-sm text-gray-600 leading-relaxed">
                  I agree to the terms and conditions and consent to
                  location-based verification during the assessment process.
                </label>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between">
            <button
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 disabled:opacity-50"
            >
              Back
            </button>

            <button
              onClick={() =>
                currentStep < 4
                  ? setCurrentStep(currentStep + 1)
                  : handleSubmit(new Event("submit"))
              }
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {currentStep === 4 ? "Submit Registration" : "Continue"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
