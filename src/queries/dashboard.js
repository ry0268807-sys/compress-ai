import { HttpError } from 'wasp/server'

export const getDashboardSummary = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const userId = context.user.id

  const [
    totalFileCount,
    storageAgg,
    totalJobCount,
    jobsGroup
  ] = await Promise.all([
    context.entities.MediaFile.count({ where: { userId } }),
    context.entities.MediaFile.aggregate({
      _sum: { sizeBytes: true },
      where: { userId }
    }),
    context.entities.CompressionJob.count({ where: { requesterId: userId } }),
    context.entities.CompressionJob.groupBy({
      by: ["status"],
      where: { requesterId: userId },
      _count: { _all: true }
    })
  ])

  const totalStorageBytes = (storageAgg && storageAgg._sum && storageAgg._sum.sizeBytes) ? storageAgg._sum.sizeBytes : 0

  const jobsByStatus = JSON.parse('{}');
  for (const g of jobsGroup) {
    const count = (g._count && typeof g._count._all === 'number') ? g._count._all : 0
    jobsByStatus[g.status] = count
  }

  return { totalFileCount, totalStorageBytes, totalJobCount, jobsByStatus }
}
