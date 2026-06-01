import type { Request } from "express";

type SessionUser = { id: string; role: string };

/** Resolve which patient's billing data may be accessed. */
export function resolvePatientBillingId(
  req: Request,
  paramPatientId?: string,
): { patientId: string } | { error: string; status: number } {
  const user = (req as any).user as SessionUser;

  if (user.role === "patient") {
    if (paramPatientId && paramPatientId !== user.id) {
      return { error: "Forbidden: cannot access another patient's billing", status: 403 };
    }
    return { patientId: user.id };
  }

  if (user.role === "admin") {
    const patientId = paramPatientId || user.id;
    if (!patientId) {
      return { error: "Patient ID is required", status: 400 };
    }
    return { patientId };
  }

  return { error: "Forbidden: billing access is restricted", status: 403 };
}
