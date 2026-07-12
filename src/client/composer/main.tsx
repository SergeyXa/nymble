import React from "react";
import { createRoot } from "react-dom/client";
import { Page } from "./Page";

const root = document.querySelector("#composerRoot");

if (root) {
  createRoot(root).render(<Page />);
}
