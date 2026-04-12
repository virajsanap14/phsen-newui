import React, { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import '../styles/TrainPage.css'
import '../styles/Features.css'

export function TrainPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [edaData, setEdaData] = useState<any>(null)
  const [trainTarget, setTrainTarget] = useState<string>('')
  const [rankedFeatures, setRankedFeatures] = useState<string[]>([])
  const [trainFeatures, setTrainFeatures] = useState<string[]>([])
  const [trainMetrics, setTrainMetrics] = useState<any[] | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const configRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (file && configRef.current) {
      setTimeout(() => {
        const yOffset = -80;
        const element = configRef.current;
        if (element) {
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150)
    }
  }, [file, edaData])

  async function handleFile(selectedFile: File | undefined) {
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setError(null)
      setTrainMetrics(null)
      setRankedFeatures([])
      setTrainFeatures([])

      setLoading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      try {
        const res = await fetch('/api/train/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setEdaData(data)
        if (data.columns && data.columns.length > 0) {
          setTrainTarget(data.columns[data.columns.length - 1])
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
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

  async function handleRankFeatures(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await fetch('/api/train/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: trainTarget })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rank features')
      setRankedFeatures(data.ranked_features)
      setTrainFeatures(data.ranked_features.slice(0, 5))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleTrainModel(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await fetch('/api/train/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: trainTarget, features: trainFeatures })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to train model')
      setTrainMetrics(data.compare_metrics)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCancel(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setFile(null)
    setError(null)
    setEdaData(null)
    setTrainTarget('')
    setRankedFeatures([])
    setTrainFeatures([])
    setTrainMetrics(null)
  }

  return (
    <div className="train-page">
      <Navbar />
      <main>
        <section className="features" id="train-section">
          <div className="features__container">
            <h2 className="features__title">Train Your Model</h2>

            <div className="workflow-instructions">
              <ol className="instruction-list">
                <li><strong>Upload:</strong> Upload your training data CSV.</li>
                <li><strong>Configure:</strong> Select target variable and features.</li>
                <li><strong>Train:</strong> Train and evaluate regression models.</li>
                <li><strong>Download:</strong> Download the best trained model.</li>
              </ol>
            </div>

            {/* Upload card */}
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
              <h3 className="upload-zone__title" ref={configRef}>{file ? 'Configure Training' : 'Upload Training Data'}</h3>

              {file ? (
                <div className="upload-zone__actions" onClick={(e) => e.stopPropagation()}>
                  <p className="upload-zone__file">File: <strong>{file.name}</strong></p>

                  {edaData && !trainMetrics && (
                    <div className="train-config">
                      <div className="eda-summary-box">
                        <h4>Data Profile Summary</h4>
                        <div className="eda-stats">
                          <div className="eda-stat-item">
                            <span className="eda-label">Rows Scanned</span>
                            <span className="eda-value">Verified</span>
                          </div>
                          <div className="eda-stat-item">
                            <span className="eda-label">Total Columns</span>
                            <span className="eda-value">{edaData.columns?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="train-form-group">
                        <label>Target Variable</label>
                        <p className="form-hint">Select the column you wish to predict (e.g., phosphorus ppm).</p>
                        <select
                          className="form-select"
                          value={trainTarget}
                          onChange={(e) => setTrainTarget(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {edaData.columns.map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="train-form-group">
                        <div className="train-features-header">
                          <label>{rankedFeatures.length > 0 ? 'Select Features (Ranked by Best Fit)' : 'Select Features'}</label>
                          <button className="btn-rank-mrmr" onClick={handleRankFeatures} disabled={loading}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            {loading ? 'Ranking...' : 'Rank via MRMR'}
                          </button>
                        </div>
                        <p className="form-hint">Hold Ctrl/Cmd to select multiple predictors.</p>
                        <select
                          className="form-select form-select-multiple"
                          multiple
                          value={trainFeatures}
                          onChange={(e) => setTrainFeatures(Array.from(e.target.selectedOptions, option => option.value))}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(rankedFeatures.length > 0 ? rankedFeatures : edaData.columns.filter((c: string) => c !== trainTarget)).map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {trainMetrics && (
                    <div className="train-results-box">
                      <div className="train-results-icon">✅</div>
                      <div className="train-results-content">
                        <h4>Training Complete!</h4>
                        <p>The best performing AutoML regression model has been calculated, evaluated, and saved to the backend.</p>
                        <a href="/api/train/download" className="btn-download" onClick={(e) => e.stopPropagation()}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          Download Model
                        </a>
                      </div>
                    </div>
                  )}

                  {error && <p className="upload-error">{error}</p>}

                  <div className="upload-buttons">
                    {!trainMetrics && (
                      <button className="btn-predict" onClick={handleTrainModel} disabled={loading || !edaData}>
                        {loading ? 'Processing...' : 'Start Training'}
                      </button>
                    )}
                    <button className="btn-cancel" onClick={(e) => handleCancel(e)}>
                      {trainMetrics ? 'Train Another Model' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="upload-zone__hint">
                  Drag &amp; drop a training CSV file here, or click to browse
                </p>
              )}
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
