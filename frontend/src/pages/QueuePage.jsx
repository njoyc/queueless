import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function QueuePage() {
  const { serviceId } = useParams();

  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQueue() {
    try {
      const response = await api.get(`/queue/${serviceId}/status`);
      setQueue(response.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to load queue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/queue/${serviceId}/ws`
    );

    ws.onmessage = () => {
      loadQueue();
    };

    ws.onerror = () => {
      console.log("WebSocket connection error");
    };

    return () => {
      ws.close();
    };
  }, [serviceId]);

  if (loading) {
    return (
      <section className="dashboard-page">
        <p>Loading queue...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-page">
        <p className="eyebrow">QUEUE</p>
        <h1>Unable to load queue.</h1>
        <p>{error}</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">LIVE QUEUE</p>

        <h1>Your queue status.</h1>

        <p>
          Track your position and receive real-time updates.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card featured-card">
          <span className="dashboard-icon">YOUR TOKEN</span>

          <h2>
            {queue?.my_token ?? "—"}
          </h2>

          <p>
            Your position:
            <strong>
              {" "}
              {queue?.my_position ?? "—"}
            </strong>
          </p>
        </div>

        <div className="dashboard-card">
          <span className="dashboard-icon">
            NOW SERVING
          </span>

          <h2>
            {queue?.current_token ?? "—"}
          </h2>

          <p>
            Current token being served.
          </p>
        </div>

        <div className="dashboard-card">
          <span className="dashboard-icon">
            WAITING
          </span>

          <h2>
            {queue?.waiting_count ?? 0}
          </h2>

          <p>
            People currently waiting in this queue.
          </p>
        </div>
      </div>
    </section>
  );
}

export default QueuePage;