import { HttpError } from 'wasp/server'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'

export const createMediaFile = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { originalName, mimeType, sizeBytes, checksum, durationSec } = arg || {}

  if (!originalName || typeof originalName !== 'string') { throw new HttpError(400, 'Invalid originalName') }
  if (!mimeType || typeof mimeType !== 'string') { throw new HttpError(400, 'Invalid mimeType') }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0) { throw new HttpError(400, 'Invalid sizeBytes') }
  if (checksum !== undefined && checksum !== null && typeof checksum !== 'string') { throw new HttpError(400, 'Invalid checksum') }
  if (durationSec !== undefined && durationSec !== null) {
    if (!Number.isInteger(durationSec) || durationSec < 0) { throw new HttpError(400, 'Invalid durationSec') }
  }

  // Build a deterministic-ish storage path/key for where the file will be stored.
  const basename = path.basename(originalName)
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  const rand = crypto.randomBytes(8).toString('hex')
  const timestamp = Date.now()
  const storagePath = `uploads/${context.user.id}/${timestamp}_${rand}_${sanitized}`

  const created = await context.entities.MediaFile.create({
    data: {
      originalName,
      mimeType,
      sizeBytes,
      storagePath,
      checksum: checksum ?? null,
      durationSec: durationSec ?? null,
      user: { connect: { id: context.user.id } }
    }
  })

  return created
}

export const deleteMediaFile = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { id } = arg || {}
  if (!id) { throw new HttpError(400, 'Invalid id') }

  const media = await context.entities.MediaFile.findUnique({ where: { id } })
  if (!media) { throw new HttpError(404) }

  if (media.userId !== context.user.id) { throw new HttpError(403) }

  const jobsCount = await context.entities.CompressionJob.count({
    where: {
      OR: [
        { inputFileId: id },
        { outputFileId: id }
      ]
    }
  })

  if (jobsCount > 0) {
    throw new HttpError(400, 'Cannot delete file referenced by existing compression jobs.')
  }

  // Try to remove the file from storage if present. Don't fail the whole operation
  // if the file is already missing; just log other errors.
  if (media.storagePath) {
    try {
      await fs.unlink(media.storagePath)
    } catch (err) {
      if (!err || err.code !== 'ENOENT') {
        console.error('Failed to delete file from storage:', err)
      }
    }
  }

  const deleted = await context.entities.MediaFile.delete({ where: { id } })

  return deleted.id
}
