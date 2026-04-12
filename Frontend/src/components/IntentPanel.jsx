export default function IntentPanel({ intent, sentence }) {
  return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
      <h2 className="text-xl font-bold mb-2">Detected Intent</h2>
      <p className="text-3xl font-semibold text-green-400">{intent}</p>

      <h2 className="text-xl font-bold mt-6">Generated Sentence</h2>
      <p className="text-lg text-gray-300">{sentence}</p>
    </div>
  );
}
