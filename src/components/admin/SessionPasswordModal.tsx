import { useEffect, useState } from "react";
import { getAdminSessionPassword } from "@/lib/firestore";

interface SessionPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SessionPasswordModal({ isOpen, onSuccess, onCancel }: SessionPasswordModalProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setError("");
      setChecking(false);
    }
  }, [isOpen]);

  async function verify() {
    setChecking(true);
    setError("");
    try {
      const correctPwd = await getAdminSessionPassword();
      if (input === correctPwd) {
        onSuccess();
      } else {
        setError("Incorrect password. Contact the superadmin.");
      }
    } catch {
      setError("Failed to verify. Try again.");
    } finally {
      setChecking(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-[#0d0d1a] p-6">
        <p className="hk-gold-text text-xs uppercase tracking-widest">Admin Verification</p>
        <h2 className="mt-2 font-serif text-xl text-foreground">Enter Session Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">This action requires the admin session password.</p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          placeholder="Session password"
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={verify}
            disabled={checking || !input}
            className="hk-button-primary flex-1 rounded-full py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {checking ? "Checking…" : "Confirm"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-border py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
