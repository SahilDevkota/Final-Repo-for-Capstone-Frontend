import axios from "axios"


const BASE_URL = "https://stock-sentiment-analysis-3.onrender.com/"
const publicAPI = axios.create({
    baseURL : BASE_URL,
    withCredentials: true
}
)
export default publicAPI;