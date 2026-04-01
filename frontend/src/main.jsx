import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Note: StrictMode removed intentionally — it causes WebRTC useEffect to fire twice
// which breaks peer connection initialization
createRoot(document.getElementById("root")).render(<App />);
