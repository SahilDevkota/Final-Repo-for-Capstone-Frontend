import {useState} from "react"
import {getUsers} from "../api/ViewerAPI"

export default function User(){

    const getListOfUser = async()=>{
        const response = await getUsers()
        console.log(response)
    }

    function handleSubmit(e){
        e.preventDefault();
        getListOfUser()
    }

    return(
        <form onSubmit ={handleSubmit}>
            <button type = "submit">Click</button>
        </form>
    )
}