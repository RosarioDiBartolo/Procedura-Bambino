import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Application from "./Router";
import { createSession, steps } from "./flow";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});
describe("Routing e contesto della simulazione", () => {
  it("mantiene la stessa navigazione e torna al passaggio della sessione", async () => {
    sessionStorage.setItem("nls-simulation-v1", JSON.stringify({
      ...createSession(), step: "birth", stack: ["preparation"],
    }));
    window.location.hash = "/procedura/birth";
    const user = userEvent.setup();
    render(<Application />);
    const navbar = screen.getByRole("navigation", { name: "Navigazione principale" });
    const links = within(navbar);

    for (const name of ["Il progetto", "Guida rapida", "Privacy", "Note legali", "Simulazione"]) {
      const link = links.getByRole("link", { name });
      await user.click(link);
      expect(screen.getByRole("navigation", { name: "Navigazione principale" })).toBe(navbar);
      expect(link.getAttribute("aria-current")).toBe("page");
      expect(link.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
      const header = within(screen.getByRole("banner"));
      expect(header.getByText("Marco Di Bartolo")).toBeTruthy();
      expect(header.getByText("Rosario Di Bartolo")).toBeTruthy();
    }
    expect(window.location.hash).toBe("#/procedura/birth");
  });
  it("risolve l'indice del percorso alla pagina della sessione", async () => {
    window.location.hash = "/procedura";
    render(<Application />);
    await waitFor(() => expect(window.location.hash).toBe("#/procedura/preparation"));
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Preparazione");
  });
  it("conferma la ventilazione tramite la scelta del caso senza campi o checkbox", async () => {
    sessionStorage.setItem("nls-simulation-v1", JSON.stringify({...createSession(), step: "hr60", stack: ["correctives"]}));
    window.location.hash = "/procedura/hr60";
    const user = userEvent.setup();
    render(<Application />);
    expect(screen.queryByText("Dati della valutazione")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("Con ventilazione efficace confermata dal team")).toBeTruthy();
    await user.click(screen.getByRole("button", {name: /FC <60\/min/}));
    await waitFor(() => expect(window.location.hash).toBe("#/procedura/compressions"));
    const stored = JSON.parse(sessionStorage.getItem("nls-simulation-v1")!);
    expect(stored.events.at(-1).answers.effective).toBe(true);
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
    window.location.hash = "/procedura/birth?panel=mrsopa";
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
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
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Preparazione');
    expect(screen.queryByRole('dialog')).toBeNull();
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

    const layout = screen.getByRole("banner");
    await user.click(screen.getByRole("button", { name: "Prosegui" }));
    await waitFor(() => expect(window.location.hash).toBe("#/procedura/birth"));
    expect(screen.getByRole("banner")).toBe(layout);
    expect(screen.getByRole('group', {name: 'Controlli vocali'})).toBeTruthy();
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

beforeEach(() => { window.history.replaceState(null, '', '/#/procedura'); });
