import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "otp_sent" | "verifying">("idle");
  const [identifierLocked, setIdentifierLocked] = useState(false);
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const otpAutoVerifyTriggeredRef = useRef(false);

  const isEmailIdentifier = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.substring(2);
    return cleaned;
  };

  const sendReset = async (value: string) => {
    if (!value) return;
    setStatus("sending");
    setErrorMessage(null);
    try {
      const trimmed = value.trim();
      if (isEmailIdentifier(trimmed)) {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });

        if (res.ok) {
          setStatus("sent");
        } else {
          const data = await res.json().catch(() => null);
          if (res.status === 404) {
            setErrorMessage("User not found");
          } else {
            setErrorMessage(data?.error || "There was an error. Please try again later.");
          }
          setStatus("error");
        }
      } else {
        const cleanedPhone = formatPhoneNumber(trimmed);
        // If user is re-sending OTP, clear existing OTP so we don't auto-verify stale code
        setOtp("");
        otpAutoVerifyTriggeredRef.current = false;
        const res = await fetch("/api/auth/forgot-password-phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: cleanedPhone }),
        });

        if (res.ok) {
          setStatus("otp_sent");
        } else {
          const data = await res.json().catch(() => null);
          if (res.status === 404) {
            setErrorMessage("User not found");
          } else {
            setErrorMessage(data?.error || "There was an error. Please try again later.");
          }
          setStatus("error");
        }
      }
    } catch (err) {
      setErrorMessage("There was an error. Please try again later.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (status !== "otp_sent") {
      otpAutoVerifyTriggeredRef.current = false;
      return;
    }

    if (otp.length === 6 && !otpAutoVerifyTriggeredRef.current) {
      otpAutoVerifyTriggeredRef.current = true;
      verifyOtpAndContinue();
    }
  }, [otp, status]);

  const verifyOtpAndContinue = async () => {
    if (!otp || otp.length !== 6) return;

    setStatus("verifying");
    setErrorMessage(null);
    try {
      const cleanedPhone = formatPhoneNumber(identifier.trim());
      const res = await fetch("/api/auth/forgot-password-phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanedPhone, otp }),
      });

      const data = await res.json();
      if (res.ok && data?.token) {
        setLocation(`/auth/reset-password?token=${encodeURIComponent(data.token)}`);
      } else {
        if (res.status === 404) {
          setErrorMessage("User not found");
          setStatus("error");
        } else {
          setErrorMessage(data?.error || "Invalid OTP");
          // Keep OTP UI visible so user can retry
          setStatus("otp_sent");
          otpAutoVerifyTriggeredRef.current = false;
        }
      }
    } catch {
      setErrorMessage("There was an error. Please try again later.");
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

      let resolvedIdentifier = emailFromQuery || "";

      if (!resolvedIdentifier) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.email) {
            resolvedIdentifier = parsed.email;
          }
        }
      }

      if (resolvedIdentifier) {
        setIdentifier(resolvedIdentifier);
        setIdentifierLocked(true);
        // Auto-send reset link once email is known
        sendReset(resolvedIdentifier);
      }
    } catch {
      // ignore and fall back to manual input
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendReset(identifier);
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Forgot Password</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {identifierLocked
            ? "We will start password reset using your registered email/mobile."
            : "Enter your email or mobile number to reset your password."}
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!identifierLocked && status !== "otp_sent" && status !== "verifying" && (
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="identifier" className="sr-only">
                  Email or phone
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                  placeholder="Email or phone number"
                />
              </div>
            </div>
          )}

          {identifierLocked && (
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
              Reset will be sent to: <span className="font-medium">{identifier}</span>
            </div>
          )}

          {(status === "otp_sent" || status === "verifying") && (
            <div className="space-y-3">
              <div className="text-sm text-gray-700">Enter the 6-digit OTP sent to your mobile.</div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button
                type="button"
                onClick={verifyOtpAndContinue}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                disabled={status === "verifying" || otp.length !== 6}
              >
                {status === "verifying" ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          )}

          {status !== "otp_sent" && status !== "verifying" && (
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                disabled={status === "sending" || !identifier}
              >
                {status === "sending" ? "Sending..." : "Send reset link"}
              </button>
            </div>
          )}

          {status === "sent" && (
            <p className="text-sm text-green-600">
              Reset instructions have been sent to your email.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">{errorMessage || "There was an error. Please try again later."}</p>
          )}
        </form>
      </div>
    </div>
  );
}
