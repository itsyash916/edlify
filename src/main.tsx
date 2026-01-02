import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/dancing-script/400.css";
import "@fontsource/dancing-script/600.css";

createRoot(document.getElementById("root")!).render(<App />);
