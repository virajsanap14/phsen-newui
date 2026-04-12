import React, { useState } from 'react';
import { api } from '../config';
import '../styles/PredictionForm.css';

export function PredictionForm() {
  const [file, setFile] = useState<File | null>(null);
  const [sampleMass, setSampleMass] = useState(2.0);
  const [volumeFiltrate, setVolumeFiltrate] = useState(6.0);
  const [volumeExtraction, setVolumeExtraction] = useState(20.0);
  const [volumeFinal, setVolumeFinal] = useState(10.0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sample_mass', sampleMass.toString());
    formData.append('volume_filtrate', volumeFiltrate.toString());
    formData.append('volume_extraction', volumeExtraction.toString());
    formData.append('volume_final', volumeFinal.toString());

    try {
      const response = await fetch(api('/api/predict'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to predict');
      }

      setResults(data.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="prediction-section" id="prediction-tool">
      <div className="prediction-container">
        <h2>Phosphorus Prediction Model</h2>
        <p>Upload your raw Nix CSV file to generate predictions.</p>

        <form onSubmit={handleSubmit} className="prediction-form">
          <div className="form-group full-width">
            <label htmlFor="csv-upload">Raw Nix CSV File</label>
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="sample-mass">Sample Mass (g)</label>
              <input
                type="number"
                id="sample-mass"
                value={sampleMass}
                step="0.1"
                onChange={(e) => setSampleMass(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="volume-filtrate">Volume Filtrate (mL)</label>
              <input
                type="number"
                id="volume-filtrate"
                value={volumeFiltrate}
                step="0.1"
                onChange={(e) => setVolumeFiltrate(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="volume-extraction">Volume Extraction (mL)</label>
              <input
                type="number"
                id="volume-extraction"
                value={volumeExtraction}
                step="0.1"
                onChange={(e) => setVolumeExtraction(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="volume-final">Volume Final (mL)</label>
              <input
                type="number"
                id="volume-final"
                value={volumeFinal}
                step="0.1"
                onChange={(e) => setVolumeFinal(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : 'Generate Predictions'}
          </button>
        </form>

        {results && results.length > 0 && (
          <div className="results-container">
            <h3>Prediction Results</h3>
            <div className="table-responsive">
              <table className="results-table">
                <thead>
                  <tr>
                    {Object.keys(results[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((val: any, idx) => (
                        <td key={idx}>{typeof val === 'number' ? val.toFixed(4) : val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
