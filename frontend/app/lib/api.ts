import type {
  PaginatedResponse,
  Role,
  User,
  LabResult,
  ActivityLog,
  invoice,
} from "@/types";

export const API_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api`;

/**
 * Anti-Gravity Fetch Wrapper
 * - Handles Timeout
 * - Handles Network Failures
 * - Standardizes Error Responses
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "include", // Essential for session cookies
    });
    clearTimeout(id);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection.");
    }
    throw error;
  }
}

export const getUsers = async (params: {
  role: Role;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<User>> => {
  const query = new URLSearchParams({
    role: params.role,
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();

  return fetchWithTimeout(`${API_URL}/users?${query}`);
};

export const triggerAdmission = async ({
  patientId,
  admissionReason,
}: {
  patientId: string;
  admissionReason: string;
}) => {
  return fetchWithTimeout(`${API_URL}/users/${patientId}/admit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admissionReason }),
  });
};

interface UpdateUserParams {
  userId: string;
  userData: Partial<User> & Record<string, any>;
}

export const updateUser = async ({ userId, userData }: UpdateUserParams) => {
  return fetchWithTimeout(`${API_URL}/users/update/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
};

export const createActityLog = async (data: {
  userId: string;
  action: string;
  details?: string;
}) => {
  return fetchWithTimeout(`${API_URL}/activity-logs/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getPatientLabResults = async (
  patientId: string,
): Promise<LabResult[]> => {
  return fetchWithTimeout(`${API_URL}/lab-results/patient/${patientId}`);
};

export const getAllLabResults = async (params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<LabResult & { patient: any }>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
    ...(params.status && { status: params.status }),
  }).toString();
  return fetchWithTimeout(`${API_URL}/lab-results?${query}`);
};

export const updateLabResult = async ({
  id,
  data,
}: {
  id: string;
  data: { doctorNotes?: string; status?: string; aiAnalysis?: string };
}) => {
  return fetchWithTimeout(`${API_URL}/lab-results/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const createLabResult = async (data: {
  patientId: string;
  testType: string;
  bodyPart: string;
  imageUrl: string;
  aiAnalysis?: string;
}) => {
  return fetchWithTimeout(`${API_URL}/lab-results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const deleteFile = async ({ file }: { file: string }) => {
  return fetchWithTimeout(`${API_URL}/uploadthing/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileUrl: file }),
  });
};

export const getActivityLogs = async (params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ActivityLog>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();

  return fetchWithTimeout(`${API_URL}/activity-logs?${query}`);
};

export const getUserById = async (userId: string) => {
  return fetchWithTimeout(`${API_URL}/users/profile/${userId}`);
};

export const getMyActiveInvoice = async (patientId?: string) => {
  try {
    const query = patientId
      ? `?patientId=${encodeURIComponent(patientId)}`
      : "";
    return await fetchWithTimeout(
      `${API_URL}/invoices/my-active-invoice${query}`,
    );
  } catch (error: any) {
    if (error.message.includes("404")) return null;
    throw error;
  }
};

export const createCheckoutSession = async (invoiceId: string) => {
  return fetchWithTimeout(`${API_URL}/invoices/${invoiceId}/checkout`, {
    method: "POST",
  });
};

export const confirmPolarCheckout = async (checkoutId: string) => {
  return fetchWithTimeout(`${API_URL}/invoices/confirm-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkoutId }),
  });
};

export const getBillingHistory = async (userId: string) => {
  return fetchWithTimeout(`${API_URL}/invoices/history/${userId}`);
};

export const getAllInvoices = async (data?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<invoice>> => {
  return fetchWithTimeout(`${API_URL}/invoices`, {
    method: "POST", // Some APIs use POST for filtering/pagination
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const polarPortalLink = async (userId: string) => {
  return fetchWithTimeout(`${API_URL}/users/polar-portal/${userId}`);
};

export const fetchNotifications = async () => {
  return fetchWithTimeout(`${API_URL}/notifications`);
};

export const markAsRead = async (id: string) => {
  return fetchWithTimeout(`${API_URL}/notifications/${id}/read`, {
    method: "POST",
  });
};

export const getNursingPatients = async (params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<User & { latestVitals: any }>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();
  return fetchWithTimeout(`${API_URL}/nursing/patients?${query}`);
};

export const recordVitals = async (data: {
  patientId: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  notes?: string;
}) => {
  return fetchWithTimeout(`${API_URL}/nursing/vitals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getPatientVitals = async (patientId: string): Promise<any[]> => {
  return fetchWithTimeout(`${API_URL}/nursing/vitals/${patientId}`);
};

export const getPharmacyInventory = async (params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<any>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
    ...(params.search && { search: params.search }),
  }).toString();
  return fetchWithTimeout(`${API_URL}/pharmacy/inventory?${query}`);
};

export const addPharmacyMedication = async (data: {
  name: string;
  code: string;
  description?: string;
  stock: number;
  priceInCents: number;
}) => {
  return fetchWithTimeout(`${API_URL}/pharmacy/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getPrescriptions = async (params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<any>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
    ...(params.status && { status: params.status }),
  }).toString();
  return fetchWithTimeout(`${API_URL}/pharmacy/prescriptions?${query}`);
};

export const createPrescription = async (data: {
  patientId: string;
  medications: Array<{
    medicationId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }>;
  notes?: string;
}) => {
  return fetchWithTimeout(`${API_URL}/pharmacy/prescriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const dispensePrescription = async (prescriptionId: string) => {
  return fetchWithTimeout(`${API_URL}/pharmacy/dispense/${prescriptionId}`, {
    method: "POST",
  });
};

export const getFinancialStats = async (): Promise<any> => {
  return fetchWithTimeout(`${API_URL}/invoices/stats`);
};

export const getRevenueOverview = async (): Promise<{
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  chartData: { name: string; total: number }[];
}> => {
  return fetchWithTimeout(`${API_URL}/payments/revenue-overview`);
};

export const getMyPaymentHistory = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams({
    page: (params?.page || 1).toString(),
    limit: (params?.limit || 10).toString(),
  }).toString();
  return fetchWithTimeout(`${API_URL}/payments/my-history?${query}`);
};

export const getSettings = async (): Promise<any> => {
  return fetchWithTimeout(`${API_URL}/settings`);
};

export const updateSettings = async (data: any) => {
  return fetchWithTimeout(`${API_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getBackups = async (params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<any>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();
  return fetchWithTimeout(`${API_URL}/settings/backups?${query}`);
};

export const generateBackup = async () => {
  return fetchWithTimeout(`${API_URL}/settings/backups`, {
    method: "POST",
  });
};

export const restoreBackup = async (id: string) => {
  return fetchWithTimeout(`${API_URL}/settings/backups/${id}/restore`, {
    method: "POST",
  });
};

export const getAppointments = async (params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<any>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();
  return fetchWithTimeout(`${API_URL}/appointments?${query}`);
};

export const createAppointment = async (data: {
  patientId: string;
  doctorId: string;
  nurseId?: string;
  date: string;
  time: string;
  reason: string;
  isVirtual: boolean;
}) => {
  return fetchWithTimeout(`${API_URL}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const updateAppointment = async ({
  id,
  data,
}: {
  id: string;
  data: {
    status?: string;
    date?: string;
    time?: string;
    reason?: string;
  };
}) => {
  return fetchWithTimeout(`${API_URL}/appointments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};
