import "./App.css";
import { useEffect, useState } from "react";
import { Web3AuthCore } from "@web3auth/core";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { CHAIN_NAMESPACES, ADAPTER_EVENTS } from "@web3auth/base";
import { WEB_3_AUTH_CLIENT_ID, API_URL } from "./consts";
import { useWeb3React } from "@web3-react/core";
import { Web3ReactProvider } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import { ChainId } from "./ChainId.ts";
import axios from "axios";
import { getMessage } from "./utils";
import { ethers } from "ethers";
//google, discord, twitter main priorities

const adapter = new OpenloginAdapter({
    adapterSettings: {
        network: "testnet",
        clientId: WEB_3_AUTH_CLIENT_ID,
        uxMode: "popup", // options: redirect || popup
        loginConfig: {
            facebook: {
                name: "Tronic Facebook",
                verifier: "tronic-facebook",
                typeOfLogin: "facebook",
                clientId: "410518024372543",
            },
            google: {
                name: "Tronic Google",
                verifier: "tronic-google",
                typeOfLogin: "google",
                clientId:
                    "585471592125-r9rjpi0sj6aq9lps12oi713khvtucj43.apps.googleusercontent.com",
            },
            discord: {
                name: "Tronic Discord",
                verifier: "tronic-discord",
                typeOfLogin: "discord",
                clientId: "1022954060573310996",
            },
        },
    },
});

function App() {
    const { account, activate, deactivate, library } = useWeb3React();
    const [web3auth, setWeb3auth] = useState(null);
    const [provider, setProvider] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [data, setData] = useState({});

    useEffect(() => {
        user && console.log(user);
        provider && console.log(provider);
    }, [user, provider]);

    useEffect(() => {
        if (library) setProvider(library);
    }, [library, web3auth]);

    function subscribeAuthEvents(web3auth) {
        web3auth.on(ADAPTER_EVENTS.CONNECTED, async (data) => {
            console.log("Yeah!, you are successfully logged in");
            setProvider(new ethers.providers.Web3Provider(web3auth.provider));
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
            const web3authCore = new Web3AuthCore({
                chainConfig: {
                    chainNamespace: CHAIN_NAMESPACES.EIP155,
                    chainId: "0x1",
                    rpcTarget:
                        "https://mainnet.infura.io/v3/776218ac4734478c90191dde8cae483c",
                    blockExplorer: "https://etherscan.io/",
                    ticker: "ETH",
                    tickerName: "Ethereum",
                },
                clientId: WEB_3_AUTH_CLIENT_ID,
                // authMode: "WALLET",
            });

            subscribeAuthEvents(web3authCore);

            web3authCore.configureAdapter(adapter);
            console.log(web3authCore);
            await web3authCore.init();

            setWeb3auth(web3authCore);

            // const web3authProvider = await web3auth.connect();

            // setProvider(new ethers.providers.Web3Provider(web3authProvider));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        console.log("initializing");
        init();
    }, []);

    async function signInWithEthereum() {
        try {
            console.log(provider);
            const signer = await provider.getSigner();
            console.log("signer: ", signer);
            console.log(await signer.getAddress());
            const message = await getMessage(await signer.getAddress());
            const signature = await signer.signMessage(message);

            await axios
                .post(`${API_URL}/api/authenticate`, { message, signature })
                .then((res) => {
                    setData(res);
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
        }
    }

    const login = async (loginProvider) => {
        await web3auth.connectTo(adapter.name, {
            loginProvider: loginProvider,
            // extraLoginOptions: {
            //     domain: "https://dev-cvfuc6b2.us.auth0.com",
            //     verifierIdField: "sub",
            // },
        });
    };

    const logout = async () => {
        await web3auth.logout();
    };

    return (
        <div className="App">
            <Web3ReactProvider getLibrary={getLibrary}>
                <br />
                <br />
                <button onClick={() => login("facebook")}>Facebook</button>
                <br />
                <br />
                <button onClick={() => login("google")}>Google</button>
                <br />
                <br />
                <button onClick={() => login("discord")}>Discord</button>
                <br />
                <br />
                <button onClick={() => logout()}>logout</button>
                <br />
                <br />
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
