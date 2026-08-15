import axios from "axios"


const BASE_URL = "http://localhost:8081/"
const publicAPI = axios.create({
    baseURL : BASE_URL,
    withCredentials: true
}
)
export default publicAPI;