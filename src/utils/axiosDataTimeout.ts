import axios from "axios"
import { NO_DATA_TIMEOUT } from "../constants"
import { logger } from "./logger"


export const axiosDataTimeout = async(url: string)=> {
	
		/**
		 * Axios never times out if the connection is opened correctly with non-zero Content-Length, but no data is ever returned.
		 * The workaround is to set a timeout, cancel the request, and throw an error.
		 */
		 const source = axios.CancelToken.source()
		 const timer = setTimeout( ()=>source.cancel(), NO_DATA_TIMEOUT )
 
		 try{
 
			 const res = await axios.get(url, {
				 cancelToken: source.token,
				 responseType: 'arraybuffer',
				//  onDownloadProgress: ()=> clearTimeout(timer),
			 })
			 clearTimeout(timer)
 
			 return res.data
 
		 }catch(e){
			 clearTimeout(timer)
			 if(e.response || e.code){
				 throw(e)
			 }
			 throw new Error(`Timeout of ${NO_DATA_TIMEOUT}ms exceeded`)
		 }
}

// export const axiosDataTimeout = async(url: string)=> {
// 	return new Promise<Buffer>( async(resolve, reject) => {
		
// 		const source = axios.CancelToken.source()
	
// 		const timer = setTimeout( ()=>{
// 			source.cancel()
// 			reject(new Error(`Timeout of ${NO_DATA_TIMEOUT}ms exceeded`))
// 		}, NO_DATA_TIMEOUT )
	
// 		try{
			
// 			const { data: stream } = await axios.get(url, {
// 				cancelToken: source.token,
// 				responseType: 'stream',
// 			})
			
// 			let buffers: Uint8Array[] = []
	
// 			stream.on('data', (buffer: Uint8Array)=>{
// 				clearTimeout(timer)
// 				buffers.push(buffer)
// 			})
	
// 			stream.on('end', ()=>{
// 				const data = Buffer.concat(buffers)
// 				resolve(data)
// 				return;
// 			})

// 			stream.on('error', (e: any)=>{
// 				logger('READ STREAM ERROR')
// 				reject(e)
// 			})
	
// 		}catch(e){
// 			clearTimeout(timer)
// 			reject(e)
// 		}
// 	})
// }