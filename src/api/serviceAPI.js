import axios from "axios"

import { refreshEndpoint } from "./ViewerAPI"

// The Node service under server/ — portfolio and the assistant.
// Sahil's Spring Boot backend stays on privateAPI; this is separate.
const BASE_URL = import.meta.env.VITE_SERVICE_URL || "https://stock-sentiment-analysis-3.onrender.com/"

const serviceAPI = axios.create({ baseURL: BASE_URL })

// Same token the backend issued; the service only verifies it
serviceAPI.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// The token lasts fifteen minutes. privateAPI renews it on a 401; without
// the same thing here, only the portfolio and assistant would break.
serviceAPI.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config

        // _retry stops a failing refresh from looping forever
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
            // Refresh itself failed, so the session really is over
            return Promise.reject(error)
        }
    }
)

export default serviceAPI
