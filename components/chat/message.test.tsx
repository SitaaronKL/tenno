import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Message } from "./message";

function assistant(text: string) {
  return { key: "a", role: "assistant", text, status: "success", order: 0, stepOrder: 0 };
}

describe("the agent's face in chat", () => {
  it("answers under the ASCII mark, the same one the landing page draws", () => {
    const { container } = render(<Message message={assistant("Axi Survival on Ani.")} />);

    expect(screen.getByText("Axi Survival on Ani.")).toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("puts no mark on what the player said", () => {
    const { container } = render(
      <Message message={{ key: "u", role: "user", text: "any fissures", status: "success", order: 0, stepOrder: 0 }} />,
    );

    expect(screen.getByText("any fissures")).toBeInTheDocument();
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
  });
});
