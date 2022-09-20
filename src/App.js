import "./App.css";
import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/web3auth";
import { CHAIN_NAMESPACES, ADAPTER_EVENTS } from "@web3auth/base";
import {
    CHAIN_BLOCK_EXPLORER,
    CHAIN_DISPLAY_NAME,
    CHAIN_ID,
    CHAIN_RPC_TARGET,
    CHAIN_TICKER,
    CHAIN_TICKER_NAME,
    WEB_3_AUTH_CLIENT_ID,
    API_URL,
} from "./consts";
import { useWeb3React } from "@web3-react/core";
import { Web3ReactProvider } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import { ChainId } from "./ChainId.ts";
import { ethers } from "ethers";
import axios from "axios";

function App() {
    const { account, activate, deactivate, library } = useWeb3React();
    const [web3auth, setWeb3auth] = useState(null);
    const [provider, setProvider] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [data, setData] = useState({});

    useEffect(() => {
        if (library) setProvider(library);
    }, [library, web3auth]);

    function subscribeAuthEvents(web3auth) {
        web3auth.on(ADAPTER_EVENTS.CONNECTED, async (data) => {
            console.log("Yeah!, you are successfully logged in");
            setProvider(await web3auth.provider);
            setUser(await web3auth.getUserInfo());
        });

        web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
            console.log("connecting");
        });

        web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
            console.log("disconnected");
        });

        web3auth.on(ADAPTER_EVENTS.ERRORED, (error) => {
            console.log(
                "some error or user have cancelled login request",
                error
            );
        });
    }
    const init = async () => {
        try {
            const ethChainConfig = {
                chainNamespace: CHAIN_NAMESPACES.EIP155,
                displayName: CHAIN_DISPLAY_NAME,
                blockExplorer: CHAIN_BLOCK_EXPLORER,
                chainId: CHAIN_ID,
                rpcTarget: CHAIN_RPC_TARGET,
                ticker: CHAIN_TICKER,
                tickerName: CHAIN_TICKER_NAME,
            };
            const options = {
                chainConfig: ethChainConfig,
                authMode: "WALLET",
                clientId: WEB_3_AUTH_CLIENT_ID,
            };
            const web3auth = new Web3Auth(options);

            subscribeAuthEvents(web3auth);

            await web3auth.initModal();
            setWeb3auth(web3auth);

            const web3authProvider = await web3auth.connect();

            setProvider(new ethers.providers.Web3Provider(web3authProvider));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        console.log("initializing");
        init();
    }, []);

    const login = async () => {
        if (web3auth?.status !== "ready") {
            await init();
        }

        if (!web3auth) {
            return;
        }

        await web3auth.connect();
    };

    const logout = async () => {
        if (!web3auth) {
            console.log("web3auth not initialized yet");
            return;
        }
        await web3auth.logout();
        setProvider(null);
    };

    const signMessage = async () => {
        console.log("signing");
        const message = "hiiii";
        const signer = provider.getSigner();
        await signer.signMessage(message);
    };

    const getMessage = async (address) => {
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

    async function signInWithEthereum() {
        try {
            const signer = provider.getSigner();
            console.log("signer: ", signer);
            console.log(await signer.getAddress());
            const message = await getMessage(await signer.getAddress());
            const signature = await signer.signMessage(message);

            await axios
                .post(`${API_URL}/api/authenticate`, { message, signature })
                .then((res) => {
                    setData(res)
                    setIsAuthenticated(!!res.data.token);
                    if (!!res.data.token) {
                        localStorage.setItem("ue-token", res.data.token);
                    } else {
                        throw Error("no token returned!");
                    }
                })
                .catch((err) => {
                    console.error(err);
                    setIsAuthenticated(true);
                });
        } catch (err) {
            console.error(err);
            // await logout();
        }
    }
    console.log(isAuthenticated);

    return (
        <div className="App">
            <Web3ReactProvider getLibrary={getLibrary}>
                <button onClick={() => signInWithEthereum()}>
                    signMessage
                </button>
                <br />
                <span>isAuthenticated: {isAuthenticated.toString()}</span>
                <br />
                <span>{JSON.stringify(data)}</span>
            </Web3ReactProvider>
        </div>
    );
}

export default App;

const NETWORK_POLLING_INTERVALS = {
    [ChainId.ARBITRUM]: 1_000,
    [ChainId.ARBITRUM_TESTNET]: 1_000,
    [ChainId.HARMONY]: 15_000,
    [ChainId.MATIC]: 15_000,
};

function getLibrary(provider) {
    const library = new Web3Provider(
        provider,
        // eslint-disable-next-line no-nested-ternary
        typeof provider.chainId === "number"
            ? provider.chainId
            : typeof provider.chainId === "string"
            ? parseInt(provider.chainId, 16)
            : "any"
    );

    library.pollingInterval = 15_000;

    library
        .detectNetwork()
        .then((network) => {
            const networkingPollingInterval =
                NETWORK_POLLING_INTERVALS[network.chainId];
            if (networkingPollingInterval) {
                console.debug(
                    "setting polling interval",
                    networkingPollingInterval
                );
                library.pollingInterval = networkingPollingInterval;
            }
        })
        .catch((err) => console.error(err));
    return library;
}
