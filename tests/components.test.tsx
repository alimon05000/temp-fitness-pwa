import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { GoalEditor } from "../src/editors";
import { makeInitialState, type State } from "../src/domain";
it("creates the requested numeric goal through the actual form", () => {
  let state = makeInitialState();
  render(
    <GoalEditor
      state={state}
      mutate={(fn) => {
        state = fn(state) as State;
      }}
      close={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Исходный результат"), {
    target: { value: "4:03" },
  });
  fireEvent.change(screen.getByLabelText("Целевой результат"), {
    target: { value: "3:30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить цель" }));
  expect(state.goals[0].baseline).toBe(243);
  expect(state.goals[0].target).toBe(210);
});
