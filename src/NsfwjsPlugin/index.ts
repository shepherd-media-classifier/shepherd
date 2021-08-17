/**
 * nsfwjs rating system:
 * 
 * drawings - safe for work drawings (including anime)
 * neutral - safe for work neutral images
 * sexy - sexually explicit images, not pornography
 * hentai - hentai and pornographic drawings
 * porn - pornographic images, sexual acts
 * 
 * Supported formats: BMP, JPEG, PNG, or GIF (gif uses different api function)
 */

import { RatingPluginInterface } from "../RatingPluginInterface";
import { NsfwTools } from "./NsfwTools";

const NsfwjsPlugin: RatingPluginInterface = {
	init: NsfwTools.init,
	checkImage: NsfwTools.checkImage,
}

export default NsfwjsPlugin;