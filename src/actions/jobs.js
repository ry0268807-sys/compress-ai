import { HttpError } from 'wasp/server'

export const requestCompressionJob = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const {
    inputFileId,
    presetId,
    crf,
    targetBitrateKbps,
    targetSizeBytes,
    maxWidth,
    maxHeight,
    preserveAudio
  } = arg || {}

  if (inputFileId == null) {
    throw new HttpError(400, 'inputFileId is required')
  }

  const inputFile = await context.entities.MediaFile.findUnique({
    where: { id: inputFileId }
  })
  if (!inputFile) { throw new HttpError(404, 'Input file not found') }
  if (inputFile.userId !== context.user.id) { throw new HttpError(403, 'Not allowed to use this input file') }

  let preset = null
  if (presetId != null) {
    preset = await context.entities.CompressionPreset.findUnique({
      where: { id: presetId }
    })
    if (!preset) { throw new HttpError(404, 'Preset not found') }
    if (preset.userId !== null && preset.userId !== context.user.id) { throw new HttpError(403, 'Not allowed to use this preset') }
  }

  const data = {
    status: 'PENDING',
    requester: { connect: { id: context.user.id } },
    inputFile: { connect: { id: inputFileId } }
  }

  if (preset) {
    data.preset = { connect: { id: presetId } }
  }
  if (crf != null) {
    data.crf = crf
  }
  if (targetBitrateKbps != null) {
    data.targetBitrateKbps = targetBitrateKbps
  }
  if (targetSizeBytes != null) {
    data.targetSizeBytes = targetSizeBytes
  }
  if (maxWidth != null) {
    data.maxWidth = maxWidth
  }
  if (maxHeight != null) {
    data.maxHeight = maxHeight
  }
  // preserveAudio can be boolean false, so check for undefined only
  if (typeof preserveAudio !== 'undefined') {
    data.preserveAudio = preserveAudio
  }

  const job = await context.entities.CompressionJob.create({ data })
  return job
}

export const cancelCompressionJob = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { jobId, message } = arg || {}

  const job = await context.entities.CompressionJob.findUnique({
    where: { id: jobId }
  })

  if (!job) { throw new HttpError(404, "CompressionJob not found") }

  if (job.requesterId !== context.user.id) { throw new HttpError(403) }

  const allowedStatuses = ["PENDING", "PROCESSING"]
  if (!allowedStatuses.includes(job.status)) {
    throw new HttpError(400, "Only PENDING or PROCESSING jobs can be canceled")
  }

  const updatedJob = await context.entities.CompressionJob.update({
    where: { id: jobId },
    data: {
      status: "CANCELED",
      message: message !== undefined ? message : job.message
    }
  })

  return updatedJob
}

export const deleteCompressionJob = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { jobId, alsoDeleteOutput = false } = arg || {}

  const job = await context.entities.CompressionJob.findUnique({ where: { id: jobId } })
  if (!job) { throw new HttpError(404, "CompressionJob not found") }

  // Only the requester can delete their job
  if (job.requesterId !== context.user.id) { throw new HttpError(403) }

  const outputFileId = job.outputFileId ?? null

  // Delete the job first to avoid foreign key constraint when deleting the output file
  await context.entities.CompressionJob.delete({ where: { id: jobId } })

  let deletedOutputFileId = null
  if (alsoDeleteOutput && outputFileId != null) {
    const outputFile = await context.entities.MediaFile.findUnique({ where: { id: outputFileId } })
    if (outputFile) {
      // Ensure the user owns the output file before deleting it
      if (outputFile.userId !== context.user.id) { throw new HttpError(403) }
      await context.entities.MediaFile.delete({ where: { id: outputFileId } })
      deletedOutputFileId = outputFileId
    }
  }

  return { deletedJobId: jobId, deletedOutputFileId }
}
