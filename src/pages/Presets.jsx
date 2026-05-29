import React, { useState, useEffect } from 'react'
import { useQuery, useAction, getPresets, savePreset, removePreset } from 'wasp/client/operations'

const PresetsPage = () => {
  const { data: presets = [], isLoading, error, refetch } = useQuery(getPresets)
  const savePresetFn = useAction(savePreset)
  const removePresetFn = useAction(removePreset)

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', crf: '', targetBitrateKbps: '', maxWidth: '', maxHeight: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        description: editing.description || '',
        crf: editing.crf != null ? String(editing.crf) : '',
        targetBitrateKbps: editing.targetBitrateKbps != null ? String(editing.targetBitrateKbps) : '',
        maxWidth: editing.maxWidth != null ? String(editing.maxWidth) : '',
        maxHeight: editing.maxHeight != null ? String(editing.maxHeight) : ''
      })
    } else {
      setForm({ name: '', description: '', crf: '', targetBitrateKbps: '', maxWidth: '', maxHeight: '' })
    }
  }, [editing])

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleEdit = (p) => setEditing(p)
  const handleCancelEdit = () => setEditing(null)

  const handleSave = async () => {
    if (!form.name || String(form.name).trim() === '') {
      alert('Name is required')
      return
    }

    const payload = {}
    if (editing && editing.id) payload.id = editing.id
    payload.name = String(form.name).trim()
    if (form.description && String(form.description).trim() !== '') payload.description = String(form.description).trim()
    if (form.crf !== '') payload.crf = Number(form.crf)
    if (form.targetBitrateKbps !== '') payload.targetBitrateKbps = Number(form.targetBitrateKbps)
    if (form.maxWidth !== '') payload.maxWidth = Number(form.maxWidth)
    if (form.maxHeight !== '') payload.maxHeight = Number(form.maxHeight)

    try {
      setSaving(true)
      await savePresetFn(payload)
      setEditing(null)
      await refetch()
    } catch (err) {
      console.error('Save preset failed', err)
      alert(err?.message || 'Failed to save preset')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (presetId) => {
    if (!confirm('Are you sure you want to delete this preset? This action cannot be undone.')) return
    try {
      setDeletingId(presetId)
      await removePresetFn({ presetId })
      await refetch()
    } catch (err) {
      console.error('Remove preset failed', err)
      alert(err?.message || 'Failed to remove preset')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto text-center text-slate-600">Loading presets...</div>
    </div>
  )
  if (error) return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto text-center text-red-600">Error: {error.message || String(error)}</div>
    </div>
  )

  const globalPresets = presets.filter((p) => p.userId == null)
  const myPresets = presets.filter((p) => p.userId != null)

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Compression Presets</h1>
            <p className="text-sm text-slate-600 mt-1">Manage global and your custom compression presets.</p>
          </div>
          <div>
            <button
              onClick={() => setEditing(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow"
            >
              New Preset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <section className="bg-white shadow rounded-lg p-4">
                <h2 className="text-lg font-medium mb-3">My Presets</h2>
                {myPresets.length === 0 ? (
                  <div className="text-sm text-slate-500">You have no saved presets yet.</div>
                ) : (
                  <div className="space-y-3">
                    {myPresets.map((p) => (
                      <div key={p.id} className="flex items-start justify-between p-3 border rounded hover:shadow-sm">
                        <div>
                          <div className="font-medium text-slate-800">{p.name}</div>
                          {p.description && <div className="text-sm text-slate-600">{p.description}</div>}
                          <div className="mt-2 text-sm text-slate-500">
                            {p.crf != null && <span className="mr-3">CRF: {p.crf}</span>}
                            {p.targetBitrateKbps != null && <span className="mr-3">Bitrate: {p.targetBitrateKbps} kbps</span>}
                            {p.maxWidth != null && <span className="mr-3">Max W: {p.maxWidth}</span>}
                            {p.maxHeight != null && <span className="mr-3">Max H: {p.maxHeight}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white py-1 px-3 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(p.id)}
                            disabled={deletingId === p.id}
                            className={`py-1 px-3 rounded text-sm text-white ${deletingId === p.id ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600'}`}
                          >
                            {deletingId === p.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white shadow rounded-lg p-4">
                <h2 className="text-lg font-medium mb-3">Global Presets</h2>
                {globalPresets.length === 0 ? (
                  <div className="text-sm text-slate-500">No global presets available.</div>
                ) : (
                  <div className="space-y-3">
                    {globalPresets.map((p) => (
                      <div key={p.id} className="flex items-start justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium text-slate-800">{p.name}</div>
                          {p.description && <div className="text-sm text-slate-600">{p.description}</div>}
                          <div className="mt-2 text-sm text-slate-500">
                            {p.crf != null && <span className="mr-3">CRF: {p.crf}</span>}
                            {p.targetBitrateKbps != null && <span className="mr-3">Bitrate: {p.targetBitrateKbps} kbps</span>}
                            {p.maxWidth != null && <span className="mr-3">Max W: {p.maxWidth}</span>}
                            {p.maxHeight != null && <span className="mr-3">Max H: {p.maxHeight}</span>}
                          </div>
                        </div>
                        <div className="text-sm text-slate-400 italic">Global</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          <aside>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">{editing ? 'Edit Preset' : 'Create Preset'}</h3>

              <label className="block text-sm text-slate-700">Name</label>
              <input value={form.name} onChange={handleChange('name')} className="w-full mt-1 mb-3 px-3 py-2 border rounded" />

              <label className="block text-sm text-slate-700">Description</label>
              <textarea value={form.description} onChange={handleChange('description')} className="w-full mt-1 mb-3 px-3 py-2 border rounded" rows={3} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700">CRF</label>
                  <input value={form.crf} onChange={handleChange('crf')} type="number" className="w-full mt-1 px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Bitrate (kbps)</label>
                  <input value={form.targetBitrateKbps} onChange={handleChange('targetBitrateKbps')} type="number" className="w-full mt-1 px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Max Width</label>
                  <input value={form.maxWidth} onChange={handleChange('maxWidth')} type="number" className="w-full mt-1 px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Max Height</label>
                  <input value={form.maxHeight} onChange={handleChange('maxHeight')} type="number" className="w-full mt-1 px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
                  {saving ? 'Saving...' : editing ? 'Update Preset' : 'Create Preset'}
                </button>
                {editing ? (
                  <button onClick={handleCancelEdit} className="bg-slate-300 hover:bg-slate-400 text-slate-800 py-2 px-4 rounded">Cancel</button>
                ) : null}
              </div>

              <div className="mt-3 text-sm text-slate-500">Presets you create are private to your account. Global presets are provided for everyone.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default PresetsPage
