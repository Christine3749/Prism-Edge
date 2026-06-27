import { useEffect, useState } from "react";
import LoginPage from "./LoginPage";
import MembershipPage from "./MembershipPage";
import PrismEdgeTerminal from "./PrismEdgeTerminal";

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    function handlePopState() {
      setPath(currentPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (path === "/login") return <LoginPage />;
  if (path === "/membership") return <MembershipPage />;
  return <PrismEdgeTerminal />;
}
