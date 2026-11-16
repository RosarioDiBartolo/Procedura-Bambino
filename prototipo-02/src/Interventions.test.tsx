import { steps, createSession } from "./flow";
import { getInterventions } from "./actionDetails";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Application from "./Router";
// jsdom has no layout geometry; verify dialog semantics without waiting for shared-layout exits.
// The real expansion and focus restoration are also checked in the browser.
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  AnimatePresence: ({ children }: { children: import("react").ReactNode }) =>
    children,
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});
describe("Approfondimenti della preparazione", () => {
  it("apre un dettaglio accessibile senza registrare un intervento e torna alla scheda con Escape", async () => {
    const user = userEvent.setup();
    render(<Application />);
    const opener = screen.getByRole("button", {
      name: "Approfondisci: Counseling prenatale",
    });
    await user.click(opener);
    expect(
      screen.getByRole("dialog", { name: "Counseling prenatale" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Illustrazione: Counseling prenatale" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Ascoltare e chiarire" }),
    ).toBeTruthy();
    expect(
      JSON.parse(sessionStorage.getItem("nls-simulation-v1")!).events,
    ).toHaveLength(0);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
  it("mantiene le spunte dopo apertura, chiusura e ripristino del dettaglio", async () => {
    const user = userEvent.setup();
    const view = render(<Application />);
    await user.click(
      screen.getByRole("button", { name: "Registra interventi (facoltativo)" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Registra Briefing del team" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Approfondisci: Briefing del team" }),
    );
    expect(window.location.hash).toContain("panel=briefing");
    view.unmount();
    render(<Application />);
    expect(
      screen.getByRole("dialog", { name: "Briefing del team" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Torna agli interventi" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(
      screen.getByRole("button", { name: "Registra interventi (facoltativo)" }),
    );
    expect(
      screen
        .getByRole("checkbox", { name: "Registra Briefing del team" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
  it("mostra contenuti specifici per il materiale", async () => {
    const user = userEvent.setup();
    render(<Application />);
    await user.click(
      screen.getByRole("button", {
        name: "Approfondisci: Checklist del materiale",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Segnalare le criticità" }),
    ).toBeTruthy();
  });
  it.each(Object.values(steps).filter((step) => step.actions?.length))(
    "apre un intervento nella pagina $id senza alterare la sessione",
    async (step) => {
      sessionStorage.setItem(
        "nls-simulation-v1",
        JSON.stringify({ ...createSession(), step: step.id, birthAt: 1234 }),
      );
      window.location.hash = `/procedura/${step.id}`;
      const user = userEvent.setup();
      render(<Application />);
      const title = step.actions![0];
      await user.click(
        screen.getByRole("button", { name: `Approfondisci: ${title}` }),
      );
      expect(screen.getByRole("dialog", { name: title })).toBeTruthy();
      expect(
        screen.getByRole("img", { name: `Illustrazione: ${title}` }),
      ).toBeTruthy();
      expect(
        JSON.parse(sessionStorage.getItem("nls-simulation-v1")!).birthAt,
      ).toBe(1234);
      expect(
        JSON.parse(sessionStorage.getItem("nls-simulation-v1")!).events,
      ).toHaveLength(0);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(window.location.hash).toBe(`#/procedura/${step.id}`);
    },
  );
  it("copre ogni intervento del percorso con un approfondimento specifico", () => {
    for (const step of Object.values(steps)) {
      const details = getInterventions(step.id);
      expect(details.map((item) => item.title)).toEqual(step.actions ?? []);
      expect(new Set(details.map((item) => item.panel)).size).toBe(
        details.length,
      );
      for (const detail of details) {
        expect(detail.summary.length).toBeGreaterThan(20);
        expect(detail.intro.length).toBeGreaterThan(40);
        expect(detail.sections.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
