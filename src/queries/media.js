import { HttpError } from 'wasp/server'

export const getMyFiles = async (arg = {}, context) => {
  if (!context.user) { throw new HttpError(401) }

  const page = Math.max(1, Number(arg.page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(arg.pageSize) || 20))

  const andClauses = []
  if (arg.search) {
    andClauses.push({ originalName: { contains: arg.search, mode: 'insensitive' } })
  }
  if (arg.mimeType) {
    andClauses.push({ mimeType: arg.mimeType })
  }

  const where = Object.assign({ userId: context.user.id }, andClauses.length ? { AND: andClauses } : {})

  const allowedSortFields = ['createdAt', 'sizeBytes']
  const sortBy = allowedSortFields.includes(arg.sortBy) ? arg.sortBy : 'createdAt'
  const sortOrder = (arg.sortOrder && String(arg.sortOrder).toLowerCase() === 'asc') ? 'asc' : 'desc'
  const orderBy = { [sortBy]: sortOrder }

  const total = await context.entities.MediaFile.count({ where })
  const items = await context.entities.MediaFile.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize
  })

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
}

export const getFileById = async (arg = {}, context) => {
  const { id } = arg

  if (!context.user) { throw new HttpError(401) }

  const file = await context.entities.MediaFile.findUnique({
    where: { id }
  })

  if (!file) {
    throw new HttpError(404, 'No media file with id ' + id)
  }

  if (file.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized to access this file')
  }

  const recentJobs = await context.entities.CompressionJob.findMany({
    where: {
      OR: [
        { inputFileId: id },
        { outputFileId: id }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      requester: { select: { id: true } },
      inputFile: { select: { id: true, originalName: true } },
      outputFile: { select: { id: true, originalName: true } },
      preset: { select: { id: true, name: true } }
    }
  })

  return { file, recentJobs }
}
