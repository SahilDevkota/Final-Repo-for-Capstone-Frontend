import {useState} from "react"
import {getAsset} from "../api/ViewerAPI"
export default function Asset(){

    const [assetType,setAssetType] = useState("")

    const asset = async()=>{
        const response = await getAsset(assetType);
        console.log(response)
        return response.data;
    }

    const handleSubmit = (e)=>{
        e.preventDefault()
        asset()
    }

    return (
        <form onSubmit ={handleSubmit}>
            <select onChange={(e)=>setAssetType(e.target.value)}>
                <option>STOCK</option>
                <option>CRYPTO</option>
                <option>NFT</option>
            </select>
            <button type="submit">Click here bitch</button>
        </form>
    )

}