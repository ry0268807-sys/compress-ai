import { HttpError } from 'wasp/server'

export const savePreset = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { id, name, description, crf, targetBitrateKbps, maxWidth, maxHeight } = arg || {};

  // If creating, name is required. If name is provided for update, it must not be empty.
  if (!id) {
    if (!name || String(name).trim() === '') {
      throw new HttpError(400, 'Name is required')
    }
  } else {
    if (name !== undefined && String(name).trim() === '') {
      throw new HttpError(400, 'Name cannot be empty')
    }
  }

  if (id) {
    const preset = await context.entities.CompressionPreset.findUnique({ where: { id } });
    if (!preset) { throw new HttpError(404, 'Preset not found') }
    if (preset.userId !== context.user.id) { throw new HttpError(403) }

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (crf !== undefined) data.crf = crf;
    if (targetBitrateKbps !== undefined) data.targetBitrateKbps = targetBitrateKbps;
    if (maxWidth !== undefined) data.maxWidth = maxWidth;
    if (maxHeight !== undefined) data.maxHeight = maxHeight;

    const updated = await context.entities.CompressionPreset.update({
      where: { id },
      data
    });

    return updated;
  } else {
    const data = {
      name,
      description,
      crf,
      targetBitrateKbps,
      maxWidth,
      maxHeight,
      userId: context.user.id
    };

    const created = await context.entities.CompressionPreset.create({ data });
    return created;
  }
};

export const removePreset = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const { presetId } = arg || {};

  const preset = await context.entities.CompressionPreset.findUnique({
    where: { id: presetId }
  });

  if (!preset) { throw new HttpError(404, 'Preset not found') }

  if (preset.userId !== context.user.id) { throw new HttpError(403) }

  const jobsUsingPreset = await context.entities.CompressionJob.count({
    where: { presetId }
  });

  if (jobsUsingPreset > 0) {
    throw new HttpError(400, 'Cannot delete preset that is referenced by existing compression jobs')
  }

  const deleted = await context.entities.CompressionPreset.delete({
    where: { id: presetId }
  });

  return deleted.id;
}
