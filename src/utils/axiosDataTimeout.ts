import axios from "axios"
import { IncomingMessage } from "http"
import { NO_DATA_TIMEOUT } from "../constants"
import { logger } from "./logger"


// export const axiosDataTimeout = async(url: string)=> {
	
// 		/**
// 		 * Axios never times out if the connection is opened correctly with non-zero Content-Length, but no data is ever returned.
// 		 * The workaround is to set a timeout, cancel the request, and throw an error.
// 		 */
// 		 const source = axios.CancelToken.source()
// 		 const timer = setTimeout( ()=>source.cancel(), NO_DATA_TIMEOUT )
 
// 		 try{
 
// 			 const res = await axios.get(url, {
// 				 cancelToken: source.token,
// 				 responseType: 'arraybuffer',
// 				//  onDownloadProgress: ()=> clearTimeout(timer),
// 			 })
// 			 clearTimeout(timer)
 
// 			 return res.data
 
// 		 }catch(e){
// 			 clearTimeout(timer)
// 			 if(e.response || e.code){
// 				 throw(e)
// 			 }
// 			 throw new Error(`Timeout of ${NO_DATA_TIMEOUT}ms exceeded`)
// 		 }
// }

export const axiosDataTimeout = async(url: string)=> {
	return new Promise<Buffer>( async(resolve, reject) => {
		
		const source = axios.CancelToken.source()
	
		const timer = setTimeout( ()=>{
			source.cancel()
			reject(new Error(`Timeout of ${NO_DATA_TIMEOUT}ms exceeded`))
		}, NO_DATA_TIMEOUT )
	
		try{
			
			const now = new Date().valueOf()
			let dataon = 0

			const res = await axios.get(url, {
				cancelToken: source.token,
				responseType: 'stream',
			})
			const stream: IncomingMessage = res.data
			
			let buffers: Uint8Array[] = []

			stream.on('data', (buffer: Uint8Array)=>{
				if(dataon === 0) dataon = new Date().valueOf()
				clearTimeout(timer)
				buffers.push(buffer)
			})
	
			stream.on('end', ()=>{
				const data = Buffer.concat(buffers)
				resolve(data)
				return;
			})

			// stream.setTimeout(1000)
			stream.on('timeout', (x)=> {
				const thisNow = new Date().valueOf()
				const diff = thisNow - now
				const diffOn = thisNow - dataon
				console.log('*** TIMEOUT EVENT *** ', `total took ${diff} ms, since dataon took ${diffOn} ms`)
			})

			stream.on('error', (e: any)=>{
				logger('*** READ STREAM ERROR ***')
				reject(e)
			})
	
		}catch(e){
			clearTimeout(timer)
			reject(e)
		}
	})
}