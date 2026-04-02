"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Step = "request" | "verify";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown when entering the verify step
  useEffect(() => {
    if (step !== "verify") return;
    setSecondsLeft(600);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step]);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  async function handleRequestOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/request-otp", { method: "POST" });
      if (res.status === 429) {
        setError("Un code a déjà été envoyé récemment. Patientez 1 minute.");
        return;
      }
      if (!res.ok) {
        setError("Erreur lors de l'envoi. Réessayez.");
        return;
      }
      setStep("verify");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!/^\d{6}$/.test(code)) {
      setError("Le code doit contenir exactement 6 chiffres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 401) {
        setError("Code invalide ou expiré.");
        return;
      }
      if (!res.ok) {
        setError("Erreur serveur. Réessayez.");
        return;
      }
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg-page) px-4">
      <div className="w-full max-w-sm bg-(--bg-surface) rounded-2xl shadow-lg border border-(--border-default) p-8 flex flex-col gap-6">
        {/* Logo */}
        <div className="text-center">
          <span className="text-lg font-semibold text-(--text-primary) tracking-tight">
            Basis Norm Explorer
          </span>
          <p className="text-xs text-(--text-muted) mt-1">Espace administration</p>
        </div>

        <div className="w-full h-px bg-(--border-default)" />

        {step === "request" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--text-secondary) text-center">
              Accès réservé. Un code vous sera envoyé par email.
            </p>
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi en cours…" : "Recevoir le code"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--text-secondary) text-center">
              Saisissez le code à 6 chiffres reçu par email.
            </p>

            <div className="text-center">
              <span
                className={`text-xs font-mono tabular-nums ${
                  secondsLeft < 60 ? "text-red-500" : "text-(--text-muted)"
                }`}
              >
                Expire dans {formatTime(secondsLeft)}
              </span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-widest py-3 rounded-xl border border-(--border-default) bg-(--bg-page) text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || secondsLeft === 0 || code.length < 6}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Vérification…" : "Valider"}
            </button>

            <button
              onClick={() => { setStep("request"); setCode(""); setError(null); }}
              className="text-xs text-(--text-muted) hover:text-(--text-secondary) text-center transition-colors"
            >
              Renvoyer un code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
