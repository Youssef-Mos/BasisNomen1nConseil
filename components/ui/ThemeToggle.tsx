"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    
    try {
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      // Vérification que la classe a bien été ajoutée ou supprimée du DOM
      const isActuallyDark = document.documentElement.classList.contains("dark");
      
      if (isActuallyDark === next) {
        console.log(`OK : Thème ${next ? 'nuit' : 'jour'} appliqué avec succès.`);
      } else {
        console.error(`Erreur : Le thème ${next ? 'nuit' : 'jour'} n'a pas pu être appliqué au DOM.`);
      }

      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {
      console.error("Erreur critique lors de l'application du thème :", e);
    }
  }

  return (
    <button
      onClick={toggle}
      suppressHydrationWarning
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "9999px",
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--bg-surface)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {!ready ? null : dark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
