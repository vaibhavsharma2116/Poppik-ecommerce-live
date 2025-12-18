import React, { useEffect, useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailLocked, setEmailLocked] = useState(false);

  const sendReset = async (targetEmail: string) => {
    if (!targetEmail) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    }
  };

  // On load, try to auto-detect user's email:
  // 1) from URL query `?email=...` (login page)
  // 2) from logged-in user in localStorage (profile page)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const emailFromQuery = params.get("email");

      let resolvedEmail = emailFromQuery || "";

      if (!resolvedEmail) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.email) {
            resolvedEmail = parsed.email;
          }
        }
      }

      if (resolvedEmail) {
        setEmail(resolvedEmail);
        setEmailLocked(true);
        // Auto-send reset link once email is known
        sendReset(resolvedEmail);
      }
    } catch {
      // ignore and fall back to manual input
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendReset(email);
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Forgot Password</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {emailLocked
            ? "We will send reset instructions to your registered email."
            : "Enter your email to receive reset instructions."}
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!emailLocked && (
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
          )}

          {emailLocked && (
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
              Reset link will be sent to: <span className="font-medium">{email}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              disabled={status === "sending" || !email}
            >
              {status === "sending" ? "Sending..." : "Send reset link"}
            </button>
          </div>

          {status === "sent" && (
            <p className="text-sm text-green-600">
              If that email exists, we've sent reset instructions.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">There was an error. Please try again later.</p>
          )}
        </form>
      </div>
    </div>
  );
}
