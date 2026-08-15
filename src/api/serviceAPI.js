import axios from "axios"

import { refreshEndpoint } from "./ViewerAPI"

const BASE_URL = import.meta.env.VITE_SERVICE_URL || "http://localhost:8081/"

const serviceAPI = axios.create({ baseURL: BASE_URL })

serviceAPI.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

serviceAPI.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error)
        }

        original._retry = true

        try {
            const refreshed = await refreshEndpoint()
            const token = refreshed.data.AccessToken

            localStorage.setItem("accessToken", token)
            original.headers.Authorization = `Bearer ${token}`

            return serviceAPI(original)
        } catch {
            return Promise.reject(error)
        }
    }
)

export default serviceAPI
