import {useAuth} from "../api/AuthContext"
import {Navigate} from "react-router-dom"

export default function ProtectedRoute({children}){

    const {AccessToken} = useAuth()

    if(!AccessToken){
        return <Navigate to="/Login"></Navigate>
    }
    return children
}