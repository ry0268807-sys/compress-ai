import React, { useState, useMemo } from 'react'
import { Link } from 'wasp/client/router'
import { useQuery, useAction, getDashboardSummary, getMyJobs, getMyFiles, requestCompressionJob } from 'wasp/client/operations'

const bytesToHuman = bytes => {
  if (!bytes && bytes !== 0) return '-'
  const thresh = 1024
  if (Math.abs(bytes) < thresh) return bytes + ' B'
  const units = ['KB', 'MB', 'GB', 'TB']
  let u = -1
  do {
    bytes /= thresh
    ++u
  } while (Math.abs(bytes) >= thresh && u < units.length - 1)
  return bytes.toFixed(1) + ' ' + units[u]
}

const getStatusBadgeClass = status => {
  if (status === 'COMPLETED') return 'bg-green-600'
  if (status === 'PROCESSING') return 'bg-yellow-500'
  if (status === 'FAILED') return 'bg-red-600'
  return 'bg-slate-400'
}

const DashboardPage = () => {
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery(getDashboardSummary)
  const { data: jobsResp, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useQuery(getMyJobs, { page: 1, pageSize: 6 })
  const { data: filesResp, isLoading: filesLoading, error: filesError, refetch: refetchFiles } = useQuery(getMyFiles, { page: 1, pageSize: 8 })

  const requestJob = useAction(requestCompressionJob)

  const [selectedFileId, setSelectedFileId] = useState('')
  const [presetId, setPresetId] = useState('')
  const [crf, setCrf] = useState('')
  const [targetBitrateKbps, setTargetBitrateKbps] = useState('')
  const [targetSizeBytes, setTargetSizeBytes] = useState('')
  const [maxWidth, setMaxWidth] = useState('')
  const [maxHeight, setMaxHeight] = useState('')
  const [preserveAudio, setPreserveAudio] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const recentFiles = useMemo(() => (filesResp && filesResp.items) ? filesResp.items : [], [filesResp])
  const recentJobs = useMemo(() => (jobsResp && jobsResp.jobs) ? jobsResp.jobs : [], [jobsResp])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setErrorMsg(null)

    if (!selectedFileId) {
      setErrorMsg('Please select a file to compress')
      return
    }

    const payload = {
      inputFileId: Number(selectedFileId)
    }
    if (presetId) payload.presetId = Number(presetId)
    if (crf) payload.crf = Number(crf)
    if (targetBitrateKbps) payload.targetBitrateKbps = Number(targetBitrateKbps)
    if (targetSizeBytes) payload.targetSizeBytes = Number(targetSizeBytes)
    if (maxWidth) payload.maxWidth = Number(maxWidth)
    if (maxHeight) payload.maxHeight = Number(maxHeight)
    payload.preserveAudio = !!preserveAudio

    try {
      setSubmitting(true)
      await requestJob(payload)
      setMessage('Compression job requested successfully')
      // refresh lists
      try { await refetchJobs() } catch (err) {}
      try { await refetchFiles() } catch (err) {}
      try { await refetchSummary() } catch (err) {}
      // reset some fields
      setCrf('')
      setTargetBitrateKbps('')
      setTargetSizeBytes('')
      setMaxWidth('')
      setMaxHeight('')
      setPresetId('')
      setSelectedFileId('')
    } catch (err) {
      const text = (err && err.message) ? err.message : 'Failed to request job'
      setErrorMsg(text)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='p-6 bg-slate-50 min-h-screen'>
      <div className='max-w-6xl mx-auto'>
        <header className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='text-3xl font-semibold text-slate-800'>Welcome to Compress</h1>
            <p className='text-slate-600 mt-1'>Quick overview of your files and compression jobs</p>
          </div>
          <div>
            <Link to='/upload' className='inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded shadow'>
              Upload File
            </Link>
          </div>
        </header>

        <section className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
          <div className='p-4 bg-white rounded-lg shadow'>
            <div className='text-sm text-slate-500'>Files</div>
            <div className='mt-2 text-2xl font-bold'>{summaryLoading ? '...' : (summary ? summary.totalFileCount : '-')}</div>
            <div className='text-sm text-slate-500 mt-1'>Total files</div>
          </div>

          <div className='p-4 bg-white rounded-lg shadow'>
            <div className='text-sm text-slate-500'>Storage</div>
            <div className='mt-2 text-2xl font-bold'>{summaryLoading ? '...' : (summary ? bytesToHuman(summary.totalStorageBytes) : '-')}</div>
            <div className='text-sm text-slate-500 mt-1'>Used storage</div>
          </div>

          <div className='p-4 bg-white rounded-lg shadow'>
            <div className='text-sm text-slate-500'>Jobs</div>
            <div className='mt-2 text-2xl font-bold'>{summaryLoading ? '...' : (summary ? summary.totalJobCount : '-')}</div>
            <div className='text-sm text-slate-500 mt-1'>Total compression jobs</div>
          </div>
        </section>

        <section className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-lg shadow p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-xl font-semibold text-slate-800'>Recent files</h2>
                <Link to='/upload' className='text-sm text-indigo-600 hover:underline'>See all</Link>
              </div>

              {filesLoading ? (
                <div>Loading files...</div>
              ) : filesError ? (
                <div className='text-red-600'>Error loading files</div>
              ) : (
                <div className='space-y-2'>
                  {recentFiles.length === 0 && <div className='text-slate-500'>No files yet. Upload your first file to get started.</div>}
                  {recentFiles.map(file => (
                    <div key={file.id} className='flex items-center justify-between p-2 rounded hover:bg-slate-50'>
                      <div>
                        <div className='font-medium text-slate-800'>{file.originalName}</div>
                        <div className='text-sm text-slate-500'>{file.mimeType} ? {bytesToHuman(file.sizeBytes)}{file.durationSec ? (' ? ' + file.durationSec + 's') : ''}</div>
                      </div>
                      <div className='flex items-center gap-x-2'>
                        <Link to={`/file/${file.id}`} className='text-sm text-indigo-600 hover:underline'>Details</Link>
                        <Link to={`/upload?inputFileId=${file.id}`} className='bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-1 px-3 rounded'>
                          Compress
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='bg-white rounded-lg shadow p-4 mt-6'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-xl font-semibold text-slate-800'>Recent jobs</h2>
                <Link to='/' className='text-sm text-indigo-600 hover:underline'>See all</Link>
              </div>

              {jobsLoading ? (
                <div>Loading jobs...</div>
              ) : jobsError ? (
                <div className='text-red-600'>Error loading jobs</div>
              ) : (
                <div className='space-y-3'>
                  {recentJobs.length === 0 && <div className='text-slate-500'>No jobs yet. Request a compression to get started.</div>}
                  {recentJobs.map(job => (
                    <div key={job.id} className='flex items-start justify-between p-3 rounded border border-slate-100'>
                      <div>
                        <div className='flex items-center gap-x-3'>
                          <div className='text-sm font-medium text-slate-800'>Job #{job.id}</div>
                          <div className={`text-xs px-2 py-1 rounded-full text-white ${getStatusBadgeClass(job.status)}`} />
                        </div>
                        <div className='text-sm text-slate-500 mt-1'>
                          {job.inputFile ? job.inputFile.originalName : 'input missing'}
                          {job.outputFile ? (' ? ' + job.outputFile.originalName) : ''}
                        </div>
                        <div className='text-xs text-slate-400 mt-1'>Created: {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}</div>
                      </div>
                      <div className='text-right text-sm text-slate-500'>
                        <div className='font-medium text-slate-700'>{job.status}</div>
                        <Link to={`/job/${job.id}`} className='text-indigo-600 hover:underline text-sm'>View</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside>
            <div className='bg-white rounded-lg shadow p-4 sticky top-6'>
              <h3 className='text-lg font-semibold text-slate-800 mb-2'>Quick compress</h3>
              <p className='text-sm text-slate-500 mb-3'>Pick a file and request a compression job with simple options</p>

              <form onSubmit={handleSubmit} className='space-y-3'>
                <label className='block'>
                  <div className='text-sm text-slate-600 mb-1'>File</div>
                  <select value={selectedFileId} onChange={e => setSelectedFileId(e.target.value)} className='w-full border rounded px-2 py-2'>
                    <option value=''>Select a file</option>
                    {recentFiles.map(f => (
                      <option key={f.id} value={f.id}>{f.originalName} ({bytesToHuman(f.sizeBytes)})</option>
                    ))}
                  </select>
                </label>

                <label className='block'>
                  <div className='text-sm text-slate-600 mb-1'>Preset id (optional)</div>
                  <input value={presetId} onChange={e => setPresetId(e.target.value)} placeholder='preset id' className='w-full border rounded px-2 py-2' />
                </label>

                <div className='grid grid-cols-2 gap-2'>
                  <label className='block'>
                    <div className='text-sm text-slate-600 mb-1'>CRF</div>
                    <input value={crf} onChange={e => setCrf(e.target.value)} placeholder='e.g. 23' className='w-full border rounded px-2 py-2' />
                  </label>
                  <label className='block'>
                    <div className='text-sm text-slate-600 mb-1'>Bitrate (kbps)</div>
                    <input value={targetBitrateKbps} onChange={e => setTargetBitrateKbps(e.target.value)} placeholder='e.g. 1200' className='w-full border rounded px-2 py-2' />
                  </label>
                </div>

                <label className='block'>
                  <div className='text-sm text-slate-600 mb-1'>Target size (bytes, optional)</div>
                  <input value={targetSizeBytes} onChange={e => setTargetSizeBytes(e.target.value)} placeholder='e.g. 50000000' className='w-full border rounded px-2 py-2' />
                </label>

                <div className='grid grid-cols-2 gap-2'>
                  <label className='block'>
                    <div className='text-sm text-slate-600 mb-1'>Max width</div>
                    <input value={maxWidth} onChange={e => setMaxWidth(e.target.value)} placeholder='pixels' className='w-full border rounded px-2 py-2' />
                  </label>
                  <label className='block'>
                    <div className='text-sm text-slate-600 mb-1'>Max height</div>
                    <input value={maxHeight} onChange={e => setMaxHeight(e.target.value)} placeholder='pixels' className='w-full border rounded px-2 py-2' />
                  </label>
                </div>

                <label className='flex items-center gap-x-2'>
                  <input type='checkbox' checked={preserveAudio} onChange={e => setPreserveAudio(e.target.checked)} />
                  <span className='text-sm text-slate-700'>Preserve audio</span>
                </label>

                {message && <div className='text-sm text-green-600'>{message}</div>}
                {errorMsg && <div className='text-sm text-red-600'>{errorMsg}</div>}

                <div className='flex items-center gap-x-2'>
                  <button type='submit' disabled={submitting} className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded'>
                    {submitting ? 'Requesting...' : 'Request compression'}
                  </button>
                  <button type='button' onClick={() => { setSelectedFileId(''); setPresetId(''); setCrf(''); setTargetBitrateKbps(''); setTargetSizeBytes(''); setMaxWidth(''); setMaxHeight(''); setMessage(null); setErrorMsg(null) }} className='bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 px-3 rounded'>Reset</button>
                </div>
              </form>
            </div>

            <div className='bg-white rounded-lg shadow p-4 mt-4'>
              <h4 className='text-sm font-semibold text-slate-800 mb-2'>Jobs by status</h4>
              {summaryLoading ? (
                <div>Loading...</div>
              ) : summaryError ? (
                <div className='text-red-600'>Failed to load</div>
              ) : (
                <div className='space-y-2'>
                  {summary && summary.jobsByStatus ? Object.entries(summary.jobsByStatus).map(([status, count]) => (
                    <div key={status} className='flex items-center justify-between'>
                      <div className='text-sm text-slate-700'>{status}</div>
                      <div className='text-sm font-medium text-slate-800'>{count}</div>
                    </div>
                  )) : <div className='text-slate-500'>No data</div>}
                </div>
              )}
            </div>
          </aside>
        </section>

      </div>
    </div>
  )
}

export default DashboardPage
