import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Panel } from "./panel";

function Fixture() {
  return (
    <Panel title="Fissures" count={3}>
      <table>
        <tbody>
          <tr>
            <td>Tessera, Venus</td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

describe("Panel collapse", () => {
  beforeEach(() => window.localStorage.clear());

  it("condenses to its header row and opens back up from the toggle", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    expect(screen.getByRole("table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse Fissures" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand Fissures" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("keeps the count readable while collapsed", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Collapse Fissures" }));
    expect(screen.getByText("3")).toBeVisible();
  });

  it("remembers the choice when the panel is rendered again", async () => {
    const user = userEvent.setup();
    const first = render(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Collapse Fissures" }));
    first.unmount();

    render(<Fixture />);
    expect(await screen.findByRole("button", { name: "Expand Fissures" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
