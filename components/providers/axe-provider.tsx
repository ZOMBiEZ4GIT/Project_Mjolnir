"use client";

// Axe-core accessibility auditing — development mode only.
// Logs WCAG violations to the browser console as warnings.
// Tree-shaken in production builds (dynamic import guarded by NODE_ENV check).

import { useEffect } from "react";

export function AxeProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const initAxe = async () => {
      const React = await import("react");
      const ReactDOM = await import("react-dom");
      const axe = await import("@axe-core/react");
      axe.default(React.default, ReactDOM, 1000);
    };

    initAxe();
  }, []);

  return null;
}
