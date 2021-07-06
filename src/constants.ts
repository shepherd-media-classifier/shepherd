/**
 * Supported types refers to nsfwjs
 */

export const supportedTypes = [
	"image/bmp",
	"image/jpeg",
	"image/png",
	"image/gif",
]

export const unsupportedTypes = [
	"image/tiff",
	"image/webp",
	"image/x-ms-bmp",
	"image/svg+xml",
]

export const imageTypes = [
	...supportedTypes,
	...unsupportedTypes,
]

export const videoTypes = [
	"video/3gpp",
	"video/3gpp2",
	"video/mp2t",
	"video/mp4",
	"video/mpeg",
	"video/ogg",
	"video/quicktime",
	"video/webm",
	"video/x-flv",
	"video/x-m4v",
	"video/x-msvideo",
	"video/x-ms-wmv",
]

// Future use
export const textTypes = [
	"text/plain",
	"application/pdf",
]

// axios workaround timeouts
export const NO_DATA_TIMEOUT = 60000
export const NO_STREAM_TIMEOUT = 10000

// temp dir for video processing
export const VID_TMPDIR = './temp-screencaps/'
export const VID_TMPDIR_MAXSIZE = 2 * 1024 * 1024 * 1024 // 2 GB
