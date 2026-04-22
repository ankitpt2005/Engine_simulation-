import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders laboratory shell", () => {
  render(<App />);
  expect(screen.getByText(/Digital engine laboratory/i)).toBeInTheDocument();
});
