import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Application from "./Router";
import { createSession, steps } from "./flow";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});
describe("Routing e contesto della simulazione", () => {
  it("risolve l'indice del percorso alla pagina della sessione", async () => {
    window.location.hash = "/procedura";
    render(<Application />);
    await waitFor(() => expect(window.location.hash).toBe("#/procedura/preparation"));
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Preparazione");
  });
  it("richiede una nuova conferma di ventilazione quando si rientra nella pagina", async () => {
    sessionStorage.setItem("nls-simulation-v1", JSON.stringify({...createSession(), step: "hr60", stack: ["correctives"]}));
    window.location.hash = "/procedura/hr60";
    const user = userEvent.setup();
    render(<Application />);
    await user.click(screen.getByRole("checkbox", {name: "Il team conferma la ventilazione efficace"}));
    expect((screen.getByRole("button", {name: /FC <60\/min/}) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole("button", {name: "Passo precedente"}));
    await user.click(screen.getByRole("button", {name: "Prosegui"}));
    expect(screen.getByRole("checkbox", {name: "Il team conferma la ventilazione efficace"}).getAttribute("aria-checked")).toBe("false");
    expect((screen.getByRole("button", {name: /FC <60\/min/}) as HTMLButtonElement).disabled).toBe(true);
  });
  it("normalizza un indirizzo arbitrario senza saltare le conferme", async () => {
    window.location.hash = "/procedura/compressions";
    render(<Application />);
    await waitFor(() =>
      expect(window.location.hash).toBe("#/procedura/preparation"),
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Preparazione",
    );
  });
  it("mantiene il contesto tra passaggi, supporti e ricarica", async () => {
    const user = userEvent.setup();
    const view = render(<Application />);
    await user.click(
      screen.getByRole("button", { name: "Registra interventi (facoltativo)" }),
    );
    await user.click(screen.getAllByRole("checkbox")[0]);
    await user.click(screen.getByRole("button", { name: "Prosegui" }));
    await waitFor(() => expect(window.location.hash).toBe("#/procedura/birth"));
    await user.click(screen.getByRole("button", { name: "MR SOPA" }));
    expect(window.location.hash).toBe("#/procedura/birth?panel=mrsopa");
    view.unmount();
    render(<Application />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Chiudi" }));
    await user.click(screen.getByRole("button", { name: "Passo precedente" }));
    await user.click(
      screen.getByRole("button", { name: "Registra interventi (facoltativo)" }),
    );
    expect(
      (screen.getAllByRole("checkbox")[0] as HTMLButtonElement).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    const stored = JSON.parse(sessionStorage.getItem("nls-simulation-v1")!);
    expect(
      stored.events.some((e: { type: string }) => e.type === "correction"),
    ).toBe(true);
  });
  it("riparte da dati locali corrotti e ripulisce un pannello sconosciuto", async () => {
    sessionStorage.setItem(
      "nls-simulation-v1",
      JSON.stringify({ ...createSession(), step: "__proto__" }),
    );
    window.location.hash = "/procedura/preparation?panel=unknown";
    render(<Application />);
    await waitFor(() =>
      expect(window.location.hash).toBe("#/procedura/preparation"),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("azzera anche il contesto persistito quando si avvia una nuova sessione", async () => {
    const user = userEvent.setup();
    render(<Application />);
    await user.click(screen.getByRole("button", { name: "Prosegui" }));
    await user.click(screen.getByRole("button", { name: "Nuova sessione" }));
    await user.click(
      screen.getByRole("button", { name: "Azzera e ricomincia" }),
    );
    await waitFor(() =>
      expect(window.location.hash).toBe("#/procedura/preparation"),
    );
    expect(
      JSON.parse(sessionStorage.getItem("nls-simulation-v1")!).events,
    ).toEqual([]);
  });
  it.each(Object.keys(steps))(
    "monta la pagina della route %s",
    async (step) => {
      sessionStorage.setItem(
        "nls-simulation-v1",
        JSON.stringify({ ...createSession(), step }),
      );
      window.location.hash = `/procedura/${step}`;
      render(<Application />);
      expect(
        screen
          .getByRole("region", { name: "Passaggio attuale" })
          .getAttribute("data-step"),
      ).toBe(step);
    },
  );
  it("mantiene il layout comune montato quando cambia la pagina", async () => {
    const user = userEvent.setup();
    render(<Application />);
    await user.click(screen.getByRole("button", { name: "Guida vocale" }));
    const layout = screen.getByRole("banner");
    await user.click(screen.getByRole("button", { name: "Prosegui" }));
    await waitFor(() => expect(window.location.hash).toBe("#/procedura/birth"));
    expect(screen.getByRole("banner")).toBe(layout);
    expect(
      screen
        .getByRole("button", { name: "Guida vocale" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });
  it("usa una route separata per la conclusione e la ripristina", async () => {
    const session = { ...createSession(), step: "skin" };
    sessionStorage.setItem("nls-simulation-v1", JSON.stringify(session));
    window.location.hash = "/procedura/skin";
    const user = userEvent.setup();
    const view = render(<Application />);
    await user.click(screen.getByRole("button", { name: "Concludi scenario" }));
    await waitFor(() =>
      expect(window.location.hash).toBe("#/procedura/conclusa"),
    );
    view.unmount();
    render(<Application />);
    expect(
      screen.getByRole("heading", { name: "Simulazione conclusa" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Passaggio attuale" }),
    ).toBeNull();
  });
});
