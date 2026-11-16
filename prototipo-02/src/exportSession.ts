import type { Session } from "./flow";
export function exportSession(session: Session) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          prototype: 2,
          source: "Poster SIN 2025",
          purpose: "simulation",
          ...session,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nls-sessione-simulata.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
