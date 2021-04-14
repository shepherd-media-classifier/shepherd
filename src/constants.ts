/**
 * These are all the media types currently supported by Clarifai.
 * 
 * There are other restrictions on these types:
 * - Each image should be less than 20MB
 * - Format restrictions: https://docs.clarifai.com/api-guide/data/supported-formats
 */

export const imageTypes = [
	"image/bmp",
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/tiff",
	"image/webp",
	"image/x-ms-bmp",
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

// maybe do not run any of these through clarifai
export const otherTypes = [
	"text/plain",
	"application/pdf",
]
