import { HttpError } from 'wasp/server'

export const getPresets = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const userId = context.user.id

  const presets = await context.entities.CompressionPreset.findMany({
    where: {
      OR: [
        { userId: null },
        { userId: userId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  })

  return presets
}
