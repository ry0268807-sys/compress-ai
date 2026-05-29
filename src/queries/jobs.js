import { HttpError } from 'wasp/server'

export const getMyJobs = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { page = 1, pageSize = 20, status, inputFileId } = arg || {}

  const where = { requesterId: context.user.id }
  if (status !== undefined && status !== null) {
    where.status = status
  }
  if (inputFileId !== undefined && inputFileId !== null) {
    where.inputFileId = inputFileId
  }

  const totalCount = await context.entities.CompressionJob.count({ where })

  const skip = Math.max(0, (page - 1) * pageSize)
  const take = Math.max(1, pageSize)

  const jobs = await context.entities.CompressionJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,
      updatedAt: true,
      targetSizeBytes: true,
      targetBitrateKbps: true,
      crf: true,
      maxWidth: true,
      maxHeight: true,
      preserveAudio: true,
      presetId: true,
      inputFile: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          storagePath: true,
          durationSec: true
        }
      },
      outputFile: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          storagePath: true,
          durationSec: true
        }
      }
    }
  })

  return { jobs, totalCount, page, pageSize }
}

export const getJobById = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { id } = arg || {}

  const job = await context.entities.CompressionJob.findFirst({
    where: {
      id: id,
      requesterId: context.user.id
    },
    include: {
      inputFile: true,
      outputFile: true,
      preset: true
    }
  })

  if (!job) {
    throw new HttpError(404, 'No compression job with id ' + id + ' for the current user')
  }

  return job
}
