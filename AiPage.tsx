import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Prediction = {
  disease?: string;
  remedy?: string;
  yoga?: string;
  confidence?: number;
};

type Suggestion = {
  id: number;
  suggestionText?: string;
  createdAt?: string;
  doctorName?: string;
};

export default function AiPage() {
  const { auth } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState(30);
  const [dosha, setDosha] = useState("Vata");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(true);

  // Pre-fill from patient profile
  useEffect(() => {
    if (auth.role !== "PATIENT") {
      setPrefilling(false);
      return;
    }
    api
      .get<{ symptoms?: string; age?: number; dosha?: string }>("/patients/me")
      .then((r) => {
        if (r.data.symptoms) setSymptoms(r.data.symptoms);
        if (r.data.age) setAge(r.data.age);
        if (r.data.dosha) setDosha(r.data.dosha);
      })
      .catch(() => {})
      .finally(() => setPrefilling(false));
  }, [auth.role]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setPrediction(null);
    setSuggestions([]);
    try {
      const { data } = await api.post<Prediction>("/predict", { symptoms, age, dosha });
      setPrediction(data);

      // Also fetch doctor suggestions if patient
      if (auth.role === "PATIENT" && auth.profileId) {
        api
          .get<Suggestion[]>(`/suggestions/patient/${auth.profileId}`)
          .then((r) => setSuggestions(r.data))
          .catch(() => {});
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax.response?.data?.message ?? ax.message ?? "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const confidencePct =
    prediction?.confidence != null ? Math.round(prediction.confidence * 100) : null;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ayur-leaf">AI Health Insights</h2>
        <p className="text-sm text-stone-500 mt-1">
          Powered by a Random Forest model trained on Ayurvedic data.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        {prefilling && (
          <p className="text-xs text-stone-400 flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-ayur-moss border-t-transparent rounded-full animate-spin inline-block" />
            Loading your profile…
          </p>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <form className="space-y-3" onSubmit={run}>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Symptoms
            </label>
            <textarea
              className="w-full border border-stone-300 rounded-lg px-3 py-2 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-ayur-moss"
              placeholder="e.g. headache, fatigue, joint pain"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-700 mb-1">Age</label>
              <input
                type="number"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                value={age}
                min={0}
                max={120}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-700 mb-1">Dosha</label>
              <select
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                value={dosha}
                onChange={(e) => setDosha(e.target.value)}
              >
                <option>Vata</option>
                <option>Pitta</option>
                <option>Kapha</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-ayur-moss text-white font-semibold hover:bg-ayur-leaf transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Analysing…" : "Get AI Insights"}
          </button>
        </form>
      </div>

      {/* Prediction result */}
      {prediction && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h3 className="font-semibold text-ayur-leaf">AI Prediction</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔬</span>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">Predicted condition</p>
                <p className="font-semibold text-stone-800">{prediction.disease ?? "—"}</p>
              </div>
            </div>

            {confidencePct !== null && (
              <div>
                <div className="flex justify-between text-xs text-stone-500 mb-1">
                  <span>Confidence</span>
                  <span>{confidencePct}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div
                    className="bg-ayur-moss h-2 rounded-full transition-all"
                    style={{ width: `${confidencePct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">Ayurvedic remedy</p>
                <p className="text-stone-700 text-sm">{prediction.remedy ?? "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">🧘</span>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">Yoga suggestion</p>
                <p className="text-stone-700 text-sm">{prediction.yoga ?? "—"}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">
            ⚠️ Informational only — not a clinical diagnosis. Consult a qualified practitioner.
          </p>
        </div>
      )}

      {/* Doctor suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <h3 className="font-semibold text-ayur-leaf">Doctor Suggestions</h3>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-stone-50 rounded-xl p-3 text-sm">
                <p className="text-stone-700">{s.suggestionText}</p>
                {s.createdAt && (
                  <p className="text-xs text-stone-400 mt-1">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
