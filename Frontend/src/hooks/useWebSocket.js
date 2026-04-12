import { useEffect, useState } from "react";

export default function useWebSocket(url) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("🟢 WebSocket Connected");
      setConnected(true);
    };

    ws.onclose = () => {
      console.log("🔴 WebSocket Disconnected");
      setConnected(false);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);        // Demo.jsx handles everything from here
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { data, connected };
}