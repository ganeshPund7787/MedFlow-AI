import { Navigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/global/Loader";
import { getPostLoginPath } from "@/lib/auth-redirect";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader label="Loading..." />
      </div>
    );
  }

  if (session) {
    return (
      <Navigate
        to={getPostLoginPath(session.user.role || undefined, session.user.id)}
        replace
      />
    );
  }

  return <Navigate to="/login" replace />;
}