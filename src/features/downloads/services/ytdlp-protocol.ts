// yt-dlp'nin makine-okunur satır önekleri: [pp] stderr'e, diğerleri stdout'a yazılır
export const LINE_PREFIX = {
  download: "[dl] ",
  postprocess: "[pp] ",
  meta: "[meta] ",
  file: "[file] ",
} as const;

export const FIELD_SEPARATOR = "|";

export const DOWNLOAD_PROGRESS_TEMPLATE = `download:${LINE_PREFIX.download}%(info.vcodec)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`;

export const POSTPROCESS_PROGRESS_TEMPLATE = `postprocess:${LINE_PREFIX.postprocess}%(progress.status)s|%(progress.postprocessor)s`;

export const META_PRINT_TEMPLATE = `video:${LINE_PREFIX.meta}%(id)s|%(title)s`;

export const FILE_PRINT_TEMPLATE = `after_move:${LINE_PREFIX.file}%(filepath)s`;
