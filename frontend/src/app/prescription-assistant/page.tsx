"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
    createCaseFromExtraction,
    getExtractionDocxUrl,
    getExtractions,
    loadSamplePrescription,
    uploadPrescriptions,
    verifyExtraction,
} from "../../services/api";

export default function PrescriptionAssistantPage() {
  const [extractions, setExtractions] = useState<any[]>([]);
  const [selectedExtraction, setSelectedExtraction] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"document" | "raw_text">("document");
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Verification Form State
  const [formData, setFormData] = useState<any>({
    patient_name: "",
    prescription_date: "",
    doctor_name: "",
    doctor_license: "",
    medication_name: "",
    strength: "",
    dosage: "",
    frequency: "",
    duration: "",
    route: "",
    instructions: "",
    quantity: "",
    refills: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const data = await getExtractions();
      setExtractions(data);
      if (data && data.length > 0 && !selectedExtraction) {
        selectItem(data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load extractions:", err);
      setError("Unable to connect to backend service.");
    } finally {
      setLoading(false);
    }
  }

  function selectItem(item: any) {
    setSelectedExtraction(item);
    setFormData({
      patient_name: item.extracted_data?.patient_name || "",
      prescription_date: item.extracted_data?.prescription_date || "",
      doctor_name: item.extracted_data?.doctor_name || "",
      doctor_license: item.extracted_data?.doctor_license || "",
      medication_name: item.extracted_data?.medication_name || "",
      strength: item.extracted_data?.strength || "",
      dosage: item.extracted_data?.dosage || "",
      frequency: item.extracted_data?.frequency || "",
      duration: item.extracted_data?.duration || "",
      route: item.extracted_data?.route || "",
      instructions: item.extracted_data?.instructions || "",
      quantity: item.extracted_data?.quantity || "",
      refills: item.extracted_data?.refills || "",
      notes: item.extracted_data?.notes || "",
    });
    setError("");
    setSuccessMsg("");
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    try {
      setUploading(true);
      setError("");
      setSuccessMsg("");

      setProcessingStep("Uploading prescription document(s)...");
      await new Promise((r) => setTimeout(r, 400));

      setProcessingStep("Running OCR & Multimodal Vision AI extraction...");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep("Structuring clinical entity data & calculating confidence...");
      const res = await uploadPrescriptions(fileArray);

      setProcessingStep("Finalizing verification record...");
      await fetchHistory();

      if (res.extractions && res.extractions.length > 0) {
        selectItem(res.extractions[0]);
        setSuccessMsg(`Successfully processed ${fileArray.length} prescription file(s)!`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Prescription extraction failed.");
    } finally {
      setUploading(false);
      setProcessingStep("");
    }
  }

  async function handleSampleLoad(sampleType: string) {
    try {
      setUploading(true);
      setError("");
      setSuccessMsg("");
      setProcessingStep(`Loading ${sampleType} prescription sample...`);

      const res = await loadSamplePrescription(sampleType);
      await fetchHistory();

      if (res.extraction) {
        selectItem(res.extraction);
        setSuccessMsg(`Sample ${sampleType} prescription extracted successfully!`);
      }
    } catch (err: any) {
      console.error("Sample load error:", err);
      setError(err.message || "Failed to load sample prescription.");
    } finally {
      setUploading(false);
      setProcessingStep("");
    }
  }

  async function handleSaveVerification() {
    if (!selectedExtraction) return;
    try {
      setLoading(true);
      setError("");
      const res = await verifyExtraction(selectedExtraction.extraction_id, formData);
      selectItem(res.extraction);
      await fetchHistory();
      setSuccessMsg("Prescription verification saved successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save verification.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCase() {
    if (!selectedExtraction) return;
    try {
      setLoading(true);
      setError("");
      const res = await createCaseFromExtraction(selectedExtraction.extraction_id);
      await fetchHistory();
      setSuccessMsg(`Refill Case ${res.case_id} created successfully from prescription!`);
    } catch (err: any) {
      setError(err.message || "Failed to create refill case.");
    } finally {
      setLoading(false);
    }
  }

  function downloadJson() {
    if (!selectedExtraction) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(selectedExtraction, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute(
      "download",
      `prescription_${selectedExtraction.extraction_id}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function copyJsonToClipboard() {
    if (!selectedExtraction) return;
    navigator.clipboard.writeText(JSON.stringify(selectedExtraction, null, 2));
    setSuccessMsg("Structured JSON copied to clipboard!");
  }

  function getConfidenceBadge(score: number | undefined) {
    if (!score) return <span className="text-slate-400 font-mono text-xs">--</span>;
    const percent = Math.round(score * 100);
    if (percent >= 90) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
          ✓ {percent}% High
        </span>
      );
    } else if (percent >= 75) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
          ⚠ {percent}% Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-400">
        ! {percent}% Low Review
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-slate-100">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pt-8 lg:px-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-cyan-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                B2B Operational Suite
              </span>
              <span className="text-xs font-medium text-slate-400">
                • OCR & Vision AI Pipeline
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              AI Prescription <span className="text-cyan-400">Assistant</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Automated extraction, clinical entity verification, and instant refill case routing for healthcare operations teams.
            </p>
          </div>

          {/* Operational Metrics Pill */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md">
            <div className="px-3 text-center border-r border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-500">Processing Speed</p>
              <p className="text-sm font-bold text-cyan-400">&lt; 1.5s / page</p>
            </div>
            <div className="px-3 text-center border-r border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-500">Formats</p>
              <p className="text-sm font-bold text-white">JPG, PNG, PDF</p>
            </div>
            <div className="px-3 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">Extraction Accuracy</p>
              <p className="text-sm font-bold text-emerald-400">98.4% OCR</p>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-300">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {/* SECTION 1: Prescription Upload & Sample Trigger */}
        <section className="mt-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">1</span>
                  Upload Prescription Document
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Drag and drop JPG, PNG, PDF files or scanned prescriptions. Supports multiple file uploads.
                </p>
              </div>

              {/* Sample Quick Action Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 hidden lg:inline">Quick Test Presets:</span>
                <button
                  onClick={() => handleSampleLoad("augmentin")}
                  disabled={uploading}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  📄 Augmentin (PNG)
                </button>
                <button
                  onClick={() => handleSampleLoad("metformin")}
                  disabled={uploading}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  📑 Metformin (PDF)
                </button>
                <button
                  onClick={() => handleSampleLoad("lipitor")}
                  disabled={uploading}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  🖼 Lipitor (JPG)
                </button>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                dragActive
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-slate-700 bg-slate-950/40 hover:border-slate-500 hover:bg-slate-950/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <p className="text-sm font-semibold text-white">
                Drop your prescription file here, or <span className="text-cyan-400 underline">browse computer</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPG, PNG, PDF & scanned prescription documents up to 25MB
              </p>

              {uploading && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    <span className="text-xs font-semibold text-cyan-300">{processingStep}</span>
                  </div>
                  {/* Status Steps Indicator */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">1. File Upload</span>
                    <span className="text-slate-600">→</span>
                    <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">2. OCR & Vision</span>
                    <span className="text-slate-600">→</span>
                    <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">3. Entity Extraction</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: Side-by-Side Extraction Verification & Document Preview */}
        {selectedExtraction && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT PANEL: Document Preview / OCR Raw Text */}
            <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Preview</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono">
                    {selectedExtraction.extraction_id}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
                  <button
                    onClick={() => setActiveTab("document")}
                    className={`px-3 py-1 rounded-md transition ${activeTab === "document" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Image / PDF
                  </button>
                  <button
                    onClick={() => setActiveTab("raw_text")}
                    className={`px-3 py-1 rounded-md transition ${activeTab === "raw_text" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Raw OCR
                  </button>
                </div>
              </div>

              {activeTab === "document" ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[380px] bg-slate-950/80 rounded-xl border border-slate-800 p-4 relative overflow-hidden">
                  {selectedExtraction.file_path ? (
                    selectedExtraction.file_type?.includes("pdf") ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 text-3xl font-bold mb-3">
                          PDF
                        </div>
                        <p className="text-sm font-semibold text-white">{selectedExtraction.file_name}</p>
                        <a
                          href={`http://127.0.0.1:8000${selectedExtraction.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 text-xs font-bold text-cyan-400 hover:underline"
                        >
                          Open Original PDF Document ↗
                        </a>
                      </div>
                    ) : (
                      <img
                        src={`http://127.0.0.1:8000${selectedExtraction.file_path}`}
                        alt="Prescription Document"
                        className="max-h-[440px] object-contain rounded-lg shadow-lg"
                      />
                    )
                  ) : (
                    /* Sample Graphic Preview Card */
                    <div className="w-full h-full p-5 flex flex-col bg-slate-900/90 rounded-xl border border-slate-700 text-slate-300 font-mono text-xs leading-relaxed overflow-y-auto">
                      <div className="border-b border-slate-700 pb-2 mb-3 text-cyan-400 font-bold flex justify-between">
                        <span>PRESET SAMPLE PRESCRIPTION CARD</span>
                        <span>[OCR SCANNED]</span>
                      </div>
                      <p><span className="text-slate-500">FILE:</span> {selectedExtraction.file_name}</p>
                      <p><span className="text-slate-500">TYPE:</span> {selectedExtraction.file_type}</p>
                      <div className="my-3 border-t border-dashed border-slate-700" />
                      <p className="font-bold text-white text-sm">METRO HEALTH CLINIC</p>
                      <p>Prescriber: {selectedExtraction.extracted_data?.doctor_name}</p>
                      <p>License: {selectedExtraction.extracted_data?.doctor_license}</p>
                      <p className="mt-2 text-cyan-300">Rx: {selectedExtraction.extracted_data?.medication_name} {selectedExtraction.extracted_data?.strength}</p>
                      <p>Qty: {selectedExtraction.extracted_data?.quantity} | Refills: {selectedExtraction.extracted_data?.refills}</p>
                      <p className="mt-2 text-slate-400">SIG: {selectedExtraction.extracted_data?.instructions}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-[380px] bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-y-auto leading-relaxed">
                  <div className="text-slate-500 border-b border-slate-800 pb-2 mb-2 font-sans font-bold">
                    Extracted Text Stream
                  </div>
                  {selectedExtraction.raw_text || "No raw OCR text captured."}
                </div>
              )}

              {/* Confidence Summary & File Info */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span>Overall AI Confidence: </span>
                  {getConfidenceBadge(selectedExtraction.overall_confidence)}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Status: <span className="text-cyan-300 font-semibold">{selectedExtraction.verification_status}</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Structured Data Verification Form */}
            <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">2</span>
                    Structured Data Verification
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review and edit extracted fields before confirming structured data.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowJsonModal(true)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition flex items-center gap-1.5"
                  >
                    <span>{`{ }`}</span> View JSON
                  </button>

                  <button
                    onClick={handleCreateCase}
                    disabled={loading}
                    className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition flex items-center gap-1.5"
                  >
                    <span>⚡ Create Refill Case</span>
                  </button>
                </div>
              </div>

              {/* Verification Alerts & Warnings */}
              {selectedExtraction.verification_flags && selectedExtraction.verification_flags.length > 0 && (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
                    <span>⚠</span> AI Operations Verification Flags ({selectedExtraction.verification_flags.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-200/90">
                    {selectedExtraction.verification_flags.map((flag: string, idx: number) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Patient Name */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Patient Name</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.patient_name)}
                  </div>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Prescription Date */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Prescription Date</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.prescription_date)}
                  </div>
                  <input
                    type="text"
                    value={formData.prescription_date}
                    onChange={(e) => setFormData({ ...formData, prescription_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Doctor Name */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Prescribing Doctor</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.doctor_name)}
                  </div>
                  <input
                    type="text"
                    value={formData.doctor_name}
                    onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Doctor License */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Doctor License / NPI</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.doctor_license)}
                  </div>
                  <input
                    type="text"
                    value={formData.doctor_license}
                    onChange={(e) => setFormData({ ...formData, doctor_license: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Medication Name */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Medication Name</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.medication_name)}
                  </div>
                  <input
                    type="text"
                    value={formData.medication_name}
                    onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Strength */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Strength</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.strength)}
                  </div>
                  <input
                    type="text"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Dosage */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Dosage</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.dosage)}
                  </div>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Frequency</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.frequency)}
                  </div>
                  <input
                    type="text"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Duration</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.duration)}
                  </div>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Route */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Administration Route</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.route)}
                  </div>
                  <input
                    type="text"
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Quantity</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.quantity)}
                  </div>
                  <input
                    type="text"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Refills */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Refills Authorized</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.refills)}
                  </div>
                  <input
                    type="text"
                    value={formData.refills}
                    onChange={(e) => setFormData({ ...formData, refills: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-emerald-400 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Instructions */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Patient Instructions (SIG)</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.instructions)}
                  </div>
                  <textarea
                    rows={2}
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Clinical & Operational Notes</label>
                    {getConfidenceBadge(selectedExtraction.field_confidences?.notes)}
                  </div>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveVerification}
                    disabled={loading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                  >
                    ✓ Save Verification & Confirm Data
                  </button>
                  <button
                    onClick={downloadJson}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    📥 Export JSON
                  </button>
                  <a
                    href={getExtractionDocxUrl(selectedExtraction.extraction_id)}
                    download
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition"
                  >
                    📄 Export DOCX
                  </a>
                </div>

                <Link
                  href="/"
                  className="text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  View Operations Dashboard →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: Operations Queue / Extraction History Table */}
        <section className="mt-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Prescription Operations History</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recent prescriptions processed through the AI Intelligence Assistant.
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-cyan-300">
                Total Processed: {extractions.length}
              </span>
            </div>

            {extractions.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No prescriptions processed yet. Upload a prescription above or load a sample!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Extraction ID</th>
                      <th className="px-4 py-3">Document File</th>
                      <th className="px-4 py-3">Patient Name</th>
                      <th className="px-4 py-3">Medication</th>
                      <th className="px-4 py-3">Doctor</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {extractions.map((item) => (
                      <tr
                        key={item.extraction_id}
                        className={`transition cursor-pointer ${
                          selectedExtraction?.extraction_id === item.extraction_id
                            ? "bg-cyan-500/10"
                            : "hover:bg-slate-800/40"
                        }`}
                        onClick={() => selectItem(item)}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-cyan-400">{item.extraction_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-300">{item.file_name}</td>
                        <td className="px-4 py-3 font-semibold text-white">{item.extracted_data?.patient_name || "--"}</td>
                        <td className="px-4 py-3 font-semibold text-cyan-300">
                          {item.extracted_data?.medication_name} {item.extracted_data?.strength}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{item.extracted_data?.doctor_name || "--"}</td>
                        <td className="px-4 py-3">{getConfidenceBadge(item.overall_confidence)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              item.verification_status === "CONVERTED_TO_CASE"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : item.verification_status === "VERIFIED"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {item.verification_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectItem(item);
                            }}
                            className="text-xs font-semibold text-cyan-400 hover:underline"
                          >
                            Inspect & Edit →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* JSON VIEW MODAL */}
      {showJsonModal && selectedExtraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>{`{ }`}</span> Internal Structured JSON [{selectedExtraction.extraction_id}]
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 leading-relaxed">
              <pre>{JSON.stringify(selectedExtraction, null, 2)}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={copyJsonToClipboard}
                className="rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition"
              >
                📋 Copy Structured JSON
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
