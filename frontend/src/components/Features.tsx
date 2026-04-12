import React, { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react'
import { api } from '../config'
import '../styles/Features.css'

export function Features() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [sampleMass, setSampleMass] = useState(2.0)
  const [volumeFiltrate, setVolumeFiltrate] = useState(6.0)
  const [volumeExtraction, setVolumeExtraction] = useState(20.0)
  const [volumeFinal, setVolumeFinal] = useState(10.0)

  const [modelExists, setModelExists] = useState<boolean | null>(null)
  const [missingColumns, setMissingColumns] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const configRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    checkModelStatus()
  }, [])

  useEffect(() => {
    if (file && configRef.current) {
      setTimeout(() => {
        const yOffset = -80; // Account for fixed header if any
        const element = configRef.current;
        if (element) {
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150)
    }
  }, [file])

  async function checkModelStatus() {
    try {
      const res = await fetch(api('/api/model/status'))
      const data = await res.json()
      setModelExists(data.model_exists)
    } catch {
      setModelExists(false)
    }
  }

  function handleFile(selectedFile: File | undefined) {
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setError(null)
      setResults(null)
      setMissingColumns([])
    } else if (selectedFile) {
      setError('Please upload a valid CSV file.')
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0])
  }

  async function handlePredict(e: React.MouseEvent) {
    e.stopPropagation()

    if (!file) {
      setError('Please provide a file.')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('sample_mass', sampleMass.toString())
    formData.append('volume_filtrate', volumeFiltrate.toString())
    formData.append('volume_extraction', volumeExtraction.toString())
    formData.append('volume_final', volumeFinal.toString())

    try {
      const response = await fetch(api('/api/predict'), {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to predict')
      }

      setResults(data.data)
      if (data.missing_columns && data.missing_columns.length > 0) {
        setMissingColumns(data.missing_columns)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during prediction.')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setFile(null)
    setResults(null)
    setError(null)
    setMissingColumns([])
  }

  function downloadPredictionsCSV() {
    if (!results || results.length === 0) return
    const headers = Object.keys(results[0])
    const csvRows = [headers.join(',')]
    for (const row of results) {
      csvRows.push(headers.map(h => {
        const val = row[h]
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      }).join(','))
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'predictions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="features" id="features">
      <div className="features__container">
        <h2 className="features__title">Phosphorus Prediction</h2>

        {/* Model status banner */}
        {modelExists === false && (
          <div className="model-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>No trained model found. Please <a href="/train" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>train a model</a> first, or ensure a model file exists on the server.</span>
          </div>
        )}
        {modelExists === true && (
          <div className="model-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>Model loaded successfully! Upload a Raw Nix CSV file to generate predictions.</span>
          </div>
        )}

        {/* Upload card — full width */}
        <div
          className={`upload-zone ${dragging ? 'upload-zone--drag' : ''} ${file ? 'upload-zone--active' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => {
            if (!file) inputRef.current?.click()
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={onChange}
            hidden
          />
          <h3 className="upload-zone__title" ref={configRef}>{file ? 'Configure Parameters' : 'Upload Raw Nix CSV'}</h3>

          {file ? (
            <div className="upload-zone__actions" onClick={(e) => e.stopPropagation()}>
              <p className="upload-zone__file">File: <strong>{file.name}</strong></p>

              <div className="upload-parameters">
                <div className="param-group">
                  <label>Sample Mass (g)</label>
                  <input type="number" step="0.1" value={sampleMass} onChange={(e) => setSampleMass(parseFloat(e.target.value))} />
                </div>
                <div className="param-group">
                  <label>Volume Filtrate (mL)</label>
                  <input type="number" step="0.1" value={volumeFiltrate} onChange={(e) => setVolumeFiltrate(parseFloat(e.target.value))} />
                </div>
                <div className="param-group">
                  <label>Volume Extraction (mL)</label>
                  <input type="number" step="0.1" value={volumeExtraction} onChange={(e) => setVolumeExtraction(parseFloat(e.target.value))} />
                </div>
                <div className="param-group">
                  <label>Volume Final (mL)</label>
                  <input type="number" step="0.1" value={volumeFinal} onChange={(e) => setVolumeFinal(parseFloat(e.target.value))} />
                </div>
              </div>

              {error && <p className="upload-error">{error}</p>}

              <div className="upload-buttons">
                <button className="btn-predict" onClick={handlePredict} disabled={loading}>
                  {loading ? 'Processing...' : 'Run Prediction'}
                </button>
                <button className="btn-cancel" onClick={(e) => handleCancel(e)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="upload-zone__hint">
              Drag &amp; drop a Nix CSV file here, or click to browse
            </p>
          )}
        </div>

        {results && results.length > 0 && (
          <div className="features__results">
            <div className="results-header">
              <h3>Prediction Results</h3>
              <button className="btn-download" onClick={downloadPredictionsCSV}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Predictions
              </button>
            </div>
            {missingColumns.length > 0 && (
              <div className="model-warning" style={{ marginBottom: '1rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <span>Missing columns: {missingColumns.join(', ')}. Results may be less accurate.</span>
              </div>
            )}
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    {Object.keys(results[0]).map(k => <th key={k}>{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      {Object.values(r).map((v: any, j) => (
                        <td key={j}>{typeof v === 'number' ? v.toFixed(4) : v}</td>
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
  )
}
