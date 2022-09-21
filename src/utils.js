import axios from "axios";
import { API_URL } from "./consts";

export const getMessage = async (address) => {
    return axios
        .post(
            `${API_URL}/api/message`,
            { walletAddress: address, origin: origin },
            {
                // withCredentials: true,
                //@ts-ignore
                // crossDomain: true,
            }
        )
        .then((res) => {
            return res.data.message;
        });
};
