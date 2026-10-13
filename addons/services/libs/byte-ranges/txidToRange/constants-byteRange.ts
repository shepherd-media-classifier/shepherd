
/* for use in calculating byte ranges */
export const CHUNK_ALIGN_GENESIS = 30607159107830n //weave address where enforced 256kb chunks started. height >= 812970
export const CHUNK_SIZE = 262144n //256kb
export const HOST_URL = process.env.HOST_URL!
if (!HOST_URL) throw new Error(`Missing env var, HOST_URL:${HOST_URL}`)

