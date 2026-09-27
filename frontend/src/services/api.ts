const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://backend-gray-one-39.vercel.app"
).replace(/\/$/, "");



export async function getCases() {
  const response = await fetch(`${API_BASE_URL}/cases`);
  if (!response.ok) {
    throw new Error("Unable to load refill cases");
  }
  return response.json();
}

export async function getCase(caseId: string) {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}`);
  if (!response.ok) {
    throw new Error("Unable to load refill case");
  }
  return response.json();
}

export async function getAudit(caseId: string) {
  const response = await fetch(`${API_BASE_URL}/audit/${caseId}`);
  if (!response.ok) {
    throw new Error("Unable to load audit timeline");
  }
  return response.json();
}

export async function approveCase(caseId: string) {
  const response = await fetch(`${API_BASE_URL}/approve/${caseId}`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to approve refill");
  }
  return data;
}

export async function confirmPharmacy(caseId: string) {
  const response = await fetch(`${API_BASE_URL}/confirm-pharmacy/${caseId}`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to confirm pharmacy");
  }
  return data;
}

export async function createRefillCase(payload: {
  patient_name: string;
  medication: string;
  pharmacy_message: string;
}) {
  const response = await fetch(`${API_BASE_URL}/refill-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to create refill request");
  }
  return data;
}

// ---------------------------------------------------------
// AI Prescription Intelligence Assistant API Calls
// ---------------------------------------------------------

export async function uploadPrescriptions(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE_URL}/prescription/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Prescription extraction failed");
  }
  return data;
}

export async function loadSamplePrescription(sampleType: string) {
  const response = await fetch(`${API_BASE_URL}/prescription/sample-load/${sampleType}`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to load sample prescription");
  }
  return data;
}

export async function getExtractions() {
  const response = await fetch(`${API_BASE_URL}/prescription/extractions`);
  if (!response.ok) {
    throw new Error("Unable to fetch prescription extractions");
  }
  return response.json();
}

export async function getExtraction(extractionId: string) {
  const response = await fetch(`${API_BASE_URL}/prescription/extractions/${extractionId}`);
  if (!response.ok) {
    throw new Error("Unable to fetch prescription extraction details");
  }
  return response.json();
}

export async function verifyExtraction(extractionId: string, payload: any) {
  const response = await fetch(`${API_BASE_URL}/prescription/verify/${extractionId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Verification save failed");
  }
  return data;
}

export async function createCaseFromExtraction(extractionId: string) {
  const response = await fetch(`${API_BASE_URL}/prescription/create-case/${extractionId}`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Refill case creation from prescription failed");
  }
  return data;
}

export function getExtractionDocxUrl(extractionId: string) {
  return `${API_BASE_URL}/prescription/extractions/${extractionId}/docx`;
}