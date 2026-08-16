import axios from "axios"
import {refreshEndpoint} from "../api/ViewerAPI"
const BASE_URL = "https://stock-sentiment-analysis-3.onrender.com/"
const privateAPI = axios.create({
    baseURL : BASE_URL,
    withCredentials: true
}
)
privateAPI.interceptors.request.use((config)=>{
    const token = localStorage.getItem("accessToken")
        if(token){ 
            config.headers.Authorization = `Bearer ${token}`; 
            //console.log(config)      
        }
        return config;  
    },
    (error)=>{
        return Promise.reject(error);
    }
)
privateAPI.interceptors.response.use(
 (response)=>{
        console.log(response.data[0])
        return response;
    },
    async (error)=>{
        const originalRequest = error.config;
        if(!error.response){
            console.log("Network error: ",error.message)
            return Promise.reject(error)
        }


        if(error.response.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;
            
           const newResponse = await refreshEndpoint();
           originalRequest.headers.Authorization  = `Bearer ${newResponse.data.AccessToken}`
           
           localStorage.setItem("accessToken",newResponse.data.AccessToken)
           
           return privateAPI(originalRequest)
            
        }
        else if(error.response.status === 403){
            console.log("No Permission")
        }
        return Promise.reject(error);
    }
)



export default privateAPI;